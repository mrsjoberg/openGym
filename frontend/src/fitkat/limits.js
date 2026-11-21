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
// Positions are fixed before anything is filtered, so Avoid never falls back to the first step.
// Then a step is passed over when her place has no kit for it, when the routine already holds it,
// or when it loads another of her limits.
//
// The reasons are coaching convention. No physiotherapist has verified them.
import { EXIDX } from '../lib/exercises.js'
import { FLAGS, LISTS, WHYS } from './limits-data.js'

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

/** The areas an exercise loads, whether or not she has a limit there. */
export const areasLoaded = exId => AREAS.filter(a => FLAGS[exId]?.[CODE[a]] !== undefined)

// Told to rest wins, then Avoid, then Go easy; between equals, the order the areas are listed.
const rank = l => (l.rest ? 0 : l.mode === 'avoid' ? 1 : 2)

/** The limit that governs an exercise, { area, mode, rest, since, flag }, or null when none of hers touches it. */
export function limitOn(S, exId) {
  const flags = FLAGS[exId]
  if (!flags) return null
  let best = null
  for (const l of limitsOf(S)) {
    const flag = flags[CODE[l.area]]
    if (flag === undefined) continue
    if (!best || rank(l) < rank(best)) best = { ...l, flag }
  }
  return best
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
  const others = limitsOf(S).filter(l => l.area !== limit.area).map(l => CODE[l.area])
  const loadsAnother = id => others.some(c => FLAGS[id]?.[c] !== undefined)
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
