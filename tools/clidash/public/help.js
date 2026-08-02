// Localiser for `ncl <resource> help` output.
//
// The CLI emits English help in a stable shape:
//
//   <resource>: <description>
//
//   Verbs:
//     list
//     grant [approval] — <sentence>
//     config get — <sentence>
//
//   Run `ncl <resource> help <verb>` (or add --help to any command) for flags and examples.
//
//   Fields:
//     --flag                   <sentence> (required, updatable, values: a | b)
//
// Only the SENTENCES are looked up in the catalogue (help-fr.js). Verb names,
// flag names, enum tokens and the command in backticks are structure, never
// translated — you must still be able to retype them into a terminal. The
// trailing annotations are localised mechanically here, so the catalogue holds
// no duplicated "(required, updatable)" boilerplate.
//
// Anything unrecognised is passed through untouched: an upstream change to the
// help format degrades to English rather than to a mangled page.

import { HELP_FR } from './help-fr.js';

const CATALOGUES = { fr: HELP_FR };

const SECTIONS = {
  fr: { Verbs: 'Verbes :', Fields: 'Champs :' },
};

const RUN_LINE = {
  fr: (cmd) => `Lancer \`${cmd}\` (ou ajouter --help à n'importe quelle commande) pour les options et des exemples.`,
};

const ANNOTATION_ITEM = String.raw`auto|required|updatable|default: [^,()]*|values: [^()]*`;
const ANNOTATION_RE = new RegExp(String.raw`\s\((?:${ANNOTATION_ITEM})(?:, (?:${ANNOTATION_ITEM}))*\)$`);

const ANNOTATION_WORDS = {
  fr: { auto: 'auto', required: 'requis', updatable: 'modifiable' },
};
const ANNOTATION_PREFIXES = {
  fr: [[/^default: /, 'défaut : '], [/^values: /, 'valeurs : ']],
};

// "(updatable, default: strict, values: a | b)" → "(modifiable, défaut : strict, valeurs : a | b)"
function localizeAnnotation(annotation, locale) {
  if (!annotation) return ''; // most fields carry none — never emit an empty " ()"
  const words = ANNOTATION_WORDS[locale];
  const prefixes = ANNOTATION_PREFIXES[locale];
  if (!words || !prefixes) return annotation;
  const inner = annotation.trim().slice(1, -1);
  const items = inner.split(', ').map((item) => {
    if (item in words) return words[item];
    for (const [re, replacement] of prefixes) if (re.test(item)) return item.replace(re, replacement);
    return item;
  });
  return ` (${items.join(', ')})`;
}

// A verb line reads "  grant [approval] — …" or "  config get — …"; the lookup
// key drops the approval marker and any <arg> placeholder.
export function verbKey(left) {
  return left.replace(/\s*\[approval\]/g, '').replace(/\s*<[^>]*>/g, '').trim();
}

// Splits "<sentence> (required, updatable)" into its two halves.
export function splitAnnotation(description) {
  const match = description.match(ANNOTATION_RE);
  if (!match) return { prose: description, annotation: '' };
  return { prose: description.slice(0, match.index), annotation: match[0] };
}

export function localizeHelp(text, locale) {
  if (typeof text !== 'string' || !text) return text;
  const catalogue = CATALOGUES[locale];
  if (!catalogue) return text;

  const lines = text.split('\n');
  const header = lines[0]?.match(/^([\w-]+): (.*)$/);
  const entry = header ? catalogue[header[1]] : null;
  if (!entry) return text; // unknown resource — leave the CLI's own words alone

  const sections = SECTIONS[locale] ?? {};
  const runLine = RUN_LINE[locale];
  let section = null;

  const out = lines.map((line, i) => {
    if (i === 0) return entry.description ? `${header[1]}: ${entry.description}` : line;

    if (line === 'Verbs:') { section = 'verbs'; return sections.Verbs ?? line; }
    if (line === 'Fields:') { section = 'fields'; return sections.Fields ?? line; }

    const run = line.match(/^Run `(.+?)` \(or add --help to any command\) for flags and examples\.$/);
    if (run) return runLine ? runLine(run[1]) : line;

    if (section === 'verbs') {
      const verb = line.match(/^(\s+)(.+?) — (.*)$/);
      if (!verb) return line; // a bare verb such as "  list" — nothing to translate
      const translated = entry.verbs?.[verbKey(verb[2])];
      return translated ? `${verb[1]}${verb[2]} — ${translated}` : line;
    }

    if (section === 'fields') {
      const field = line.match(/^(\s+)(--[\w-]+)(\s+)(.*)$/);
      if (!field) return line;
      const translated = entry.fields?.[field[2]];
      if (!translated) return line;
      const { annotation } = splitAnnotation(field[4]);
      return `${field[1]}${field[2]}${field[3]}${translated}${localizeAnnotation(annotation, locale)}`;
    }

    return line;
  });

  return out.join('\n');
}
