// Today's list on Home: each exercise as she will run it, with what changed about it.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { setOverlay } from './brand.js'
import { withLimit } from './limits.js'
import { routineForPlace, approveAll } from './place-swaps.js'
import { amountOf, todayRows, todayMinutes } from './today.js'

beforeAll(() => setOverlay(true))
afterAll(() => setOverlay(null))

const byName = n => Object.values(EXIDX).find(e => e && e.n === n)?.id
const BENCH = byName('barbell bench press'), SQUAT = byName('barbell full squat')
const gym = { id: 'gym', name: 'My gym', equipment: ['barbell', 'dumbbell', 'cable', 'leverage machine', 'sled machine', 'bench', 'adjustable bench'], accV: 3 }
const home = { id: 'home', name: 'Home', equipment: ['dumbbell', 'kettlebell', 'band'], accV: 3 }
const push = { id: 'push', name: 'Push Day', ex: [{ id: BENCH, sets: 4, reps: 8 }] }
const legs = { id: 'legs', name: 'Leg Day', ex: [{ id: SQUAT, sets: 3, reps: 10 }] }
const day = '2026-11-22'
const kinds = rows => rows.map(r => r.tags.map(t => t.kind))

describe('amountOf', () => {
  it('reads sets and reps, or seconds for a hold', () => {
    expect(amountOf({ sets: 4, reps: 8 })).toBe('4 × 8')
    expect(amountOf({ sets: 2, mode: 'time', sec: 30 })).toBe('2 × 30 s')
    expect(amountOf({ sets: 3 })).toBe('3')
    expect(amountOf({})).toBe('1')
  })
})

describe('todayRows', () => {
  it('lists a plain session with no tags', () => {
    const rows = todayRows({}, [push], day)
    expect(rows.map(r => r.id)).toEqual([BENCH])
    expect(kinds(rows)).toEqual([[]])
  })
  it('marks a stand-in for missing kit as swapped', () => {
    const S = { placeSwaps: approveAll({}, {}, [push], home, 1) }
    const rows = todayRows(S, [routineForPlace(S, push, home)], day)
    expect(rows).toHaveLength(1)
    expect(rows[0].id).not.toBe(BENCH)
    expect(kinds(rows)).toEqual([['swapped']])
  })
  it('names the limit, not the swap, where a limit put the exercise there, and marks the mobility block', () => {
    const base = { bodyLimits: withLimit({}, 'knee', { mode: 'easy' }, day, 1) }
    const S = { ...base, placeSwaps: approveAll({}, base, [legs], gym, 1) }
    const rows = todayRows(S, [routineForPlace(S, legs, gym)], day)
    const flat = rows.flatMap(r => r.tags)
    expect(flat.filter(t => t.kind === 'mobility').map(t => t.area)).toEqual(['knee', 'knee'])
    expect(flat.some(t => t.kind === 'limit' && t.area === 'knee' && t.mode === 'easy')).toBe(true)
    expect(flat.some(t => t.kind === 'swapped')).toBe(false)
  })
  it('marks what works an area she said is sore today, on that day only', () => {
    const S = { dayForm: { [day]: { sleep: 4, energy: 4, sore: 2, stress: 4, soreAreas: ['chest'] } } }
    expect(kinds(todayRows(S, [push], day))).toEqual([['sore']])
    expect(kinds(todayRows(S, [legs], day))).toEqual([[]])
    expect(kinds(todayRows(S, [push], '2026-11-23'))).toEqual([[]])
  })
  it('marks finishers and what she added herself', () => {
    const r = { id: 'x', ex: [{ id: BENCH, sets: 3, reps: 8 }, { id: SQUAT, sets: 3, reps: 10, added: true }, { id: BENCH, sets: 2, mode: 'time', sec: 20, finisher: 'balance' }] }
    expect(kinds(todayRows({}, [r], day))).toEqual([[], ['added'], ['finisher']])
  })
  it('skips broken entries and survives an unknown exercise', () => {
    const rows = todayRows({}, [{ id: 'x', ex: [null, {}, { id: 'gone-123', sets: 2, reps: 5 }] }, null], day)
    expect(rows).toHaveLength(1)
    expect(rows[0].ex.missing).toBe(true)
  })
})

describe('todayMinutes', () => {
  it('is a round number of minutes that grows with the session', () => {
    const one = todayMinutes(todayRows({}, [push], day)), two = todayMinutes(todayRows({}, [push, legs], day))
    expect(one % 5).toBe(0)
    expect(one).toBeGreaterThanOrEqual(5)
    expect(two).toBeGreaterThan(one)
  })
})
