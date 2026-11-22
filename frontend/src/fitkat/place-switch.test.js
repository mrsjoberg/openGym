// Moving between places: what it would ask of a session, and the Places page's counts.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { setOverlay } from './brand.js'
import { approveAll, routineAtPlace, skippedKeys, swapKey, switchCost, withRestored, withSkipped } from './place-swaps.js'

beforeAll(() => setOverlay(true))
afterAll(() => setOverlay(null))

const byName = n => Object.values(EXIDX).find(e => e && e.n === n)?.id
const BENCH = byName('barbell bench press'), CURL = byName('dumbbell hammer curl')
const gym = { id: 'gym', name: 'My gym', equipment: ['barbell', 'dumbbell', 'cable', 'leverage machine', 'sled machine', 'bench', 'adjustable bench'], accV: 3 }
const home = { id: 'home', name: 'Home', equipment: ['dumbbell', 'kettlebell', 'band'], accV: 3 }
const push = { id: 'push', name: 'Push Day', ex: [{ id: BENCH, sets: 4, reps: 8 }, { id: CURL, sets: 3, reps: 10 }] }

describe('switchCost', () => {
  it('asks nothing of a session the place can run as written', () => {
    expect(switchCost({}, [push], gym)).toEqual({ need: 0, fits: 2 })
  })
  it('counts what needs a swap and what already fits', () => {
    expect(switchCost({}, [push], home)).toEqual({ need: 1, fits: 1 })
  })
  it('needs nothing once the swap is approved, and survives an empty or broken list', () => {
    const S = { placeSwaps: approveAll({}, {}, [push], home, 1) }
    expect(switchCost(S, [push], home)).toEqual({ need: 0, fits: 1 })
    expect(switchCost({}, [], home)).toEqual({ need: 0, fits: 0 })
    expect(switchCost({}, [null], home)).toEqual({ need: 0, fits: 0 })
  })
})

describe('skipped exercises at a place', () => {
  const key = swapKey('home', 'push', BENCH)
  const S = { placeSwaps: withSkipped({}, key, 1) }
  it('are listed by their key, and only where she skipped', () => {
    expect(skippedKeys(S, [push], home)).toEqual([key])
    expect(skippedKeys({}, [push], home)).toEqual([])
    expect(skippedKeys(S, [push], gym)).toEqual([])
  })
  it('are asked about again once restored', () => {
    const back = { placeSwaps: withRestored(S.placeSwaps, skippedKeys(S, [push], home), 2) }
    expect(skippedKeys(back, [push], home)).toEqual([])
    expect(routineAtPlace(back, push, home).find(r => r.cfg.id === BENCH).state).toBe('pending')
    expect(switchCost(back, [push], home).need).toBe(1)
  })
})
