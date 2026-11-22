// Bone and balance: four weekly counts read off what she logged, and small finishers she can add.
//
//   Strength  days with at least three loaded lifts                      goal 2 a week
//   Impact    days with about 50 landings, or a brisk walk if she        goal 4
//             chose to count walking
//   Balance   days with at least one balance exercise                    goal 2
//   Posture   days with at least one back-strengthening exercise         goal 2
//
// The goals are the brief's defaults (fitkat-brief.md, with their sources) and hers to change.
// Which exercise counts for what is in bone-data.js: tags read by several AI models, not by a
// clinician (scripts/fitkat/bone). The screen counts work done and makes no medical claim.
//
// Everything she sets lives in one stamped map (lib/sync-merge.js STAMPED_MAPS, mirrored in
// api/sync-stamps.js):
//
//   S.bone = { 'goal:impact': { n: 3, _ts }, 'pref:walking': { on: true, _ts },
//              'walk:2026-11-22': { on: true, _ts }, 'add:balance': { on: true, _ts } }
//
// Finishers: a few minutes at the end of a session. Balance and posture go on as many of her
// training days as the goal asks, balance from the start of the week and posture from its end,
// so they share the load; the impact set goes on every training day up to its goal. The impact
// set opens only after eight strength days within four weeks (impact is introduced after a
// spell of resistance training), and is not offered while she has a knee, hip or ankle limit.
// A session that already holds an exercise of that kind gets no finisher for it.
import { EXIDX } from '../lib/exercises.js'
import { weekKey, weekStartOf, todayISO } from '../lib/format.js'
import { isWarmupRow } from '../lib/workout-model.js'
import { scheduleModeOf } from '../lib/rotation.js'
import { BALANCE, POSTURE, IMPACT } from './bone-data.js'
import { limitsOf } from './limits.js'

export const MEASURES = ['strength', 'impact', 'balance', 'posture']
export const GOAL_DEFAULT = { strength: 2, impact: 4, balance: 2, posture: 2 }
export const GOAL_MAX = 7
/** Loaded lifts that make a strength day, landings that make an impact day. */
export const STRENGTH_LIFTS = 3
export const LANDINGS = 50
/** The impact set opens after this many strength days within this many days. */
export const UNLOCK_DAYS = 8
export const UNLOCK_SPAN = 28
const LEG_AREAS = ['knee', 'hip', 'ankle']

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const list = v => (Array.isArray(v) ? v : [])
const read = (S, key) => (isMap(S?.bone) && isMap(S.bone[key]) ? S.bone[key] : null)
/** S.bone with one entry set: withBone(map, 'pref:walking', { on: true }). */
export const withBone = (map, key, value, now = Date.now()) => ({ ...(isMap(map) ? map : {}), [key]: { ...value, _ts: now } })

export function goalOf(S, measure) {
  const n = read(S, 'goal:' + measure)?.n
  return Number.isInteger(n) && n >= 1 && n <= GOAL_MAX ? n : GOAL_DEFAULT[measure]
}
export const withGoal = (map, measure, n, now = Date.now()) =>
  withBone(map, 'goal:' + measure, { n: Math.min(GOAL_MAX, Math.max(1, Math.round(Number(n) || 1))) }, now)
/** Whether a brisk walk counts as an impact day for her, and whether she ticked one on `iso`. */
export const walkingOn = S => read(S, 'pref:walking')?.on === true
export const walkedOn = (S, iso) => read(S, 'walk:' + iso)?.on === true
/** Whether she has added a finisher: 'balance', 'posture' or 'impact'. */
export const finisherOn = (S, kind) => read(S, 'add:' + kind)?.on === true

const BAL = new Set(BALANCE), POS = new Set(POSTURE)
export const isBalance = id => BAL.has(id)
export const isPosture = id => POS.has(id)
/** Impact through the legs: 0 none, 1 low, 2 moderate, 3 high. Landings count from moderate up. */
export const impactOf = id => IMPACT[id] || 0
/** A lift with something to lift: strength or Olympic work that is not body weight. */
export const isLoadedLift = id => { const ex = EXIDX[id]; return !!ex && (ex.cat === 'strength' || ex.cat === 'olympic') && ex.eq !== 'body weight' }

const work = entry => list(entry?.sets).filter(s => s && s.done && !isWarmupRow(s))
// One rep is one landing; timed work counts one a second, which is on the low side for a jog.
const landingsOf = entry => (impactOf(entry?.id) >= 2 ? work(entry).reduce((n, s) => n + (Number(s.r) > 0 ? Number(s.r) : Number(s.sec) > 0 ? Number(s.sec) : Number(s.min) > 0 ? Number(s.min) * 60 : 0), 0) : 0)

/** What one day's logged work adds up to: { lifts, landings, balance, posture }. */
export function dayWork(S, iso) {
  const lifts = new Set()
  let landings = 0, balance = false, posture = false
  for (const w of list(S?.workouts)) {
    if (w?.d !== iso) continue
    for (const e of list(w.entries)) {
      if (!e?.id || !work(e).length) continue
      if (isLoadedLift(e.id)) lifts.add(e.id)
      landings += landingsOf(e)
      if (isBalance(e.id)) balance = true
      if (isPosture(e.id)) posture = true
    }
  }
  return { lifts: lifts.size, landings, balance, posture }
}
/** Which measures a day counts for. */
export function dayCounts(S, iso) {
  const d = dayWork(S, iso)
  return {
    strength: d.lifts >= STRENGTH_LIFTS,
    impact: d.landings >= LANDINGS || (walkingOn(S) && walkedOn(S, iso)),
    balance: d.balance,
    posture: d.posture,
  }
}

const daysWithSomething = S => {
  const days = new Set(list(S?.workouts).map(w => w?.d).filter(Boolean))
  for (const k of Object.keys(isMap(S?.bone) ? S.bone : {})) if (k.startsWith('walk:')) days.add(k.slice(5))
  return [...days]
}

/** This week's counts: { strength: { done, goal }, impact: …, balance: …, posture: … }. */
export function boneWeek(S, today = todayISO()) {
  const ws = weekStartOf(S)
  const week = weekKey(today, ws)
  const out = Object.fromEntries(MEASURES.map(m => [m, { done: 0, goal: goalOf(S, m) }]))
  for (const iso of daysWithSomething(S)) {
    if (iso > today || weekKey(iso, ws) !== week) continue
    const c = dayCounts(S, iso)
    for (const m of MEASURES) if (c[m]) out[m].done++
  }
  return out
}
/** How many of the four goals are met this week. */
export const goalsMet = (S, today = todayISO()) => Object.values(boneWeek(S, today)).filter(x => x.done >= x.goal).length

const isoBack = (iso, days) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - days); return d.toISOString().slice(0, 10) }
/** Strength days in the four weeks up to and including `today`. */
export function recentStrengthDays(S, today = todayISO()) {
  const from = isoBack(today, UNLOCK_SPAN - 1)
  const days = new Set(list(S?.workouts).map(w => w?.d).filter(d => d && d >= from && d <= today))
  return [...days].filter(d => dayCounts(S, d).strength).length
}
/**
 * Where the impact set stands for her: { state: 'limit', area } while a knee, hip or ankle limit
 * is set, { state: 'locked', left } until the strength days are in, else { state: 'open' }.
 */
export function impactState(S, today = todayISO()) {
  const limit = limitsOf(S).find(l => LEG_AREAS.includes(l.area))
  if (limit) return { state: 'limit', area: limit.area }
  const left = UNLOCK_DAYS - recentStrengthDays(S, today)
  return left > 0 ? { state: 'locked', left } : { state: 'open' }
}

// ---- finishers ---------------------------------------------------------------------------------

/**
 * What each finisher is made of. Simple body-weight exercises every reader agreed on.
 * The impact set adds up to the 50 landings of an impact day.
 */
export const FINISHERS = {
  impact: [{ id: '3094', sets: 2, reps: 15, mode: 'reps' }, { id: '9408', sets: 2, reps: 10, mode: 'reps' }],   // jumping jack, repeated small jumps
  balance: [{ id: '3714', sets: 2, sec: 20, mode: 'time', side: true }, { id: '5970', sets: 2, reps: 12, mode: 'reps' }], // single leg stand, heel to toe walk
  posture: [{ id: '1241', sets: 2, reps: 10, mode: 'reps' }, { id: '5042', sets: 2, reps: 10, mode: 'reps' }],   // bird dog, lying prone W
}
export const FINISHER_KINDS = ['impact', 'balance', 'posture']
const tagged = { impact: id => impactOf(id) >= 2, balance: isBalance, posture: isPosture }

// Her training days in order, each the routines planned on it. A plan that runs as a rotation
// has no days: every routine is one.
function trainingDays(S) {
  const exists = id => list(S?.routines).some(r => r && r.id === id)
  if (scheduleModeOf(S) !== 'week') return list(S?.routines).filter(r => r && r.id).map(r => [r.id])
  const start = weekStartOf(S) === 0 ? 0 : 1
  const days = []
  for (let k = 0; k < 7; k++) {
    const ids = [].concat((isMap(S?.week) ? S.week : {})[(start + k) % 7] || []).filter(exists)
    if (ids.length) days.push(ids)
  }
  return days
}
/** The routines a finisher is added to, and on how many training days: { ids: Set, days }. */
export function finisherPlan(S, kind) {
  const days = trainingDays(S)
  const n = Math.min(days.length, goalOf(S, kind))
  const picked = kind === 'posture' ? days.slice(days.length - n) : days.slice(0, n)
  return { ids: new Set(picked.flat()), days: n }
}

/**
 * The routine with her finishers at its end, as a session runs it. The same object comes back
 * when there is nothing to add.
 */
export function withFinishers(S, routine, today = todayISO()) {
  if (!routine || !isMap(S?.bone) || !list(routine.ex).length) return routine
  const has = new Set(routine.ex.map(e => e && e.id))
  const extra = []
  for (const kind of FINISHER_KINDS) {
    if (!finisherOn(S, kind) || !finisherPlan(S, kind).ids.has(routine.id)) continue
    if (kind === 'impact' && impactState(S, today).state !== 'open') continue
    // The session already does this kind of work: nothing to add.
    if ([...has].some(id => tagged[kind](id))) continue
    for (const f of FINISHERS[kind]) {
      if (!EXIDX[f.id] || has.has(f.id)) continue
      extra.push({ ...f, weight: 0, bodyweight: true, prog: 'off', finisher: kind })
      has.add(f.id)
    }
  }
  return extra.length ? { ...routine, ex: [...routine.ex, ...extra] } : routine
}
