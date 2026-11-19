// FitKat's own settings, kept apart from openGym's code so an upstream update merges cleanly and so
// what is ours is easy to find. Plain JS with no imports: lib/i18n-core.js loads it in Node too.

export const APP_NAME = 'FitKat'
const UPSTREAM_NAME = 'openGym'

// The overlay as a whole: the name, the language list, the single theme. On in every build. Off
// while openGym's own test suite runs, so those tests stay as upstream wrote them and keep proving
// that nothing underneath moved; FitKat's tests (fitkat/*.test.js) switch it on for themselves.
let on = !(typeof process !== 'undefined' && !!process.env && !!process.env.VITEST)
export const overlayOn = () => on
/** The name to show where the code spells it out instead of going through t(). */
export const appName = () => (on ? APP_NAME : UPSTREAM_NAME)
/** Tests only. */
export const setOverlay = v => { on = !!v }

// The languages FitKat offers. The other packs openGym ships stay in the tree, unlisted.
export const OFFERED_LANGS = ['en', 'ru']
export const isOffered = l => !on || OFFERED_LANGS.includes(l)

// Light theme only for now: the Her Season look has no dark version yet (fitkat/theme.css).
export const lightOnly = () => on
// The page colour of that theme, for the browser's and the phone's bars.
export const PAGE_COLOR = '#f8f6f0'

// Source strings that stay about openGym itself, because they are: its donation and store links,
// its licensed animations, and what its own builds contain. Matched on the English source string,
// which is the key in every language pack.
const ABOUT_UPSTREAM = /Support openGym|A coffee keeps it that way|Rate openGym on|openGym animation|comes without the Garmin link/

// "openGym" as a word of its own, not inside a path ("Documents/openGym") or an identifier. No
// lookbehind: Safari before 16.4 cannot parse one and the whole bundle would fail to load.
const UPSTREAM_WORD = /(^|[^/\w])openGym(?!\w)/g

/**
 * A translated string with the app's name put in. `source` is the English source string the
 * translation was looked up by; `text` is what is about to be shown.
 */
export function branded(source, text) {
  if (!on || typeof text !== 'string' || text.indexOf(UPSTREAM_NAME) < 0) return text
  if (typeof source === 'string' && ABOUT_UPSTREAM.test(source)) return text
  return text.replace(UPSTREAM_WORD, '$1' + APP_NAME)
}
