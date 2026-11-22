// Programmes that fit the place you train at.
//
// A place is one of openGym's equipment profiles (lib/equipment.js, lib/gym-inventory.js): "My gym",
// "Home", "Travel". When a routine holds an exercise the place's kit cannot do, FitKat suggests a
// replacement and she decides: approve it, ask for another, or after two refusals skip the exercise
// at that place. Nothing in a routine changes until she has said so, and the routine itself is
// never rewritten: the decisions are kept beside it, per place, and applied when a session is built
// (lib/session-start.js buildSessionEntries), so the same routine is the barbell version at the gym
// and the dumbbell version at home.
//
//   S.placeSwaps = { 'placeId:routineId:exId': { to: '1459', declined: ['4861'], _ts } | { skip: true, declined: [...], _ts } }
//
// An exercise that loads one of her limits (limits.js) is asked about the same way, and first: its
// ladder of gentler versions comes before the kit question, and only steps the place can do are
// offered. Such a decision carries `lim`, the area it was made for, and may be `{ keep: true }`:
// keep the exercise, easier. It counts only while that limit is hers, so taking the limit away
// brings the original back.
//
// A stamped map (lib/sync-merge.js STAMPED_MAPS, mirrored in api/sync-stamps.js): each decision
// carries its own edit time and syncs on its own, the newer one winning.
//
// Sets, reps and rest carry over to the replacement. The routine's starting weight does not: a
// barbell's 40 kg says nothing about a pair of dumbbells, so the replacement starts from its own
// history, or light when it has none.
import { EXIDX } from '../lib/exercises.js'
import { eqAvailable, profileEquipment, ALL_EQUIPMENT } from '../lib/equipment.js'
import { profileMachines } from '../lib/machine-kinds.js'
import { SUBSTITUTE_FAMILIES } from '../lib/exercise-substitutes.js'
import { currentGymId } from '../lib/gym-split.js'
import { limitOn, limitOffers, limitsOf, withLimit, restInvolved } from './limits.js'
import { isDropped } from './drops.js'
import { fillEntries } from './fills.js'
import { mobilityEntries } from './mobility.js'
import { withFinishers } from './bone.js'

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const list = v => (Array.isArray(v) ? v : [])

/* ------------------------------------------------------------ suggestions -- */

const familyOf = new Map(Object.entries(SUBSTITUTE_FAMILIES).flatMap(([family, ids]) => ids.map(id => [id, family])))

// Words that name the kit, not the movement, so "barbell hip thrust" and "dumbbell hip thrust"
// read as the same lift.
const KIT_WORDS = new Set(ALL_EQUIPMENT.flatMap(e => e.split(/[^a-z0-9]+/)).concat(['lever', 'leverage', 'machine', 'sled']))
const movementWords = ex => new Set(String(ex?.n || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w && !KIT_WORDS.has(w)))
const overlap = (a, b) => {
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter ? inter / (a.size + b.size - inter) : 0
}
// Never a stand-in for a working set, whatever muscle it shares with one.
export const NOT_A_LIFT = /stretch|isometric|squeeze|yoga|\bpose\b|toe touch|\broll(er)?\b|mobility|circles|warm-?up|boxing|against wall/i
// Kinds of exercise that only stand in for their own kind: a jump is not a set of hip thrusts.
const OTHER_KINDS = new Set(['plyometrics', 'stretching', 'mobility', 'yoga', 'cardio', 'rehab', 'combat'])
export const NEEDS_BALL = /exercise ball|stability ball|swiss ball|bosu/i

/** What a place has: its equipment list and, when it names them, its machines. */
export const kitOfPlace = place => ({ equipment: profileEquipment(place), machines: profileMachines(place) })

/** Whether the place's kit can do this exercise. An exercise the catalogue does not know always can. */
export function fitsPlace(ex, place) {
  if (!ex || !place) return true
  const { equipment, machines } = kitOfPlace(place)
  return eqAvailable(equipment, ex, machines)
}

/**
 * Replacements for `ex` that the place can do, best first: [{ ex, sameMovement, loose }].
 *
 * Same body part and the same target muscle; within that, an exercise from the same reviewed
 * family (exercise-substitutes.js) first, then the closest movement by name, then shared helper
 * muscles. A loaded lift prefers a loaded replacement: a push-up is not a bench press. Only when
 * nothing shares the target muscle do exercises that share another muscle stand in, marked
 * `loose`. `exclude` is ids never to offer: what the routine already holds, what she declined.
 */
export function suggestSwaps(ex, place, { exclude = [], n = 2, allow, prefer } = {}) {
  if (!ex || !place) return []
  const { equipment, machines } = kitOfPlace(place)
  const skip = new Set([ex.id, ...exclude])
  const hasBall = equipment.includes('stability ball') || equipment.includes('bosu ball')
  const words = movementWords(ex)
  const helpers = new Set([ex.mg, ...list(ex.sm)].filter(Boolean))
  const loaded = ex.eq !== 'body weight'
  const family = familyOf.get(ex.id)
  const strict = [], loose = []
  for (const c of Object.values(EXIDX)) {
    if (!c || skip.has(c.id) || c.bp !== ex.bp || !c.n) continue
    if (!eqAvailable(equipment, c, machines)) continue
    // `allow` rules a candidate out (it loads one of her limits); `prefer` puts some first (they
    // leave an area she rests alone). Both come from routineAtPlace.
    if (allow && !allow(c)) continue
    if (NOT_A_LIFT.test(c.n) || (!hasBall && NEEDS_BALL.test(c.n))) continue
    if (c.cat !== ex.cat && OTHER_KINDS.has(c.cat)) continue
    const sameTarget = !!ex.tg && c.tg === ex.tg
    const shared = overlap(helpers, new Set([c.mg, ...list(c.sm)].filter(Boolean)))
    if (!sameTarget && c.mg !== ex.mg && !shared) continue
    const sameFamily = !!family && familyOf.get(c.id) === family
    const movement = overlap(words, movementWords(c))
    const score = (sameFamily ? 4 : 0) + 3 * movement + 2 * shared + (c.mg === ex.mg ? 1 : 0)
      - (loaded && c.eq === 'body weight' ? 3 : 0)
    ;(sameTarget ? strict : loose).push({ ex: c, score, first: prefer && prefer(c) ? 1 : 0, sameMovement: sameFamily || movement >= 0.5, loose: !sameTarget })
  }
  // The id as the last key: the same kit always gives the same suggestions.
  const ranked = arr => arr.sort((a, b) => b.first - a.first || b.score - a.score || (a.ex.id < b.ex.id ? -1 : 1))
  return (strict.length ? ranked(strict) : ranked(loose)).slice(0, n).map(({ score, first, ...rest }) => rest)
}

/* -------------------------------------------------------------- decisions -- */

export const swapKey = (placeId, routineId, exId) => `${placeId}:${routineId}:${exId}`

/** A stored decision read back: { to } | { skip: true }, with `declined`, or null for none. */
export function readDecision(entry) {
  if (!isMap(entry)) return null
  const declined = list(entry.declined).filter(id => typeof id === 'string')
  const lim = typeof entry.lim === 'string' && entry.lim ? { lim: entry.lim } : {}
  if (entry.skip === true) return { skip: true, declined, ...lim }
  if (entry.keep === true) return { keep: true, declined, ...lim }
  if (typeof entry.to === 'string' && entry.to) return { to: entry.to, declined, ...lim }
  return declined.length ? { declined, ...lim } : null
}

export const decisionOf = (S, placeId, routineId, exId) =>
  readDecision(isMap(S?.placeSwaps) ? S.placeSwaps[swapKey(placeId, routineId, exId)] : null)

const stamped = (map, key, entry, now) => ({ ...(isMap(map) ? map : {}), [key]: { ...entry, _ts: now } })
// What she has refused so far, for the same reason: refusals about the kit say nothing about a limit.
const declinedOf = (map, key, lim) => {
  const d = readDecision(isMap(map) ? map[key] : null)
  return d && d.lim === (lim || undefined) ? d.declined : []
}
const forLimit = lim => (lim ? { lim } : {})

/** S.placeSwaps with the replacement approved. `lim` is the area, when the question was about a limit. */
export const withApproved = (map, key, toId, now = Date.now(), lim) =>
  stamped(map, key, { to: toId, declined: declinedOf(map, key, lim).filter(id => id !== toId), ...forLimit(lim) }, now)

/** S.placeSwaps with the exercise kept under a limit: the same exercise, easier. */
export const withKept = (map, key, lim, now = Date.now()) =>
  stamped(map, key, { keep: true, declined: declinedOf(map, key, lim), ...forLimit(lim) }, now)

/** S.placeSwaps with one more suggestion refused; an approved replacement that is refused goes with it. */
export function withDeclined(map, key, exId, now = Date.now(), lim) {
  const declined = [...new Set([...declinedOf(map, key, lim), exId])]
  return stamped(map, key, { declined, ...forLimit(lim) }, now)
}

/** S.placeSwaps with the exercise skipped at that place. */
export const withSkipped = (map, key, now = Date.now(), lim) =>
  stamped(map, key, { skip: true, declined: declinedOf(map, key, lim), ...forLimit(lim) }, now)

/** S.placeSwaps with the decision taken back: the exercise is asked about again, from the start. */
export const withCleared = (map, key, now = Date.now()) => stamped(map, key, {}, now)

/* ------------------------------------------------------- a routine at a place -- */

// How many suggestions she is shown before the skip question.
export const MAX_SUGGESTIONS = 2

/**
 * Every exercise of `routine` as it stands at `place`:
 *   { cfg, ex, state: 'fits' | 'approved' | 'skipped' | 'pending' | 'ask-skip' | 'no-match', to?, suggestion?, declined }
 * 'pending' carries the next suggestion to show; 'ask-skip' is two refusals (or nothing left to
 * offer after one); 'no-match' is an exercise nothing at the place can replace.
 */
export function routineAtPlace(S, routine, place) {
  const rows = list(routine?.ex)
  if (!place) return rows.map(cfg => ({ cfg, ex: EXIDX[cfg.id] || null, state: 'fits', declined: [] }))
  const held = rows.map(cfg => cfg.id)
  // No replacement twice in one session: what another exercise here already runs as, and what an
  // earlier one is being offered right now, is not offered again. The next step is taken.
  const approved = rows.map(cfg => decisionOf(S, place.id, routine.id, cfg.id)?.to || null)
  const offered = []
  // What stands in for an exercise her kit cannot do must not load one of her limits, as no ladder
  // step may (rule L7). One that leaves an area she rests alone comes first; one that involves it
  // is still offered, and says so, since she is the one to decide about those.
  const limited = limitsOf(S).length > 0
  const spares = c => !limited || !limitOn(S, c.id)
  const involves = c => (limited ? restInvolved(S, c.id)?.area || null : null)
  const noted = c => { const area = involves(c); return area ? { involves: area } : {} }
  return rows.map((cfg, i) => {
    const ex = EXIDX[cfg.id] || null
    const any = decisionOf(S, place.id, routine.id, cfg.id)
    // A limit of hers comes first: its ladder, then the kit.
    const limit = ex ? limitOn(S, cfg.id) : null
    if (limit) {
      const taken = [...held, ...approved.filter((id, j) => id && j !== i), ...offered]
      const row = limitRow(S, cfg, ex, place, taken, limit, any && any.lim === limit.area ? any : null)
      if (row.state === 'pending' && !row.suggestion.keep) offered.push(row.suggestion.ex.id)
      return row
    }
    const d = any && !any.lim ? any : null
    const declined = d?.declined || []
    // Her own exercises and anything the catalogue does not know are never second-guessed.
    if (!ex) return { cfg, ex, state: 'fits', declined }
    if (fitsPlace(ex, place)) {
      // It fits, but it involves an area she was told to rest. It is not skipped: she is asked,
      // and until she answers it stays in.
      const rest = restInvolved(S, cfg.id)
      if (!rest) return { cfg, ex, state: 'fits', declined }
      const mine = any && any.lim === rest.area ? any : null
      return { cfg, ex, state: mine?.skip ? 'skipped' : mine?.keep ? 'kept' : 'ask-rest', limit: rest, involved: true, declined: [] }
    }
    if (d?.skip) return { cfg, ex, state: 'skipped', declined }
    // An approval stands only while the place can still do the replacement.
    // And only while it loads none of her limits: one she sets later asks again.
    if (d?.to && EXIDX[d.to] && fitsPlace(EXIDX[d.to], place) && spares(EXIDX[d.to])) return { cfg, ex, state: 'approved', to: EXIDX[d.to], declined, ...noted(EXIDX[d.to]) }
    const [suggestion] = suggestSwaps(ex, place, { exclude: [...held, ...declined], n: 1, ...(limited ? { allow: spares, prefer: c => !involves(c) } : {}) })
    if (!suggestion) return { cfg, ex, state: declined.length ? 'ask-skip' : 'no-match', declined }
    if (declined.length >= MAX_SUGGESTIONS) return { cfg, ex, state: 'ask-skip', declined }
    return { cfg, ex, state: 'pending', suggestion, declined, ...noted(suggestion.ex) }
  })
}

// An exercise that loads one of her limits, as it stands at a place. Told to rest it: skipped, with
// nothing to decide. Otherwise the next step of its ladder she has not refused; with none left, the
// skip question. "Keep it" is refused under the exercise's own id.
function limitRow(S, cfg, ex, place, held, limit, d) {
  const declined = d?.declined || []
  const { rest, offers } = limitOffers(S, cfg.id, { fits: c => fitsPlace(c, place), exclude: held })
  if (rest) return { cfg, ex, state: 'skipped', limit, rest: true, declined: [] }
  if (d?.skip) return { cfg, ex, state: 'skipped', limit, declined }
  if (d?.keep) return { cfg, ex, state: 'approved', limit, keep: true, to: ex, declined }
  const approved = d?.to ? offers.find(o => o.id === d.to) : null
  if (approved) return { cfg, ex, state: 'approved', limit, to: EXIDX[approved.id], hold: !!approved.hold, why: approved.why, declined }
  const next = offers.find(o => !declined.includes(o.keep ? cfg.id : o.id))
  if (!next) return { cfg, ex, state: 'ask-skip', limit, declined }
  const suggestion = { ex: next.keep ? ex : EXIDX[next.id], keep: !!next.keep, hold: !!next.hold, why: next.why, sameMovement: true, loose: false }
  return { cfg, ex, state: 'pending', limit, suggestion, declined }
}

/** How a routine fits a place: { total, fits, swaps, undecided, skipped }. `swaps` counts every exercise the kit cannot do. */
export function fitOf(S, routine, place) {
  const out = { total: 0, fits: 0, swaps: 0, undecided: 0, skipped: 0 }
  for (const row of routineAtPlace(S, routine, place)) {
    out.total++
    if (row.state === 'fits' || row.state === 'kept') { out.fits++; continue }
    out.swaps++
    if (row.state === 'skipped') out.skipped++
    else if (row.state !== 'approved') out.undecided++
  }
  return out
}

// What a replacement takes over from the slot it stands in for: how much work, not which bar.
const CARRIED = ['sets', 'reps', 'repsMin', 'rest', 'sg', 'note']
// How long a hold that stands in under a limit is held, to start with.
export const HOLD_SEC = 30

/**
 * The routine as a session at `place` runs it: approved replacements in, skipped exercises out,
 * everything else as written. An undecided exercise stays, so nothing changes before she has
 * approved it. The same object comes back when nothing differs.
 */
export function routineForPlace(S, routine, place) {
  if (!routine || !place || (!isMap(S?.placeSwaps) && !limitsOf(S).length)) return routine
  let changed = false
  const ex = []
  const rows = routineAtPlace(S, routine, place)
  for (const row of rows) {
    if (row.state === 'skipped') { changed = true; continue }
    if (row.state !== 'approved') { ex.push(row.cfg); continue }
    changed = true
    // Kept under a limit: the same exercise, marked so the workout says to go easier.
    if (row.keep) { ex.push({ ...row.cfg, limit: row.limit.area }); continue }
    // A hold is counted in seconds, whether or not the catalogue marks it as one: it takes the sets,
    // never the reps of the lift it stands in for.
    const next = { id: row.to.id, swappedFrom: row.cfg.id, ...(row.limit ? { limit: row.limit.area } : {}), ...(row.hold ? { mode: 'time', sec: HOLD_SEC } : {}) }
    for (const k of CARRIED) if (row.cfg[k] !== undefined && !(row.hold && (k === 'reps' || k === 'repsMin'))) next[k] = row.cfg[k]
    ex.push(next)
  }
  // "Build your own": what she added to a session that resting an area left short (fills.js).
  const extra = fillEntries(S, routine, place, new Set(ex.map(e => e.id)))
  // Go easy: two mobility moves for the area open a session she has accepted an exercise in (mobility.js).
  const warm = ex.length ? mobilityEntries(S, rows, new Set([...ex, ...extra].map(e => e.id))) : []
  return changed || extra.length || warm.length ? { ...routine, ex: [...warm, ...ex, ...extra] } : routine
}

/** The place a session is running at, or the one that is active: an equipment profile, or null. */
export function currentPlace(S) {
  const id = currentGymId(S)
  return id == null ? null : list(S?.equipProfiles).find(p => p && p.id === id) || null
}

/**
 * buildSessionEntries' hook: the routine for where she is training now, with the bone and
 * balance finishers she added at its end (bone.js).
 */
export const routineHere = (S, routine) => withFinishers(S, routineForPlace(S, routine, currentPlace(S)))

/* ------------------------------------------------------- told to rest it -- */

/**
 * A routine counted at a place: { total, kept, resting }. `kept` is what still runs once the
 * skipped exercises are out; `resting` is the areas she was told to rest that took some out.
 * `short` is a session left with fewer than half its exercises, or with one.
 */
export function sessionCount(S, routine, place) {
  const rows = routineAtPlace(S, routine, place)
  const kept = rows.filter(r => r.state !== 'skipped').length
  const resting = [...new Set(rows.filter(r => r.rest).map(r => r.limit.area))]
  return { total: rows.length, kept, resting, short: resting.length > 0 && (kept * 2 < rows.length || kept <= 1) }
}

/**
 * What it would cost to rest an area, before she says yes: { skipped, short: [{ name, kept, total }] }.
 * `skipped` is the exercises of her plan that load it; `short` the sessions it would leave short.
 */
export function restCost(S, routines, place, area) {
  const out = { skipped: 0, short: [] }
  if (!place) return out
  const as = { ...S, bodyLimits: withLimit(S?.bodyLimits, area, { mode: 'avoid', rest: true }) }
  for (const routine of list(routines)) {
    out.skipped += routineAtPlace(as, routine, place).filter(r => r.rest && r.limit.area === area).length
    const c = sessionCount(as, routine, place)
    if (c.short && c.resting.includes(area)) out.short.push({ name: routine.name, kept: c.kept, total: c.total })
  }
  return out
}

/* ------------------------------------------------------------- the review -- */

/**
 * What there is to review at a place: [{ routine, rows }], only routines with something the kit
 * cannot do. A session she has dropped for now (drops.js) is off her week, so nothing is asked
 * about it until it comes back.
 */
export function reviewList(S, routines, place) {
  if (!place) return []
  return list(routines).filter(routine => !isDropped(S, routine.id)).map(routine => ({ routine, rows: routineAtPlace(S, routine, place).filter(r => r.state !== 'fits') }))
    .filter(g => g.rows.length)
}

/** Exercises still waiting for her answer at a place. */
export const undecidedCount = (S, routines, place) =>
  reviewList(S, routines, place).reduce((n, g) => n + g.rows.filter(r => r.state !== 'approved' && r.state !== 'skipped' && r.state !== 'kept').length, 0)

/** Exercises that run as an approved replacement at a place. */
export const swappedCount = (S, routines, place) =>
  reviewList(S, routines, place).reduce((n, g) => n + g.rows.filter(r => r.state === 'approved').length, 0)

/** S.placeSwaps with every suggestion now on screen approved. Exercises at the skip question stay hers to answer. */
export function approveAll(map, S, routines, place, now = Date.now()) {
  let out = isMap(map) ? map : {}
  for (const g of reviewList(S, routines, place)) for (const r of g.rows) {
    const key = swapKey(place.id, g.routine.id, r.cfg.id)
    // "Keep or skip?" for what only involves a rested area: approving everything keeps it.
    if (r.state === 'ask-rest') { out = withKept(out, key, r.limit.area, now); continue }
    if (r.state !== 'pending') continue
    out = r.suggestion.keep ? withKept(out, key, r.limit.area, now) : withApproved(out, key, r.suggestion.ex.id, now, r.limit?.area)
  }
  return out
}
