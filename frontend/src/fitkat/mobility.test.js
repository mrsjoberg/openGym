// The mobility block: two gentle moves for a Go easy area, in front of a session that loads it.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { buildSessionEntries } from '../lib/session-start.js'
import { setOverlay } from './brand.js'
import { AREAS, withLimit } from './limits.js'
import { routineForPlace, routineAtPlace, swapKey, withSkipped, approveAll } from './place-swaps.js'
import { MOBILITY, MOBILITY_REPS, mobilityEntries } from './mobility.js'

beforeAll(() => setOverlay(true))
afterAll(() => setOverlay(null))

const byName = n => Object.values(EXIDX).find(e => e && e.n === n)?.id
const SQUAT = byName('barbell full squat')
const BENCH = byName('barbell bench press')
const gym = { id: 'gym', name: 'My gym', equipment: ['barbell', 'dumbbell', 'cable', 'leverage machine', 'sled machine', 'bench', 'adjustable bench'], accV: 3 }
const legs = { id: 'legs', name: 'Leg Day', ex: [{ id: SQUAT, sets: 3, reps: 10 }] }
const push = { id: 'push', name: 'Push Day', ex: [{ id: BENCH, sets: 3, reps: 10 }] }
const lim = (area, mode, rest) => withLimit({}, area, { mode, rest }, '2026-11-22', 1)
// Her limits, with everything the review offers approved.
const agreed = (limits, routine = legs) => { const S = { bodyLimits: limits }; return { ...S, placeSwaps: approveAll({}, S, [routine], gym, 1) } }
const block = (limits, routine = legs) => routineForPlace(agreed(limits, routine), routine, gym).ex.filter(e => e.mobility)

describe('the lists', () => {
  it('cover every area with at least three moves that exist, and no move twice', () => {
    expect(Object.keys(MOBILITY).sort()).toEqual([...AREAS].sort())
    const all = Object.values(MOBILITY).flat()
    expect(new Set(all).size).toBe(all.length)
    for (const [area, ids] of Object.entries(MOBILITY)) {
      expect(ids.length, area).toBeGreaterThanOrEqual(3)
      for (const id of ids) {
        expect(EXIDX[id], id).toBeTruthy()
        expect(EXIDX[id].eq, id).toBe('body weight')
      }
    }
  })
})

describe('the block', () => {
  it('opens a session with an accepted Go easy exercise, with the first two moves of its list', () => {
    const ex = routineForPlace(agreed(lim('knee', 'easy')), legs, gym).ex
    expect(ex.slice(0, 2).map(e => e.id)).toEqual(MOBILITY.knee.slice(0, 2))
    expect(ex.slice(0, 2).every(e => e.mobility === 'knee' && e.sets === 1 && e.reps === MOBILITY_REPS && e.prog === 'off')).toBe(true)
    expect(ex.slice(2).some(e => e.mobility)).toBe(false)
  })
  it('is not added under Avoid, or when she was told to rest', () => {
    expect(block(lim('knee', 'avoid'))).toEqual([])
    expect(block(lim('knee', 'avoid', true))).toEqual([])
  })
  it('is not added to a session that does not load the area', () => {
    expect(block(lim('knee', 'easy'), push)).toEqual([])
    expect(routineForPlace(agreed(lim('knee', 'easy'), push), push, gym)).toBe(push)
  })
  it('waits for her answer: nothing changes before she has approved', () => {
    expect(routineForPlace({ bodyLimits: lim('knee', 'easy') }, legs, gym)).toBe(legs)
  })
  it('is not added once the exercises that load it are skipped', () => {
    const S = { bodyLimits: lim('knee', 'easy') }
    const skipped = { ...S, placeSwaps: withSkipped({}, swapKey('gym', 'legs', SQUAT), 1, 'knee') }
    expect(routineAtPlace(skipped, legs, gym)[0].state).toBe('skipped')
    expect(routineForPlace(skipped, legs, gym).ex).toEqual([])
  })
  it('gives each Go easy area its two, in the order of the areas', () => {
    const full = { id: 'full', name: 'Full Body', ex: [...legs.ex, ...push.ex] }
    const both = block({ ...lim('knee', 'easy'), ...lim('shoulder', 'easy') }, full)
    expect(both.map(e => e.mobility)).toEqual(['shoulder', 'shoulder', 'knee', 'knee'])
    expect(both.map(e => e.id)).toEqual([...MOBILITY.shoulder.slice(0, 2), ...MOBILITY.knee.slice(0, 2)])
  })
  it('takes a spare when a move is already in the session', () => {
    const S = agreed(lim('knee', 'easy'))
    const rows = routineAtPlace(S, legs, gym)
    const got = mobilityEntries(S, rows, new Set([MOBILITY.knee[0]]))
    expect(got.map(e => e.id)).toEqual([MOBILITY.knee[1], MOBILITY.knee[2]])
  })
})

describe('in a session', () => {
  it('runs as one set of ten, marked for its note, with nothing to progress', () => {
    const S = { unit: 'kg', workouts: [], routines: [legs], equipProfiles: [gym], activeEquipId: 'gym', settings: {}, ...agreed(lim('knee', 'easy')) }
    const entries = buildSessionEntries(S, legs)
    const first = entries[0]
    expect(first.id).toBe(MOBILITY.knee[0])
    expect(first.mobility).toBe('knee')
    expect(first.sets.map(s => s.r)).toEqual([MOBILITY_REPS])
    expect(first.plan.kind).toBe('off')
    expect(first.noProg).toBeUndefined()
    expect(entries.filter(e => e.mobility)).toHaveLength(2)
    expect(entries.at(-1).mobility).toBeUndefined()
  })
})
