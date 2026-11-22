// Under a limit an exercise opens lighter the first time and goes up only after two clean sessions in a row.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { isWarmupRow } from '../lib/workout-model.js'
import { buildSessionEntries } from '../lib/session-start.js'
import { setOverlay } from './brand.js'
import { withLimit } from './limits.js'
import { swapKey, withKept, approveAll, routineHere } from './place-swaps.js'
import { easeTarget, easyPlan } from './go-easy.js'

beforeAll(() => setOverlay(true))
afterAll(() => setOverlay(null))

const byName = n => Object.values(EXIDX).find(e => e && e.n === n)?.id
const BENCH = byName('barbell bench press')
const PUSHUP = byName('push-up')
const gym = { id: 'gym', name: 'My gym', equipment: ['barbell', 'dumbbell', 'cable', 'leverage machine', 'bench', 'adjustable bench'], accV: 3 }
const push = { id: 'push', name: 'Push Day', ex: [{ id: BENCH, sets: 3, reps: 10, weight: 20 }] }
const base = (routine = push) => ({ unit: 'kg', workouts: [], routines: [routine], equipProfiles: [gym], activeEquipId: 'gym', settings: {} })
const lim = (area, mode) => withLimit({}, area, { mode }, '2026-11-01', 1)
const kept = (S, routine, id, area) => ({ ...S, placeSwaps: withKept(S.placeSwaps, swapKey('gym', routine.id, id), area, 1) })

// One session of `routine`: built as the app builds it, every set ticked off (short of its reps
// when `miss`, at `weight` when the app had none to open with), then saved. Returns the new
// state and the entry that trained `id` or stood in for it.
let day = 0
function train(S, routine, id, { miss = false, weight } = {}) {
  const entries = buildSessionEntries(S, routine).map(e => ({
    ...e, sets: e.sets.map(s => ({ ...s, done: true, ...(weight != null && !s.w ? { w: weight } : {}), ...(miss && !isWarmupRow(s) ? { r: Math.max(1, s.r - 3) } : {}) })),
  }))
  const d = '2026-11-' + String(++day + 1).padStart(2, '0')
  const entry = entries.find(e => e.id === id || e.swappedFrom === id)
  return { S: { ...S, workouts: [...S.workouts, { d, routineId: routine.id, entries }] }, entry }
}
const open = S => buildSessionEntries(S, S.routines[0]).find(e => !e.mobility)
const work = e => e.sets.filter(s => !isWarmupRow(s))
const weights = e => [...new Set(work(e).map(s => s.w))]

describe('the lighter target', () => {
  it('is about 10% less, on a half-kilo or one-pound grid', () => {
    expect(easeTarget(20, 'kg')).toBe(18)
    expect(easeTarget(22.5, 'kg')).toBe(20.5)
    expect(easeTarget(100, 'lb')).toBe(90)
    expect(easeTarget(45, 'lb')).toBe(41)
  })
  it('is none when the grid cannot go lighter', () => {
    expect(easeTarget(2, 'kg')).toBe(null)
    expect(easeTarget(0, 'kg')).toBe(null)
  })
})

describe('an exercise she kept, easier', () => {
  // Two ordinary sessions first: 20, then 22.5.
  const before = () => {
    let S = base()
    S = train(S, push, BENCH).S
    const second = train(S, push, BENCH)
    expect(weights(second.entry)).toEqual([22.5])
    return second.S
  }
  const limited = () => kept({ ...before(), bodyLimits: lim('shoulder', 'easy') }, push, BENCH, 'shoulder')

  it('carries the label into the session', () => {
    expect(routineHere(limited(), push).ex.find(e => e.id === BENCH).limit).toBe('shoulder')
  })
  it('opens about 10% lighter the first time, at last time\'s reps, and says the target', () => {
    const e = open(limited())
    expect(e.plan.easy).toEqual({ kind: 'aim', weight: 20.5, unit: 'kg' })
    expect(weights(e)).toEqual([20.5])
    expect(work(e).map(s => s.r)).toEqual([10, 10, 10])
    expect(e.target.limit).toBe('shoulder')
    // The engine's own "why" line is gone: the note under the exercise explains instead.
    expect(e.plan.why).toBeUndefined()
  })
  it('then repeats that weight once, and goes up after two clean sessions in a row', () => {
    let S = limited()
    S = train(S, push, BENCH).S                       // 20.5, clean
    let e = open(S)
    expect(e.plan.easy).toEqual({ kind: 'again' })
    expect(weights(e)).toEqual([20.5])
    S = train(S, push, BENCH).S                       // 20.5 again, clean
    e = open(S)
    expect(e.plan.easy).toBeUndefined()
    expect(weights(e)).toEqual([23])
    S = train(S, push, BENCH).S                       // 23, clean
    expect(weights(open(S))).toEqual([23])
    expect(open(S).plan.easy).toEqual({ kind: 'again' })
    S = train(S, push, BENCH).S                       // 23 again, clean
    expect(weights(open(S))).toEqual([25.5])
  })
  it('follows the weight she really used, not the target', () => {
    let S = limited()
    const built = buildSessionEntries(S, push).map(e => ({ ...e, sets: e.sets.map(s => ({ ...s, done: true, ...(e.id === BENCH ? { w: 20 } : {}) })) }))
    S = { ...S, workouts: [...S.workouts, { d: '2026-12-01', routineId: 'push', entries: built }] }
    expect(weights(open(S))).toEqual([20])
    expect(open(S).plan.easy).toEqual({ kind: 'again' })
  })
  it('starts the count again after a session that fell short', () => {
    let S = limited()
    S = train(S, push, BENCH).S                       // 20.5, clean
    S = train(S, push, BENCH, { miss: true }).S       // 20.5 again, short of its reps
    let e = open(S)
    expect(weights(e)).toEqual([20.5])                // the engine's own answer to a miss
    expect(e.plan.easy).toBeUndefined()
    S = train(S, push, BENCH).S                       // clean once
    e = open(S)
    expect(e.plan.easy).toEqual({ kind: 'again' })    // one clean session is not two
    expect(weights(e)).toEqual([20.5])
    S = train(S, push, BENCH).S                       // clean twice
    expect(weights(open(S))).toEqual([23])
  })
  it('eases again when the limit comes back after a spell without it', () => {
    let S = limited()
    S = train(S, push, BENCH).S
    S = train(S, push, BENCH).S
    const free = { ...S, bodyLimits: {}, placeSwaps: {} }
    const without = train(free, push, BENCH)           // an ordinary session, no label
    expect(without.entry.target.limit).toBeUndefined()
    const back = kept({ ...without.S, bodyLimits: lim('shoulder', 'easy') }, push, BENCH, 'shoulder')
    expect(open(back).plan.easy.kind).toBe('aim')
  })
})

describe('without a label', () => {
  it('leaves the engine alone', () => {
    let S = base()
    S = train(S, push, BENCH).S
    const e = open(S)
    expect(e.plan.easy).toBeUndefined()
    expect(e.plan.kind).toBe('up')
    expect(weights(e)).toEqual([22.5])
    const plan = { policy: 'linear', kind: 'up', weight: 22.5 }
    expect(easyPlan(S, push.ex[0], push, plan)).toBe(plan)
  })
  it('does nothing when progression is off', () => {
    const plan = { policy: 'off', kind: 'off' }
    expect(easyPlan(base(), { ...push.ex[0], limit: 'shoulder' }, push, plan)).toBe(plan)
  })
})

describe('a replacement from a ladder, under Avoid', () => {
  it('has no lighter target, and also needs two clean sessions', () => {
    let S = { ...base(), bodyLimits: lim('shoulder', 'avoid') }
    S = { ...S, placeSwaps: approveAll({}, S, [push], gym, 1) }
    const first = train(S, push, BENCH, { weight: 10 })
    expect(first.entry.swappedFrom).toBe(BENCH)
    expect(first.entry.limit).toBe('shoulder')
    expect(first.entry.plan.easy).toBeUndefined()
    S = first.S
    let e = open(S)
    expect(e.plan.easy).toEqual({ kind: 'again' })
    expect(weights(e)).toEqual([10])
    S = train(S, push, BENCH).S
    e = open(S)
    expect(e.plan.easy).toBeUndefined()
    expect(weights(e)[0]).toBeGreaterThan(10)
  })
})

describe('body weight', () => {
  it('has no weight target, and repeats its numbers once before they move', () => {
    const floor = { id: 'floor', name: 'Floor', ex: [{ id: PUSHUP, sets: 3, reps: 8 }] }
    let S = kept({ ...base(floor), bodyLimits: lim('wrist', 'easy') }, floor, PUSHUP, 'wrist')
    expect(routineHere(S, floor).ex.find(e => e.id === PUSHUP).limit).toBe('wrist')
    const first = train(S, floor, PUSHUP)
    S = first.S
    const second = open(S)
    expect(second.plan.easy?.kind).not.toBe('aim')
    expect(work(second).map(s => s.r)).toEqual(work(first.entry).map(s => s.r))
  })
})
