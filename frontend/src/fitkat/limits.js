// Injuries and limits: a joint or tendon she wants the plan to work around.
//
// A limit is set in onboarding and changed only in Settings. Each is "Go easy" or "Avoid":
//
//   S.bodyLimits = { knee: { mode: 'easy' | 'avoid', rest?: true, since: '2026-11-21', _ts }, ... }
//
// A stamped map (lib/sync-merge.js STAMPED_MAPS, mirrored in api/sync-stamps.js). An entry with
// nothing but its stamp is a limit that was taken away.
//
// Which exercises load which area, and what each is offered in its place, comes from
// limits-data.js. That file is generated (scripts/fitkat/limits): a ladder per movement, each step
// asking less of the joint than the one before, a hold last. Here the ladder is cut to what she is
// offered:
//
//   Go easy   the first two steps, then "Skip it?". With nothing left to offer: "Keep it, easier".
//   Avoid     every step after the first, then "Skip it?". A one-step ladder only if it is a hold.
//   Told to rest it (Avoid only): every exercise that loads the area is skipped. No ladder.
//
// Go easy and Avoid go by the rules behind the ladders (FLAGS): an area is flagged where it is the
// main stress. Told to rest is stricter, and goes by a second opinion as well (READ: every strength
// and body-weight exercise read one by one by an AI reviewer). What the rules flag or a reader
// calls loaded is skipped; what the rules or a reader say it only involves, she is asked about.
// A bench press under an elbow limit: untouched under Go easy, skipped when she was told to rest.
//
// Positions are fixed before anything is filtered, so Avoid never falls back to the first step.
// Then a step is passed over when her place has no kit for it, when the routine already holds it,
// or when it loads another of her limits.
//
// The reasons are coaching convention. No physiotherapist has verified them.
import { EXIDX } from '../lib/exercises.js'
import { FLAGS, LISTS, WHYS, TOUCHES, POOL, READ } from './limits-data.js'

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)

export const AREAS = ['neck', 'shoulder', 'elbow', 'wrist', 'back', 'hip', 'knee', 'ankle']
const CODE = { neck: 'n', shoulder: 's', elbow: 'e', wrist: 'w', back: 'b', hip: 'h', knee: 'k', ankle: 'a' }
// English, passed through ft() where they are shown.
export const AREA_LABEL = {
  neck: 'Neck', shoulder: 'Shoulder', elbow: 'Elbow', wrist: 'Wrist or hand',
  back: 'Lower back', hip: 'Hip', knee: 'Knee', ankle: 'Ankle or foot',
}
export const AREA_HINT = {
  neck: 'Stiff or sore neck', shoulder: 'Rotator cuff, frozen shoulder', elbow: "Tennis or golfer's elbow",
  wrist: 'Wrist, thumb, grip', back: 'Aches, old disc trouble', hip: 'Outer hip, groin',
  knee: 'Kneecap, front of knee', ankle: 'Achilles, heel, sole',
}
export const KEEP_EASIER = 'Lighter where you set the weight. Slower, with a smaller movement, where it is body weight.'
export const KEEP_SHORTER = 'The same hold, for a shorter time.'

/* ------------------------------------------------------------------ her limits -- */

/** A stored limit read back: { mode, rest, since }, or null for none. */
export function readLimit(entry) {
  if (!isMap(entry) || (entry.mode !== 'easy' && entry.mode !== 'avoid')) return null
  return { mode: entry.mode, rest: entry.mode === 'avoid' && entry.rest === true, since: typeof entry.since === 'string' ? entry.since : '' }
}

/** Her limits, in the order the areas are listed: [{ area, mode, rest, since }]. */
export function limitsOf(S) {
  const map = isMap(S?.bodyLimits) ? S.bodyLimits : {}
  const out = []
  for (const area of AREAS) {
    const l = readLimit(map[area])
    if (l) out.push({ area, ...l })
  }
  return out
}

/** S.bodyLimits with a limit set or changed. The day it was first set is kept. */
export function withLimit(map, area, { mode, rest = false }, today = '', now = Date.now()) {
  const base = isMap(map) ? map : {}
  if (!AREAS.includes(area) || (mode !== 'easy' && mode !== 'avoid')) return base
  const since = readLimit(base[area])?.since || today
  return { ...base, [area]: { mode, ...(mode === 'avoid' && rest ? { rest: true } : {}), since, _ts: now } }
}

/** S.bodyLimits with a limit taken away: "It is better now". A cleared entry, so the removal syncs. */
export const withoutLimit = (map, area, now = Date.now()) => ({ ...(isMap(map) ? map : {}), [area]: { _ts: now } })

/* ------------------------------------------------------------ what is flagged -- */

/** The areas an exercise loads by the rules, whether or not she has a limit there. Go easy and Avoid go by this. */
export const areasLoaded = exId => AREAS.filter(a => FLAGS[exId]?.[CODE[a]] !== undefined)

// A reviewer's reading, as area letters: what the exercise loads, and what it only involves.
const readLoads = exId => (READ[exId] || '').split('|')[0]
const readAll = exId => READ[exId] || ''

/** The areas a told-to-rest order takes an exercise out for: flagged by the rules, or loaded by a reader. */
export const areasRested = exId => AREAS.filter(a => FLAGS[exId]?.[CODE[a]] !== undefined || readLoads(exId).includes(CODE[a]))

/** The areas an exercise loads or merely involves, by the rules or a reader: everything it does not leave alone. */
export const areasTouched = exId => AREAS.filter(a => FLAGS[exId]?.[CODE[a]] !== undefined || (TOUCHES[exId] || '').includes(CODE[a]) || readAll(exId).includes(CODE[a]))

/** The exercises that may be suggested as fill-ins (scripts/fitkat/limits/fill-pool.json). */
export const POOL_IDS = POOL

// The parts of the body (the catalogue's `bodyPart`) that sit around each area. Used only for what
// may be ADDED to a session while she rests an area: the tags are rule-derived and miss things, so
// nothing from the same region is suggested at all. Deliberately wide. Not reviewed by a physio.
export const REGION = {
  neck: ['neck', 'shoulders', 'back'],
  shoulder: ['shoulders', 'chest', 'back', 'upper arms'],
  elbow: ['upper arms', 'lower arms', 'shoulders', 'chest', 'back'],
  wrist: ['lower arms', 'upper arms', 'shoulders', 'chest', 'back'],
  back: ['back', 'waist', 'upper legs'],
  hip: ['upper legs', 'waist'],
  knee: ['upper legs', 'lower legs'],
  ankle: ['lower legs', 'upper legs'],
}

// Told to rest wins, then Avoid, then Go easy; between equals, the order the areas are listed.
const rank = l => (l.rest ? 0 : l.mode === 'avoid' ? 1 : 2)

/**
 * The limit that governs an exercise, { area, mode, rest, since, flag }, or null when none of hers touches it.
 * An area she was told to rest also governs what only a reader calls loaded (`flag` is then undefined).
 */
export function limitOn(S, exId) {
  const flags = FLAGS[exId] || {}
  const read = readLoads(exId)
  let best = null
  for (const l of limitsOf(S)) {
    const flag = flags[CODE[l.area]]
    if (flag === undefined && !(l.rest && read.includes(CODE[l.area]))) continue
    if (!best || rank(l) < rank(best)) best = { ...l, flag }
  }
  return best
}

/**
 * A rested area that an exercise involves without loading it: { area, mode, rest, since }, or null.
 * Such an exercise is not skipped. She is asked whether to keep it or skip it (owner, 21 Nov).
 */
export function restInvolved(S, exId) {
  const rests = limitsOf(S).filter(l => l.rest)
  if (!rests.length) return null
  const touched = areasTouched(exId)
  return rests.find(l => touched.includes(l.area)) || null
}

/**
 * What an exercise is offered under her limits, in order:
 *   { limit, rest, offers: [{ id, why, hold } | { keep: true, why }] }
 * or null when no limit of hers touches it. `rest` means skip it, no offers. An empty list means
 * the skip question comes straight away. `fits(ex)` says whether her place can do an exercise;
 * `exclude` is ids never to offer (what the routine already holds).
 */
export function limitOffers(S, exId, { fits = () => true, exclude = [] } = {}) {
  const limit = limitOn(S, exId)
  if (!limit) return null
  if (limit.rest) return { limit, rest: true, offers: [] }
  const easy = limit.mode === 'easy'
  const flag = limit.flag
  // Jumping, running and Olympic lifts with a knee, hip or ankle limit: a smaller jump is still a jump.
  if (flag === 'x') return { limit, rest: false, offers: [] }
  if (typeof flag !== 'number') return { limit, rest: false, offers: easy ? [{ keep: true, why: flag === 't' ? KEEP_SHORTER : KEEP_EASIER }] : [] }
  // Never a step that loads another of her limits. For one she was told to rest, a reader's word counts too.
  const others = limitsOf(S).filter(l => l.area !== limit.area)
  const loadsAnother = id => others.some(l => FLAGS[id]?.[CODE[l.area]] !== undefined || (l.rest && readLoads(id).includes(CODE[l.area])))
  const skip = new Set([exId, ...exclude])
  const steps = LISTS[flag] || []
  const mine = easy ? steps.slice(0, 2) : steps.length > 1 ? steps.slice(1) : steps.filter(s => s[0] === 'h')
  const offers = []
  for (const [kind, body] of mine) {
    // Keep the same exercise, adjusted: the same machine, a lighter band, palms facing each other.
    if (kind === 'a') { offers.push({ keep: true, why: WHYS[body] }); continue }
    const pick = body.find(([id]) => EXIDX[id] && !skip.has(id) && !loadsAnother(id) && fits(EXIDX[id]))
    if (pick) offers.push({ id: pick[0], why: WHYS[pick[1]], hold: kind === 'h' })
  }
  if (!offers.length && easy) offers.push({ keep: true, why: KEEP_EASIER })
  return { limit, rest: false, offers }
}
