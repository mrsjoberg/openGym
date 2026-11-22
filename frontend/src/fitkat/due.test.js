// A session's open questions, session by session, in the order she will meet them.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { setOverlay } from './brand.js'
import { withLimit } from './limits.js'
import { approveAll, swapKey, withSkipped, undecidedCount } from './place-swaps.js'
import { dueBySession, dueCount, dueTotal } from './due.js'

beforeAll(() => setOverlay(true))
afterAll(() => setOverlay(null))

const byName = n => Object.values(EXIDX).find(e => e && e.n === n)?.id
const SQUAT = byName('barbell full squat'), PRESS = byName('sled 45° leg press'), BENCH = byName('barbell bench press'), CURL = byName('dumbbell hammer curl')
const gym = { id: 'gym', name: 'My gym', equipment: ['barbell', 'dumbbell', 'cable', 'leverage machine', 'sled machine', 'bench', 'adjustable bench'], accV: 3 }
const home = { id: 'home', name: 'Home', equipment: ['dumbbell', 'kettlebell', 'band'], accV: 3 }
const push = { id: 'push', name: 'Push Day', ex: [{ id: BENCH, sets: 4, reps: 8 }, { id: CURL, sets: 3, reps: 10 }] }
const legs = { id: 'legs', name: 'Leg Day', ex: [{ id: SQUAT, sets: 4, reps: 8 }, { id: PRESS, sets: 3, reps: 12 }] }
const spare = { id: 'spare', name: 'Spare', ex: [{ id: SQUAT, sets: 3, reps: 8 }] }
// Monday push, Friday legs, "Spare" on no day. 22 November 2026 is a Sunday.
const plan = more => ({
  dayPlan: {}, queue: null, routines: [legs, push, spare], week: { 1: ['push'], 5: ['legs'] }, workouts: [], equipProfiles: [gym, home], activeEquipId: 'gym', equipFilterOn: true,
  bodyLimits: withLimit({}, 'knee', { mode: 'easy' }, '2026-11-22', 1), ...more,
})
const SUNDAY = '2026-11-22'

describe('dueBySession', () => {
  it('lists only sessions with a question, on the first day each is planned for, soonest first, and a session on no day last', () => {
    const due = dueBySession(plan(), gym, SUNDAY)
    // Push Day has nothing to ask at the gym with a knee limit. Leg Day comes on Friday; Spare has no day.
    expect(due.map(g => [g.routine.id, g.count, g.iso, g.weekday])).toEqual([['legs', 2, '2026-11-27', 5], ['spare', 1, null, null]])
    expect(dueTotal(due)).toBe(3)
  })
  it('puts today first, and a kit question counts like a limit question', () => {
    const S = plan({ activeEquipId: 'home' })
    const monday = dueBySession(S, home, '2026-11-23')
    expect(monday[0]).toMatchObject({ routine: { id: 'push' }, iso: '2026-11-23', weekday: 1 })
    expect(monday.map(g => g.routine.id)).toEqual(['push', 'legs', 'spare'])
    expect(dueTotal(monday)).toBe(undecidedCount(S, S.routines, home))
  })
  it('drops a session once its questions are answered, whichever way', () => {
    let S = plan()
    S = { ...S, placeSwaps: approveAll({}, S, [legs], gym, 1) }
    expect(dueBySession(S, gym, SUNDAY).map(g => g.routine.id)).toEqual(['spare'])
    S = { ...S, placeSwaps: withSkipped(S.placeSwaps, swapKey('gym', 'spare', SQUAT), 2, 'knee') }
    expect(dueBySession(S, gym, SUNDAY)).toEqual([])
  })
  it('is empty with no place, no plan or no limit and full kit', () => {
    expect(dueBySession(plan(), null, SUNDAY)).toEqual([])
    expect(dueBySession({}, gym, SUNDAY)).toEqual([])
    expect(dueBySession(plan({ bodyLimits: {} }), gym, SUNDAY)).toEqual([])
    expect(dueTotal(null)).toBe(0)
  })
})

describe('dueCount', () => {
  it('counts the questions of the session she is starting, at the place she is at', () => {
    expect(dueCount(plan(), ['legs'])).toBe(2)
    expect(dueCount(plan(), ['push'])).toBe(0)
    expect(dueCount(plan(), ['legs', 'spare'])).toBe(3)
    // At home the bench press has no kit.
    expect(dueCount(plan({ activeEquipId: 'home' }), ['push'])).toBeGreaterThan(0)
  })
  it('is nothing for a freestyle start, an unknown routine, or with no place', () => {
    expect(dueCount(plan(), [])).toBe(0)
    expect(dueCount(plan(), null)).toBe(0)
    expect(dueCount(plan(), ['nope'])).toBe(0)
    expect(dueCount(plan({ equipProfiles: [], activeEquipId: null }), ['legs'])).toBe(0)
  })
  it('is nothing once she has answered: the session is not asked about twice', () => {
    const S = plan()
    expect(dueCount({ ...S, placeSwaps: approveAll({}, S, [legs], gym, 1) }, ['legs'])).toBe(0)
  })
})
