// "Drop it for now": a session that resting an area has left with little or nothing comes off her
// week until the area is better.
//
// Dropping takes the routine off its weekdays (S.week) and remembers where it sat:
//
//   S.sessionDrops = { [routineId]: { days: { 3: 0 }, lim: 'elbow', _ts } }
//
// `days` is weekday (0 Sunday to 6 Saturday) to the routine's position in that day's list; `lim`
// is the rested area it was dropped for. A stamped map (lib/sync-merge.js STAMPED_MAPS, mirrored
// in api/sync-stamps.js). An entry with nothing but its stamp is a session that came back.
//
// The week really is one training day fewer, so everything that reads it (Home, the week's count,
// reminders, the watch) follows without knowing about this file. The routine itself stays in her
// list: she can still start it by hand, or put it back on a day herself, which ends the drop.
//
// It comes back to the same weekdays when she says so ("Bring it back"), and by itself when she is
// no longer told to rest that area: "It is better now", or the answer changed to No (settleDrops,
// called wherever her limits are written). Only for a plan by weekday: a rotation runs by order,
// not by day, and is left alone.
import { scheduleModeOf } from '../lib/rotation.js'
import { AREAS, limitsOf } from './limits.js'

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const idsOn = (week, d) => [].concat(week?.[d] || [])
const onWeek = (S, routineId) => Object.keys(isMap(S?.week) ? S.week : {}).some(d => idsOn(S.week, d).includes(routineId))

/** A stored drop read back: { days, lim }, or null. */
export function readDrop(entry) {
  if (!isMap(entry) || !AREAS.includes(entry.lim) || !isMap(entry.days)) return null
  const days = {}
  for (const [d, at] of Object.entries(entry.days)) {
    if (/^[0-6]$/.test(d)) days[d] = Number.isInteger(at) && at >= 0 ? at : 0
  }
  return Object.keys(days).length ? { days, lim: entry.lim } : null
}

/**
 * The drop a routine is under, { days, lim }, or null. A routine she has put back on a weekday
 * herself is no longer dropped, whatever the record says.
 */
export function dropOf(S, routineId) {
  const d = readDrop(isMap(S?.sessionDrops) ? S.sessionDrops[routineId] : null)
  return d && !onWeek(S, routineId) ? d : null
}
export const isDropped = (S, routineId) => !!dropOf(S, routineId)

/** Whether a routine can be dropped: her plan runs by weekday, and it sits on one. */
export const canDrop = (S, routineId) => scheduleModeOf(S) === 'week' && onWeek(S, routineId)

/** The routines that are dropped now, in the order of her list: [{ routine, days, lim }]. */
export function droppedList(S) {
  const out = []
  for (const routine of Array.isArray(S?.routines) ? S.routines : []) {
    const d = dropOf(S, routine.id)
    if (d) out.push({ routine, ...d })
  }
  return out
}

/**
 * Take a routine off its weekdays, in place on a store draft, remembering them. A weekday that
 * empties loses its key (never store []). False, and nothing changed, when it cannot be dropped.
 */
export function dropSession(s, routineId, lim, now = Date.now()) {
  if (!AREAS.includes(lim) || !canDrop(s, routineId)) return false
  const days = {}
  for (const d of Object.keys(s.week)) {
    const ids = idsOn(s.week, d)
    const at = ids.indexOf(routineId)
    if (at < 0) continue
    days[d] = at
    const next = ids.filter(id => id !== routineId)
    if (next.length) s.week[d] = next; else delete s.week[d]
  }
  s.sessionDrops = { ...(isMap(s.sessionDrops) ? s.sessionDrops : {}), [routineId]: { days, lim, _ts: now } }
  return true
}

/**
 * Put a dropped routine back on its weekdays, in place on a store draft: at its old position, or
 * at the end of a day that has since got shorter, beside whatever she has planned there since. A
 * routine that no longer exists only has its record cleared. False when it was not dropped.
 */
export function bringBack(s, routineId, now = Date.now()) {
  const d = readDrop(isMap(s?.sessionDrops) ? s.sessionDrops[routineId] : null)
  if (!d) return false
  if ((Array.isArray(s.routines) ? s.routines : []).some(r => r.id === routineId) && !onWeek(s, routineId)) {
    s.week = isMap(s.week) ? s.week : {}
    for (const [day, at] of Object.entries(d.days)) {
      const ids = idsOn(s.week, day)
      ids.splice(Math.min(at, ids.length), 0, routineId)
      s.week[day] = ids
    }
  }
  s.sessionDrops = { ...s.sessionDrops, [routineId]: { _ts: now } }
  return true
}

/**
 * Bring back every session dropped for an area she is no longer told to rest, in place on a
 * store draft. Returns how many records it settled.
 */
export function settleDrops(s, now = Date.now()) {
  const resting = new Set(limitsOf(s).filter(l => l.rest).map(l => l.area))
  let n = 0
  for (const [id, entry] of Object.entries(isMap(s?.sessionDrops) ? s.sessionDrops : {})) {
    const d = readDrop(entry)
    if (d && !resting.has(d.lim) && bringBack(s, id, now)) n++
  }
  return n
}
