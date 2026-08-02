import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { localizeHelp, verbKey, splitAnnotation } from '../public/help.js';
import { HELP_FR } from '../public/help-fr.js';

// Captured from the running install: `ncl <resource> help` for every resource.
// They are the contract this catalogue is written against — refresh them (and
// the French prose) when upstream reworks a help text.
const FIXTURE_DIR = fileURLToPath(new URL('./fixtures/ncl-help/', import.meta.url));
const fixtures = Object.fromEntries(
  readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith('.txt'))
    .map((f) => [f.replace(/\.txt$/, ''), readFileSync(FIXTURE_DIR + f, 'utf8')]),
);

test('there is a fixture per catalogued resource, and vice versa', () => {
  assert.deepEqual(Object.keys(fixtures).sort(), Object.keys(HELP_FR).sort());
});

test('English is returned byte-for-byte unchanged', () => {
  for (const [name, text] of Object.entries(fixtures)) {
    assert.equal(localizeHelp(text, 'en'), text, `${name} was altered in English`);
  }
});

test('an unknown resource keeps the CLI text', () => {
  const text = 'gizmos: A resource clidash has never heard of.\n\nVerbs:\n  list\n';
  assert.equal(localizeHelp(text, 'fr'), text);
});

test('the line count and blank-line layout survive translation', () => {
  for (const [name, text] of Object.entries(fixtures)) {
    const fr = localizeHelp(text, 'fr').split('\n');
    const en = text.split('\n');
    assert.equal(fr.length, en.length, `${name}: line count changed`);
    en.forEach((line, i) => {
      if (line.trim() === '') assert.equal(fr[i].trim(), '', `${name}: blank line ${i + 1} was filled`);
    });
  }
});

// The whole point of leaving structure alone: what you read on screen is what
// you can retype into a terminal.
test('verb names, flag names and section indentation are never rewritten', () => {
  for (const [name, text] of Object.entries(fixtures)) {
    const fr = localizeHelp(text, 'fr').split('\n');
    text.split('\n').forEach((line, i) => {
      const flag = line.match(/^(\s+)(--[\w-]+)(\s+)/);
      if (flag) {
        assert.ok(fr[i].startsWith(`${flag[1]}${flag[2]}${flag[3]}`), `${name}: flag line ${i + 1} lost its flag or padding`);
      }
      const verb = line.match(/^(\s+)(.+?) — /);
      if (verb && !line.includes('--')) {
        assert.ok(fr[i].startsWith(`${verb[1]}${verb[2]} — `), `${name}: verb line ${i + 1} lost its verb`);
      }
    });
  }
});

test('the backticked command in the Run line is preserved verbatim', () => {
  for (const [name, text] of Object.entries(fixtures)) {
    const cmd = text.match(/^Run `(.+?)`/m);
    if (!cmd) continue;
    const fr = localizeHelp(text, 'fr');
    assert.ok(fr.includes(`\`${cmd[1]}\``), `${name}: the command was rewritten`);
    assert.ok(fr.includes('Lancer `'), `${name}: the Run line was not translated`);
    assert.ok(!fr.includes('for flags and examples'), `${name}: English Run line left behind`);
  }
});

test('enum tokens inside (values: …) stay verbatim', () => {
  for (const [name, text] of Object.entries(fixtures)) {
    const fr = localizeHelp(text, 'fr');
    for (const m of text.matchAll(/\(values: ([^)]*)\)/g)) {
      assert.ok(fr.includes(`(valeurs : ${m[1]})`), `${name}: enum list "${m[1]}" was altered`);
    }
  }
});

test('annotations are localised mechanically, not stored in the catalogue', () => {
  assert.deepEqual(splitAnnotation('A sentence. (required, updatable)'),
    { prose: 'A sentence.', annotation: ' (required, updatable)' });
  assert.deepEqual(splitAnnotation('No annotation here.'),
    { prose: 'No annotation here.', annotation: '' });
  // Parentheses inside the prose must not be mistaken for an annotation.
  assert.deepEqual(splitAnnotation('Use send_message({ to: "x" })'),
    { prose: 'Use send_message({ to: "x" })', annotation: '' });

  for (const fr of Object.values(HELP_FR)) {
    for (const [flag, sentence] of Object.entries(fr.fields ?? {})) {
      assert.doesNotMatch(sentence, /\((auto|required|updatable|values:|default:)/,
        `${flag}: the annotation belongs to help.js, not the catalogue`);
    }
  }
});

// Regression: a field with no annotation must not gain a stray " ()".
test('a field without an annotation gains nothing', () => {
  for (const [name, text] of Object.entries(fixtures)) {
    const fr = localizeHelp(text, 'fr');
    // "()" appears legitimately inside prose (requestApproval()); only a
    // trailing empty annotation is the bug.
    assert.doesNotMatch(fr, /\s\(\)$/m, `${name}: an empty annotation was emitted`);
    text.split('\n').forEach((line, i) => {
      const field = line.match(/^\s+--[\w-]+\s+(.*)$/);
      if (!field) return;
      const hadAnnotation = splitAnnotation(field[1]).annotation !== '';
      // Anchored: "(required)" also occurs mid-sentence (policies --approver),
      // which is prose, not an annotation.
      const FR_ANNOTATION = /\s\((auto|requis|modifiable|défaut : [^,)]*|valeurs : [^)]*)(, (auto|requis|modifiable|défaut : [^,)]*|valeurs : [^)]*))*\)$/;
      const hasAnnotation = FR_ANNOTATION.test(fr.split('\n')[i]);
      assert.equal(hasAnnotation, hadAnnotation, `${name}: annotation presence changed on line ${i + 1}`);
    });
  }
});

test('verbKey strips the approval marker and argument placeholders', () => {
  assert.equal(verbKey('grant [approval]'), 'grant');
  assert.equal(verbKey('update <id> [approval]'), 'update');
  assert.equal(verbKey('config add-mcp-server [approval]'), 'config add-mcp-server');
  assert.equal(verbKey('list'), 'list');
});

// Coverage: every sentence the CLI actually prints must have French, otherwise
// the panel is half-translated — which is the bug this whole change fixes.
test('French covers every description, verb and field the CLI prints', () => {
  const missing = [];
  for (const [name, text] of Object.entries(fixtures)) {
    const entry = HELP_FR[name];
    const lines = text.split('\n');
    if (!entry.description) missing.push(`${name}: description`);
    let section = null;
    for (const line of lines) {
      if (line === 'Verbs:') { section = 'verbs'; continue; }
      if (line === 'Fields:') { section = 'fields'; continue; }
      if (section === 'verbs') {
        const verb = line.match(/^\s+(.+?) — /);
        if (verb && !(verbKey(verb[1]) in (entry.verbs ?? {}))) missing.push(`${name}: verb ${verbKey(verb[1])}`);
      }
      if (section === 'fields') {
        const field = line.match(/^\s+(--[\w-]+)\s+\S/);
        if (field && !(field[1] in (entry.fields ?? {}))) missing.push(`${name}: field ${field[1]}`);
      }
    }
  }
  assert.deepEqual(missing, [], 'untranslated help text');
});

// Catch prose written for a flag or verb the CLI no longer prints — stale
// French that would silently never be shown.
test('the catalogue has no entry the CLI does not print', () => {
  const stale = [];
  for (const [name, entry] of Object.entries(HELP_FR)) {
    const text = fixtures[name];
    for (const verb of Object.keys(entry.verbs ?? {})) {
      if (!new RegExp(`^\\s+${verb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |\\[|<)`, 'm').test(text)) {
        stale.push(`${name}: verb ${verb}`);
      }
    }
    for (const flag of Object.keys(entry.fields ?? {})) {
      if (!text.includes(`  ${flag} `)) stale.push(`${name}: field ${flag}`);
    }
  }
  assert.deepEqual(stale, [], 'catalogue entries with no matching CLI output');
});

test('a real help text comes out in French end to end', () => {
  const fr = localizeHelp(fixtures.roles, 'fr');
  assert.match(fr, /^roles: Rôle d'utilisateur/);
  assert.match(fr, /^Verbes :$/m);
  assert.match(fr, /^Champs :$/m);
  assert.match(fr, /^ {2}grant \[approval\] — Attribue un rôle\./m);
  assert.match(fr, /^ {2}--role {2,}"owner" donne le contrôle total.*\(valeurs : owner \| admin\)$/m);
  assert.doesNotMatch(fr, /Grant a role/);
});
