import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DICT, LOCALES, DEFAULT_LOCALE, t, getLocale, setLocale, localeTag, resolveLabel } from '../public/i18n.js';

const appSrc = readFileSync(fileURLToPath(new URL('../public/app.js', import.meta.url)), 'utf8');
const htmlSrc = readFileSync(fileURLToPath(new URL('../public/index.html', import.meta.url)), 'utf8');

test('every locale carries exactly the same keys', () => {
  const reference = Object.keys(DICT[DEFAULT_LOCALE]).sort();
  for (const loc of LOCALES) {
    assert.deepEqual(Object.keys(DICT[loc]).sort(), reference, `locale "${loc}" key set drifted`);
  }
});

// A key that is a function in one locale and a plain string in another throws at
// call time (`t('x', 1)` silently drops the argument) — catch it here instead.
test('a key has the same shape (string vs function) in every locale', () => {
  for (const key of Object.keys(DICT[DEFAULT_LOCALE])) {
    const shapes = new Set(LOCALES.map((loc) => typeof DICT[loc][key]));
    assert.equal(shapes.size, 1, `key "${key}" mixes shapes: ${[...shapes].join(', ')}`);
  }
});

test('function entries take the same argument count in every locale', () => {
  for (const key of Object.keys(DICT[DEFAULT_LOCALE])) {
    if (typeof DICT[DEFAULT_LOCALE][key] !== 'function') continue;
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
    assert.ok(key in DICT[DEFAULT_LOCALE], `app.js uses unknown key "${key}"`);
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
      assert.ok(DEFAULT_LOCALE in label, `${name}: locale map is missing "${DEFAULT_LOCALE}"`);
      for (const [loc, value] of Object.entries(label)) {
        assert.ok(LOCALES.includes(loc), `${name}: unknown locale "${loc}" in a label`);
        assert.equal(typeof value, 'string', `${name}: label.${loc} must be a string`);
      }
    }
  }
});
