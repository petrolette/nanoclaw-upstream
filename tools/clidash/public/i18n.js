// clidash i18n — vanilla JS, no build step, no dependency.
//
// One dictionary per locale. A value is either a string or a function of the
// interpolated parts; `t(key, ...args)` calls it. Keys are flat and namespaced
// by area (nav.*, ov.*, act.*, time.*) so a missing one is obvious in review.
//
// Locale resolution: an explicit user pick (localStorage) wins, otherwise
// French. The browser language is deliberately NOT consulted — this install is
// French-first, and an English-locale browser should still open in French. The
// pick is per-browser, not per-server: clidash is read-only and single-user, so
// there is nothing to persist server-side.
//
// DEFAULT_LOCALE is what a fresh visitor gets; FALLBACK_LOCALE is what `t()`
// falls back to for a key the active locale is missing. They are separate on
// purpose: English stays the complete reference dictionary.

export const LOCALES = ['en', 'fr'];
export const DEFAULT_LOCALE = 'fr';
export const FALLBACK_LOCALE = 'en';
const STORAGE_KEY = 'clidash.locale';

const DICT = {
  en: {
    // chrome
    'app.menu': 'Menu',
    'app.menuToggle': 'Toggle menu',
    'ctl.refresh': '↻ refresh',
    'ctl.refreshTitle': 'Refresh now',
    'ctl.pause': '⏸ pause',
    'ctl.pauseTitle': 'Pause auto-refresh',
    'ctl.resume': '▶ resume',
    'ctl.resumeTitle': 'Resume auto-refresh',
    'ctl.language': 'Language',
    'ctl.updated': (ago) => `updated ${ago}`,
    'ctl.paused': ' · paused',

    // nav
    'nav.overview': 'Overview',
    'nav.activity': 'Activity',
    'nav.files': 'Files',
    'nav.logs': 'Logs',

    // generic states
    'state.loading': 'Loading…',
    'state.noCli': 'No such CLI.',
    'state.noRows': (resource) => `No ${resource}.`,
    'state.loadFailed': (resource) => `Failed to load ${resource}.`,
    'state.loadFailedShort': 'Failed to load',
    'state.badResponse': (url) => `Bad response from ${url}`,
    'state.stale': (time) => `⚠ live fetch failing — snapshot from ${time}`,
    'state.discoveryFailed': (cli, error) => `Discovery failed for ${cli}: ${error}`,
    'state.cliUnreachable': (detail) => `CLI unreachable — showing last good snapshot. ${detail}`,

    // help panel
    'help.loading': 'loading help…',
    'help.more': 'verbs & fields',

    // overview
    'ov.title': 'Agents overview',
    'ov.container': 'container',
    'ov.sessions': 'sessions',
    'ov.messages': 'messages',
    'ov.lastActive': 'last active',
    'ov.providerModel': 'provider / model',
    'ov.cliScope': 'cli scope',
    'ov.extras': 'extras',
    'ov.inOut': (inbound, outbound) => `${inbound} in · ${outbound} out`,
    'ov.extrasValue': (pkgs, mcp) => `${pkgs} pkgs · ${mcp} mcp`,

    // activity
    'act.title': 'Message activity',
    'act.inbound': (total) => `inbound (${total})`,
    'act.outbound': (total) => `outbound (${total})`,
    'act.lastDays': (days) => `last ${days} days`,
    'act.chartIn': (date, n) => `${date}: ${n} in`,
    'act.chartOut': (date, n) => `${date}: ${n} out`,
    'act.colAgent': 'agent',
    'act.colSession': 'session',
    'act.colIn': 'in',
    'act.colOut': 'out',
    'act.colLastActivity': 'last activity',

    // documents
    'doc.none': 'No documents.',
    'doc.emptyCollection': (label) => `No ${label.toLowerCase()}.`,
    'doc.select': 'Select a document.',

    // detail overlay
    'detail.close': 'Close',
    'detail.containerConfig': 'Container config',

    // relative time
    'time.secondsAgo': (s) => `${s}s ago`,
    'time.minutesAgo': (m) => `${m}m ago`,
    'time.hoursAgo': (h) => `${h}h ago`,
    'time.daysAgo': (d) => `${d}d ago`,
    'time.coarseUnderMinute': 'less than a minute ago',
    'time.coarseMinutes': (m) => (m === 1 ? '1 minute ago' : `${m} minutes ago`),
    'time.coarseHours': (h) => (h === 1 ? '1 hour ago' : `${h} hours ago`),
    'time.coarseDays': (d) => (d === 1 ? '1 day ago' : `${d} days ago`),
  },

  fr: {
    // chrome
    'app.menu': 'Menu',
    'app.menuToggle': 'Ouvrir le menu',
    'ctl.refresh': '↻ actualiser',
    'ctl.refreshTitle': 'Actualiser maintenant',
    'ctl.pause': '⏸ pause',
    'ctl.pauseTitle': "Suspendre l'actualisation auto",
    'ctl.resume': '▶ reprendre',
    'ctl.resumeTitle': "Reprendre l'actualisation auto",
    'ctl.language': 'Langue',
    'ctl.updated': (ago) => `mis à jour ${ago}`,
    'ctl.paused': ' · en pause',

    // nav
    'nav.overview': "Vue d'ensemble",
    'nav.activity': 'Activité',
    'nav.files': 'Fichiers',
    'nav.logs': 'Journaux',

    // generic states
    'state.loading': 'Chargement…',
    'state.noCli': 'CLI introuvable.',
    'state.noRows': (resource) => `Aucune entrée « ${resource} ».`,
    'state.loadFailed': (resource) => `Échec du chargement de « ${resource} ».`,
    'state.loadFailedShort': 'Échec du chargement',
    'state.badResponse': (url) => `Réponse invalide de ${url}`,
    'state.stale': (time) => `⚠ récupération en direct en échec — instantané de ${time}`,
    'state.discoveryFailed': (cli, error) => `Découverte échouée pour ${cli} : ${error}`,
    'state.cliUnreachable': (detail) => `CLI injoignable — dernier instantané valide affiché. ${detail}`,

    // help panel
    'help.loading': "chargement de l'aide…",
    'help.more': 'verbes & champs',

    // overview
    'ov.title': "Vue d'ensemble des agents",
    'ov.container': 'conteneur',
    'ov.sessions': 'sessions',
    'ov.messages': 'messages',
    'ov.lastActive': 'dernière activité',
    'ov.providerModel': 'fournisseur / modèle',
    'ov.cliScope': 'portée cli',
    'ov.extras': 'extras',
    'ov.inOut': (inbound, outbound) => `${inbound} reçus · ${outbound} envoyés`,
    'ov.extrasValue': (pkgs, mcp) => `${pkgs} pkgs · ${mcp} mcp`,

    // activity
    'act.title': 'Activité des messages',
    'act.inbound': (total) => `entrants (${total})`,
    'act.outbound': (total) => `sortants (${total})`,
    'act.lastDays': (days) => `${days} derniers jours`,
    'act.chartIn': (date, n) => `${date} : ${n} reçus`,
    'act.chartOut': (date, n) => `${date} : ${n} envoyés`,
    'act.colAgent': 'agent',
    'act.colSession': 'session',
    'act.colIn': 'reçus',
    'act.colOut': 'envoyés',
    'act.colLastActivity': 'dernière activité',

    // documents
    'doc.none': 'Aucun document.',
    'doc.emptyCollection': (label) => `Aucun élément dans « ${label} ».`,
    'doc.select': 'Sélectionnez un document.',

    // detail overlay
    'detail.close': 'Fermer',
    'detail.containerConfig': 'Config du conteneur',

    // relative time
    'time.secondsAgo': (s) => `il y a ${s} s`,
    'time.minutesAgo': (m) => `il y a ${m} min`,
    'time.hoursAgo': (h) => `il y a ${h} h`,
    'time.daysAgo': (d) => `il y a ${d} j`,
    'time.coarseUnderMinute': "il y a moins d'une minute",
    'time.coarseMinutes': (m) => (m === 1 ? 'il y a 1 minute' : `il y a ${m} minutes`),
    'time.coarseHours': (h) => (h === 1 ? 'il y a 1 heure' : `il y a ${h} heures`),
    'time.coarseDays': (d) => (d === 1 ? 'il y a 1 jour' : `il y a ${d} jours`),
  },
};

export { DICT };

function detectLocale() {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored && LOCALES.includes(stored)) return stored;
  } catch { /* private mode / no storage — fall through to the default */ }
  return DEFAULT_LOCALE;
}

let locale = detectLocale();

export function getLocale() { return locale; }

export function setLocale(next) {
  if (!LOCALES.includes(next)) return locale;
  locale = next;
  try { globalThis.localStorage?.setItem(STORAGE_KEY, next); } catch { /* not persisting is survivable */ }
  if (globalThis.document) globalThis.document.documentElement.lang = next;
  return locale;
}

// BCP-47 tag for Intl/toLocaleString calls.
export function localeTag() { return locale === 'fr' ? 'fr-CH' : 'en-GB'; }

// Missing keys fall back to English, then to the key itself — a half-translated
// dictionary degrades to English text instead of blanking the UI.
export function t(key, ...args) {
  const entry = DICT[locale]?.[key] ?? DICT[FALLBACK_LOCALE]?.[key];
  if (entry === undefined) return key;
  return typeof entry === 'function' ? entry(...args) : entry;
}

// Config-supplied labels (log files, doc collections) may be a plain string —
// shown as-is in every locale — or a per-locale map `{ en, fr }`.
export function resolveLabel(label, fallback = '') {
  if (label == null) return fallback;
  if (typeof label === 'string') return label;
  if (typeof label === 'object') {
    return label[locale] ?? label[FALLBACK_LOCALE] ?? Object.values(label)[0] ?? fallback;
  }
  return String(label);
}
