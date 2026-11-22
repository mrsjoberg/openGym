// "Build your own": filling a session that resting an area has left short.
//
// When she was told to rest an area, every exercise that loads it is skipped (limits.js), and a
// session can be left with one or two exercises. Here she adds others in their place, from the
// whole library. What she adds is kept beside the routine, per place, like a swap decision:
//
//   S.placeFills = { 'placeId:routineId': { add: ['1459', ...], _ts } }
//
// A stamped map (lib/sync-merge.js STAMPED_MAPS, mirrored in api/sync-stamps.js). It counts only
// while resting something still takes exercises out of that routine: take the limit away and the
// routine runs as written again.
//
// Suggestions come from a pool of about 300 well-known exercises (limits-data.js POOL), not from
// the whole library. What each touches is read from the rules and from an AI reviewer's reading
// of it (limits.js areasTouched): an area either of them names counts.
//
// An exercise is suggested only if her place has the kit for it, it is not already in the session,
// it does not work an area she said is sore today, and it leaves her limits alone: it neither loads
// nor involves any of them, and it is not from the part of the body around an area she rests. That
// last rule is wide on purpose, because the tags are rule-derived. Best first: a muscle the session
// lost that can still be trained, then the same part of the body, then core, then anywhere else.
import { EXIDX } from '../lib/exercises.js'
import { defaultConfig } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
import { SUBSTITUTE_FAMILIES } from '../lib/exercise-substitutes.js'
import { STARTER_PLANS } from '../../../api/coach/core/starter-plans.js'
import { limitsOf, areasTouched, POOL_IDS, REGION } from './limits.js'
import { areasOfExercise, checkinOf } from './checkin.js'
import { fitsPlace, kitOfPlace, routineAtPlace, NOT_A_LIFT, NEEDS_BALL } from './place-swaps.js'

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const list = v => (Array.isArray(v) ? v : [])

export const fillKey = (placeId, routineId) => `${placeId}:${routineId}`

/** What she has added to a routine at a place: ids, in the order she added them. */
export function fillOf(S, placeId, routineId) {
  const entry = isMap(S?.placeFills) ? S.placeFills[fillKey(placeId, routineId)] : null
  return isMap(entry) ? [...new Set(list(entry.add).filter(id => typeof id === 'string' && id))] : []
}
const cur = (map, key) => (isMap(map) && isMap(map[key]) ? list(map[key].add).filter(id => typeof id === 'string' && id) : [])
const stamped = (map, key, add, now) => ({ ...(isMap(map) ? map : {}), [key]: { add, _ts: now } })

/** S.placeFills with one more exercise added to the routine at that place. */
export const withFillAdded = (map, key, exId, now = Date.now()) => stamped(map, key, [...new Set([...cur(map, key), exId])], now)
/** S.placeFills with an added exercise taken out again. */
export const withFillRemoved = (map, key, exId, now = Date.now()) => stamped(map, key, cur(map, key).filter(id => id !== exId), now)

// Exercises people know: the built-in programmes and the reviewed substitute families come first.
const COMMON = new Set(Object.values(STARTER_PLANS).flatMap(p => p.routines.flatMap(r => r[3].map(x => x[0]))))
const REVIEWED = new Set(Object.values(SUBSTITUTE_FAMILIES).flat())
// Sets and reps only: no jumps, stretches, holds or drills.
const KINDS = new Set(['strength', 'calisthenics'])
const WHY = { 3: 'Same muscle as an exercise this session lost', 2: 'Same part of the body', 1: 'Core', 0: 'Another part of the body' }
// Whole-body and cardio work involves everything.
const EVERYWHERE = new Set(['full body', 'cardio'])

// The exercises resting an area has taken out of a routine, and her limits.
function lostIn(S, routine, place) {
  const rows = routineAtPlace(S, routine, place)
  const limits = limitsOf(S)
  const around = new Set(limits.filter(l => l.rest).flatMap(l => REGION[l.area] || []))
  return { rows, lost: rows.filter(r => r.rest && r.ex).map(r => r.ex), mine: { areas: limits.map(l => l.area), around } }
}
const sparesHer = (id, mine) => {
  const ex = EXIDX[id]
  return !!ex && !EVERYWHERE.has(ex.bp) && !mine.around.has(ex.bp) && !areasTouched(id).some(a => mine.areas.includes(a))
}

/**
 * Exercises she could add to a routine that resting an area has left short, best first:
 * [{ ex, why }]. Empty when nothing was taken out. No more than two for one muscle, three for core.
 */
export function fillSuggestions(S, routine, place, { n = 8, today = todayISO() } = {}) {
  if (!routine || !place) return []
  const { rows, lost, mine } = lostIn(S, routine, place)
  if (!lost.length) return []
  const running = new Set([...rows.flatMap(r => [r.cfg.id, r.to?.id]), ...fillOf(S, place.id, routine.id)].filter(Boolean))
  const said = checkinOf(S, today)
  const sore = new Set(said?.tiles?.sore ? said.areas : [])
  const targets = new Set(lost.map(e => e.tg).filter(Boolean))
  const parts = new Set(lost.map(e => e.bp).filter(Boolean))
  const { equipment } = kitOfPlace(place)
  const hasBall = equipment.includes('stability ball') || equipment.includes('bosu ball')
  const found = []
  for (const id of POOL_IDS) {
    const c = EXIDX[id]
    if (!c || !c.n || running.has(c.id) || !KINDS.has(c.cat)) continue
    const rank = targets.has(c.tg) ? 3 : parts.has(c.bp) ? 2 : c.bp === 'waist' ? 1 : 0
    if (NOT_A_LIFT.test(c.n) || /form check/i.test(c.n) || (!hasBall && NEEDS_BALL.test(c.n))) continue
    if (!sparesHer(c.id, mine) || !fitsPlace(c, place)) continue
    if (sore.size && areasOfExercise(c).some(a => sore.has(a))) continue
    found.push({ ex: c, rank, score: rank * 10 + (COMMON.has(c.id) ? 3 : 0) + (REVIEWED.has(c.id) ? 2 : 0) })
  }
  // The id as the last key: the same kit always gives the same suggestions.
  found.sort((a, b) => b.score - a.score || (a.ex.id < b.ex.id ? -1 : 1))
  const perMuscle = {}
  const out = []
  for (const f of found) {
    const k = f.ex.tg || f.ex.bp
    if ((perMuscle[k] = (perMuscle[k] || 0) + 1) > 2) continue
    // Core is a side dish: three at most, so the list has room for the rest of the body.
    if (f.rank === 1 && (perMuscle['#core'] = (perMuscle['#core'] || 0) + 1) > 3) continue
    out.push({ ex: f.ex, why: WHY[f.rank] })
    if (out.length >= n) break
  }
  return out
}

/**
 * What she added, as a session runs it: [{ id, sets, reps, mode, added: true }], three sets to
 * start with. Only while resting an area still takes something out of the routine, and
 * only what her place and her limits still allow. `taken` is ids the session already holds.
 */
export function fillEntries(S, routine, place, taken = new Set()) {
  if (!routine || !place) return []
  const add = fillOf(S, place.id, routine.id)
  if (!add.length) return []
  const { lost, mine } = lostIn(S, routine, place)
  if (!lost.length) return []
  return add.filter(id => EXIDX[id] && POOL_IDS.includes(id) && !taken.has(id) && sparesHer(id, mine) && fitsPlace(EXIDX[id], place)).map(id => {
    // A fresh config for it, without a starting weight: it starts from its own history, or light.
    const { weight, ...fresh } = defaultConfig(id)
    return { id, ...fresh, added: true }
  })
}
