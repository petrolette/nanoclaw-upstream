import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  DICT, GLOSSARY, ENUM_FIELDS, LOCALES, DEFAULT_LOCALE, FALLBACK_LOCALE,
  t, getLocale, setLocale, localeTag, resolveLabel,
  resourceLabel, resourceCountLabel, fieldLabel, valueLabel,
} from '../public/i18n.js';

const appSrc = readFileSync(fileURLToPath(new URL('../public/app.js', import.meta.url)), 'utf8');
const htmlSrc = readFileSync(fileURLToPath(new URL('../public/index.html', import.meta.url)), 'utf8');

// Captured at import time, before any test switches locale. Node has no
// localStorage, so this is exactly what a first-time visitor resolves to.
const initialLocale = getLocale();

test('a visitor with no stored pick lands in French', () => {
  assert.equal(DEFAULT_LOCALE, 'fr');
  assert.equal(initialLocale, 'fr');
});

// Regression: the browser language must NOT override the French default.
test('locale detection never consults navigator.language', () => {
  const i18nSrc = readFileSync(fileURLToPath(new URL('../public/i18n.js', import.meta.url)), 'utf8');
  assert.doesNotMatch(i18nSrc, /navigator/);
});

test('every locale carries exactly the same keys', () => {
  const reference = Object.keys(DICT[FALLBACK_LOCALE]).sort();
  for (const loc of LOCALES) {
    assert.deepEqual(Object.keys(DICT[loc]).sort(), reference, `locale "${loc}" key set drifted`);
  }
});

// A key that is a function in one locale and a plain string in another throws at
// call time (`t('x', 1)` silently drops the argument) — catch it here instead.
test('a key has the same shape (string vs function) in every locale', () => {
  for (const key of Object.keys(DICT[FALLBACK_LOCALE])) {
    const shapes = new Set(LOCALES.map((loc) => typeof DICT[loc][key]));
    assert.equal(shapes.size, 1, `key "${key}" mixes shapes: ${[...shapes].join(', ')}`);
  }
});

test('function entries take the same argument count in every locale', () => {
  for (const key of Object.keys(DICT[FALLBACK_LOCALE])) {
    if (typeof DICT[FALLBACK_LOCALE][key] !== 'function') continue;
    const arities = new Set(LOCALES.map((loc) => DICT[loc][key].length));
    assert.equal(arities.size, 1, `key "${key}" takes different argument counts per locale`);
  }
});

// The UI is the only consumer: a `t('…')` call with no dictionary entry renders
// the raw key on screen, which is invisible in review but obvious to a user.
test('every t() key used by app.js exists in the dictionary', () => {
  const used = [...appSrc.matchAll(/\bt\('([^']+)'/g)].map((m) => m[1]);
  assert.ok(used.length > 30, `expected app.js to be translated, found ${used.length} t() calls`);
  for (const key of new Set(used)) {
    assert.ok(key in DICT[FALLBACK_LOCALE], `app.js uses unknown key "${key}"`);
  }
});

// Regression: the control labels are painted by renderChrome(), so hardcoding
// them back into the markup would resurrect untranslated text on first paint.
test('index.html ships no hardcoded control copy', () => {
  assert.match(htmlSrc, /<button id="refresh" class="refresh"><\/button>/);
  assert.match(htmlSrc, /<button id="pause" class="pause"><\/button>/);
  assert.match(htmlSrc, /id="langswitch"/);
});

test('setLocale switches the active locale and its BCP-47 tag', () => {
  const before = getLocale();
  try {
    setLocale('fr');
    assert.equal(getLocale(), 'fr');
    assert.equal(localeTag(), 'fr-CH');
    assert.equal(t('nav.overview'), "Vue d'ensemble");
    assert.equal(t('time.coarseMinutes', 1), 'il y a 1 minute');
    assert.equal(t('time.coarseMinutes', 7), 'il y a 7 minutes');

    setLocale('en');
    assert.equal(localeTag(), 'en-GB');
    assert.equal(t('nav.overview'), 'Overview');
    assert.equal(t('time.coarseMinutes', 1), '1 minute ago');
  } finally {
    setLocale(before);
  }
});

test('setLocale ignores an unknown locale', () => {
  const before = getLocale();
  assert.equal(setLocale('de'), before);
  assert.equal(getLocale(), before);
});

test('t falls back to English, then to the key itself', () => {
  const before = getLocale();
  const saved = DICT.fr['nav.files'];
  try {
    setLocale('fr');
    delete DICT.fr['nav.files'];
    assert.equal(t('nav.files'), 'Files');       // English fallback
    assert.equal(t('no.such.key'), 'no.such.key'); // last-resort fallback
  } finally {
    DICT.fr['nav.files'] = saved;
    setLocale(before);
  }
});

test('resolveLabel accepts a plain string or a per-locale map', () => {
  const before = getLocale();
  try {
    setLocale('fr');
    assert.equal(resolveLabel('host log'), 'host log');
    assert.equal(resolveLabel({ en: 'errors', fr: 'erreurs' }), 'erreurs');
    assert.equal(resolveLabel({ en: 'Skills' }), 'Skills');       // no fr → English
    assert.equal(resolveLabel({ de: 'Fehler' }), 'Fehler');       // neither → first value
    assert.equal(resolveLabel(null, 'fallback'), 'fallback');
    assert.equal(resolveLabel(undefined, 'fallback'), 'fallback');

    setLocale('en');
    assert.equal(resolveLabel({ en: 'errors', fr: 'erreurs' }), 'errors');
  } finally {
    setLocale(before);
  }
});

// The configs ship the per-locale form; a malformed one would render "[object
// Object]" in the sidebar rather than fail loudly.
test('shipped configs use valid label shapes', () => {
  for (const name of ['clidash.config.json', 'clidash.config.example.json']) {
    const cfg = JSON.parse(readFileSync(fileURLToPath(new URL(`../${name}`, import.meta.url)), 'utf8'));
    const labels = [
      ...(cfg.logs?.files ?? []).map((f) => f.label),
      ...(cfg.docs?.collections ?? []).map((c) => c.label),
    ].filter((l) => l != null);
    assert.ok(labels.length > 0, `${name} declares no labels`);
    for (const label of labels) {
      if (typeof label === 'string') continue;
      assert.equal(typeof label, 'object', `${name}: label must be a string or a locale map`);
      for (const required of [DEFAULT_LOCALE, FALLBACK_LOCALE]) {
        assert.ok(required in label, `${name}: locale map is missing "${required}"`);
      }
      for (const [loc, value] of Object.entries(label)) {
        assert.ok(LOCALES.includes(loc), `${name}: unknown locale "${loc}" in a label`);
        assert.equal(typeof value, 'string', `${name}: label.${loc} must be a string`);
      }
    }
  }
});

// ---------------------------------------------------------------- glossary

// English shows `ncl`'s own words on purpose: what the CLI prints is what you
// would type back into a terminal. An entry appearing here is a regression.
test('the English glossary is empty by design', () => {
  for (const part of ['resources', 'resourcesOne', 'fields', 'values']) {
    assert.deepEqual(Object.keys(GLOSSARY.en[part]), [], `en.${part} should stay empty`);
  }
});

test('every French singular has a matching plural', () => {
  for (const name of Object.keys(GLOSSARY.fr.resourcesOne)) {
    assert.ok(name in GLOSSARY.fr.resources, `"${name}" has a singular but no plural`);
  }
});

test('resourceLabel translates in French and stays verbatim in English', () => {
  const before = getLocale();
  try {
    setLocale('fr');
    assert.equal(resourceLabel('messaging-groups'), 'groupes de discussion');
    assert.equal(resourceLabel('messaging-groups', 1), 'groupe de discussion');
    assert.equal(resourceLabel('wirings'), 'câblages');

    setLocale('en');
    assert.equal(resourceLabel('messaging-groups'), 'messaging-groups');
    assert.equal(resourceLabel('messaging-groups', 1), 'messaging-groups');
  } finally {
    setLocale(before);
  }
});

// An `ncl` release adding a resource must degrade to its raw name, never to a
// blank tab or a dictionary key.
test('an unknown resource falls back to its raw CLI token', () => {
  const before = getLocale();
  try {
    setLocale('fr');
    assert.equal(resourceLabel('brand-new-thing'), 'brand-new-thing');
    assert.equal(fieldLabel('brand_new_column'), 'brand_new_column');
  } finally {
    setLocale(before);
  }
});

test('resourceCountLabel agrees with the row count', () => {
  const before = getLocale();
  try {
    setLocale('fr');
    assert.equal(resourceCountLabel('sessions', 3), 'sessions');
    assert.equal(resourceCountLabel('sessions', 1), 'session');
    assert.equal(resourceCountLabel('tasks', 1), 'tâche');

    setLocale('en'); // historical behaviour: dashes to spaces, drop trailing "s"
    assert.equal(resourceCountLabel('messaging-groups', 3), 'messaging groups');
    assert.equal(resourceCountLabel('messaging-groups', 1), 'messaging group');
  } finally {
    setLocale(before);
  }
});

// Values are translated only for closed-enum columns — a group actually named
// "active" or a session id must never be rewritten.
test('valueLabel only rewrites closed-enum columns', () => {
  const before = getLocale();
  try {
    setLocale('fr');
    assert.equal(valueLabel('container_status', 'running'), 'en marche');
    assert.equal(valueLabel('role', 'owner'), 'propriétaire');
    assert.equal(valueLabel('name', 'active'), 'active');       // a name, not an enum
    assert.equal(valueLabel('id', 'stopped'), 'stopped');       // an id, not an enum
    assert.equal(valueLabel('status', 'brand-new-state'), 'brand-new-state');
    assert.equal(valueLabel('status', null), null);

    setLocale('en');
    assert.equal(valueLabel('container_status', 'running'), 'running');
  } finally {
    setLocale(before);
  }
});

test('every ENUM_FIELDS entry is a column the glossary also names', () => {
  for (const column of ENUM_FIELDS) {
    assert.ok(column in GLOSSARY.fr.fields, `ENUM_FIELDS has "${column}" but fr.fields does not name it`);
  }
});

// Coverage against the vocabulary this install actually serves. Kept as a
// literal snapshot so the test needs no running server; refresh it from
// /api/clis + /api/r/<cli>/<resource> when ncl gains a resource or column.
const SERVED_RESOURCES = [
  'approvals', 'destinations', 'dropped-messages', 'groups', 'members',
  'messaging-groups', 'policies', 'roles', 'sessions', 'tasks', 'user-dms',
  'users', 'wirings', 'ps', 'images',
];
const SERVED_COLUMNS = [
  'id', 'name', 'folder', 'created_at', 'agent_group_id', 'messaging_group_id',
  'thread_id', 'agent_provider', 'status', 'container_status', 'last_active',
  'channel_type', 'platform_id', 'instance', 'is_group', 'unknown_sender_policy',
  'denied_at', 'user_id', 'role', 'granted_by', 'granted_at', 'local_name',
  'target_type', 'target_id', 'display_name', 'engage_mode', 'engage_pattern',
  'sender_scope', 'ignored_message_policy', 'session_mode', 'threads', 'priority',
  'session_id', 'series_id', 'row_id', 'process_after', 'recurrence', 'prompt',
  'has_script', 'origin_session_id', 'tries', 'schedule', 'runs', 'failed_runs',
  'last_run', 'next_run', 'log', 'kind',
  'Command', 'CreatedAt', 'HealthStatus', 'ID', 'Image', 'Labels', 'LocalVolumes',
  'Mounts', 'Names', 'Networks', 'Platform', 'Ports', 'RunningFor', 'Size',
  'State', 'Status', 'Containers', 'CreatedSince', 'Digest', 'Repository',
  'SharedSize', 'Tag', 'UniqueSize',
];

test('French covers every resource and column this install serves', () => {
  const missingResources = SERVED_RESOURCES.filter((r) => !(r in GLOSSARY.fr.resources));
  assert.deepEqual(missingResources, [], 'untranslated resources');
  const missingColumns = SERVED_COLUMNS.filter((c) => !(c in GLOSSARY.fr.fields));
  assert.deepEqual(missingColumns, [], 'untranslated columns');
});
