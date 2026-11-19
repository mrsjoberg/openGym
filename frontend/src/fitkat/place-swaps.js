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
const NOT_A_LIFT = /stretch|isometric|squeeze|yoga|\bpose\b|toe touch|\broll(er)?\b|mobility|circles|warm-?up|boxing|against wall/i
// Kinds of exercise that only stand in for their own kind: a jump is not a set of hip thrusts.
const OTHER_KINDS = new Set(['plyometrics', 'stretching', 'mobility', 'yoga', 'cardio', 'rehab', 'combat'])
const NEEDS_BALL = /exercise ball|stability ball|swiss ball|bosu/i

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
export function suggestSwaps(ex, place, { exclude = [], n = 2 } = {}) {
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
    if (NOT_A_LIFT.test(c.n) || (!hasBall && NEEDS_BALL.test(c.n))) continue
    if (c.cat !== ex.cat && OTHER_KINDS.has(c.cat)) continue
    const sameTarget = !!ex.tg && c.tg === ex.tg
    const shared = overlap(helpers, new Set([c.mg, ...list(c.sm)].filter(Boolean)))
    if (!sameTarget && c.mg !== ex.mg && !shared) continue
    const sameFamily = !!family && familyOf.get(c.id) === family
    const movement = overlap(words, movementWords(c))
    const score = (sameFamily ? 4 : 0) + 3 * movement + 2 * shared + (c.mg === ex.mg ? 1 : 0)
      - (loaded && c.eq === 'body weight' ? 3 : 0)
    ;(sameTarget ? strict : loose).push({ ex: c, score, sameMovement: sameFamily || movement >= 0.5, loose: !sameTarget })
  }
  // The id as the last key: the same kit always gives the same suggestions.
  const ranked = arr => arr.sort((a, b) => b.score - a.score || (a.ex.id < b.ex.id ? -1 : 1))
  return (strict.length ? ranked(strict) : ranked(loose)).slice(0, n).map(({ score, ...rest }) => rest)
}

/* -------------------------------------------------------------- decisions -- */

export const swapKey = (placeId, routineId, exId) => `${placeId}:${routineId}:${exId}`

/** A stored decision read back: { to } | { skip: true }, with `declined`, or null for none. */
export function readDecision(entry) {
  if (!isMap(entry)) return null
  const declined = list(entry.declined).filter(id => typeof id === 'string')
  if (entry.skip === true) return { skip: true, declined }
  if (typeof entry.to === 'string' && entry.to) return { to: entry.to, declined }
  return declined.length ? { declined } : null
}

export const decisionOf = (S, placeId, routineId, exId) =>
  readDecision(isMap(S?.placeSwaps) ? S.placeSwaps[swapKey(placeId, routineId, exId)] : null)

const stamped = (map, key, entry, now) => ({ ...(isMap(map) ? map : {}), [key]: { ...entry, _ts: now } })
const declinedOf = (map, key) => readDecision(isMap(map) ? map[key] : null)?.declined || []

/** S.placeSwaps with the replacement approved. */
export const withApproved = (map, key, toId, now = Date.now()) =>
  stamped(map, key, { to: toId, declined: declinedOf(map, key).filter(id => id !== toId) }, now)

/** S.placeSwaps with one more suggestion refused; an approved replacement that is refused goes with it. */
export function withDeclined(map, key, exId, now = Date.now()) {
  const declined = [...new Set([...declinedOf(map, key), exId])]
  return stamped(map, key, { declined }, now)
}

/** S.placeSwaps with the exercise skipped at that place. */
export const withSkipped = (map, key, now = Date.now()) =>
  stamped(map, key, { skip: true, declined: declinedOf(map, key) }, now)

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
  return rows.map(cfg => {
    const ex = EXIDX[cfg.id] || null
    const d = decisionOf(S, place.id, routine.id, cfg.id)
    const declined = d?.declined || []
    // Her own exercises and anything the catalogue does not know are never second-guessed.
    if (!ex || fitsPlace(ex, place)) return { cfg, ex, state: 'fits', declined }
    if (d?.skip) return { cfg, ex, state: 'skipped', declined }
    // An approval stands only while the place can still do the replacement.
    if (d?.to && EXIDX[d.to] && fitsPlace(EXIDX[d.to], place)) return { cfg, ex, state: 'approved', to: EXIDX[d.to], declined }
    const [suggestion] = suggestSwaps(ex, place, { exclude: [...held, ...declined], n: 1 })
    if (!suggestion) return { cfg, ex, state: declined.length ? 'ask-skip' : 'no-match', declined }
    if (declined.length >= MAX_SUGGESTIONS) return { cfg, ex, state: 'ask-skip', declined }
    return { cfg, ex, state: 'pending', suggestion, declined }
  })
}

/** How a routine fits a place: { total, fits, swaps, undecided, skipped }. `swaps` counts every exercise the kit cannot do. */
export function fitOf(S, routine, place) {
  const out = { total: 0, fits: 0, swaps: 0, undecided: 0, skipped: 0 }
  for (const row of routineAtPlace(S, routine, place)) {
    out.total++
    if (row.state === 'fits') { out.fits++; continue }
    out.swaps++
    if (row.state === 'skipped') out.skipped++
    else if (row.state !== 'approved') out.undecided++
  }
  return out
}

// What a replacement takes over from the slot it stands in for: how much work, not which bar.
const CARRIED = ['sets', 'reps', 'repsMin', 'rest', 'sg', 'note']

/**
 * The routine as a session at `place` runs it: approved replacements in, skipped exercises out,
 * everything else as written. An undecided exercise stays, so nothing changes before she has
 * approved it. The same object comes back when nothing differs.
 */
export function routineForPlace(S, routine, place) {
  if (!routine || !place || !isMap(S?.placeSwaps)) return routine
  let changed = false
  const ex = []
  for (const row of routineAtPlace(S, routine, place)) {
    if (row.state === 'skipped') { changed = true; continue }
    if (row.state !== 'approved') { ex.push(row.cfg); continue }
    changed = true
    const next = { id: row.to.id, swappedFrom: row.cfg.id }
    for (const k of CARRIED) if (row.cfg[k] !== undefined) next[k] = row.cfg[k]
    ex.push(next)
  }
  return changed ? { ...routine, ex } : routine
}

/** The place a session is running at, or the one that is active: an equipment profile, or null. */
export function currentPlace(S) {
  const id = currentGymId(S)
  return id == null ? null : list(S?.equipProfiles).find(p => p && p.id === id) || null
}

/** buildSessionEntries' hook: the routine for where she is training now. */
export const routineHere = (S, routine) => routineForPlace(S, routine, currentPlace(S))
