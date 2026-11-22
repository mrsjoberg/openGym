// "Drop it for now": a session comes off the week while she rests an area, and comes back after.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setOverlay } from './brand.js'
import { effectiveRoutineIds } from '../lib/history.js'
import { weekTally } from '../lib/queue.js'
import { STAMPED_MAPS } from '../lib/sync-merge.js'
import { withLimit, withoutLimit } from './limits.js'
import { reviewList, undecidedCount, sessionCount, approveAll } from './place-swaps.js'
import { readDrop, dropOf, isDropped, canDrop, droppedList, dropSession, bringBack, settleDrops } from './drops.js'

beforeAll(() => setOverlay(true))
afterAll(() => setOverlay(null))

const gym = { id: 'gym', name: 'My gym', equipment: ['barbell', 'dumbbell', 'cable', 'leverage machine', 'sled machine', 'bench', 'adjustable bench', 'pull-up bar'], accV: 3 }
// Push / Pull / Legs as the built-in plan lays it out: Monday, Wednesday, Friday.
const routine = (id, name, ids) => ({ id, name, ex: ids.map(x => ({ id: x, sets: 3, reps: 10 })) })
const fresh = (limits = {}) => ({
  routines: [
    routine('push', 'Push Day', ['0025', '0047', '0426', '0334', '0241', '0251']),
    routine('pull', 'Pull Day', ['2330', '0027', '1323', '0031', '0313']),
    routine('legs', 'Leg Day', ['0043', '0085', '0739', '0585', '0586', '0605']),
  ],
  week: { 1: ['push'], 3: ['pull'], 5: ['legs'] },
  dayPlan: {}, workouts: [], queue: null, rotation: null, scheduleMode: null,
  bodyLimits: limits,
})
const rest = area => withLimit({}, area, { mode: 'avoid', rest: true }, '2026-11-22', 1)
const WED = '2026-11-25', TODAY = '2026-11-23'

describe('dropping a session', () => {
  it('takes it off its weekday and remembers where it sat', () => {
    const s = fresh(rest('elbow'))
    expect(canDrop(s, 'pull')).toBe(true)
    expect(dropSession(s, 'pull', 'elbow', 5)).toBe(true)
    expect(s.week).toEqual({ 1: ['push'], 5: ['legs'] })
    expect(s.sessionDrops.pull).toEqual({ days: { 3: 0 }, lim: 'elbow', _ts: 5 })
    expect(dropOf(s, 'pull')).toEqual({ days: { 3: 0 }, lim: 'elbow' })
    expect(isDropped(s, 'push')).toBe(false)
    // The routine itself is untouched: she can still start it by hand.
    expect(s.routines.map(r => r.id)).toEqual(['push', 'pull', 'legs'])
  })
  it('makes the week one training day fewer for everything that reads it', () => {
    const s = fresh(rest('elbow'))
    expect(effectiveRoutineIds(s, WED, TODAY)).toEqual(['pull'])
    expect(weekTally(s, TODAY).planned).toBe(3)
    dropSession(s, 'pull', 'elbow', 5)
    expect(effectiveRoutineIds(s, WED, TODAY)).toEqual([])
    expect(weekTally(s, TODAY).planned).toBe(2)
  })
  it('leaves the other routines of a shared day, and takes it off every day it sits on', () => {
    const s = fresh(rest('elbow'))
    s.week = { 1: ['push', 'pull'], 3: ['pull'], 5: ['legs', 'pull'] }
    dropSession(s, 'pull', 'elbow', 5)
    expect(s.week).toEqual({ 1: ['push'], 5: ['legs'] })
    expect(dropOf(s, 'pull').days).toEqual({ 1: 1, 3: 0, 5: 1 })
  })
  it('is not offered for a routine that is on no weekday, or in a plan that runs as a rotation', () => {
    const s = fresh(rest('elbow'))
    s.week = { 1: ['push'], 5: ['legs'] }
    expect(canDrop(s, 'pull')).toBe(false)
    expect(dropSession(s, 'pull', 'elbow', 5)).toBe(false)
    expect(s.sessionDrops).toBeUndefined()
    const r = { ...fresh(rest('elbow')), scheduleMode: 'rotation' }
    expect(canDrop(r, 'pull')).toBe(false)
    expect(dropSession(r, 'pull', 'elbow', 5)).toBe(false)
    expect(r.week[3]).toEqual(['pull'])
  })
  it('refuses an area that is not one', () => {
    const s = fresh(rest('elbow'))
    expect(dropSession(s, 'pull', 'spleen', 5)).toBe(false)
    expect(s.week[3]).toEqual(['pull'])
  })
  it('reads only a well-formed record', () => {
    expect(readDrop({ days: { 3: 0 }, lim: 'elbow', _ts: 1 })).toEqual({ days: { 3: 0 }, lim: 'elbow' })
    expect(readDrop({ days: { 9: 0, x: 1, 2: -4 }, lim: 'elbow' })).toEqual({ days: { 2: 0 }, lim: 'elbow' })
    expect(readDrop({ _ts: 9 })).toBe(null)
    expect(readDrop({ days: {}, lim: 'elbow' })).toBe(null)
    expect(readDrop(null)).toBe(null)
  })
})

describe('bringing it back', () => {
  it('puts it back where it was, and clears the record with a stamp', () => {
    const s = fresh(rest('elbow'))
    s.week = { 1: ['pull', 'push'], 3: ['pull'], 5: ['legs'] }
    dropSession(s, 'pull', 'elbow', 5)
    expect(bringBack(s, 'pull', 9)).toBe(true)
    expect(s.week).toEqual({ 1: ['pull', 'push'], 3: ['pull'], 5: ['legs'] })
    expect(s.sessionDrops.pull).toEqual({ _ts: 9 })
    expect(isDropped(s, 'pull')).toBe(false)
    expect(bringBack(s, 'pull', 10)).toBe(false)
  })
  it('sits beside what she has planned on that day since', () => {
    const s = fresh(rest('elbow'))
    dropSession(s, 'pull', 'elbow', 5)
    s.week[3] = ['legs']
    bringBack(s, 'pull', 9)
    expect(s.week[3]).toEqual(['pull', 'legs'])
  })
  it('ends by itself when she puts the routine back on a day herself', () => {
    const s = fresh(rest('elbow'))
    dropSession(s, 'pull', 'elbow', 5)
    s.week[2] = ['pull']
    expect(isDropped(s, 'pull')).toBe(false)
    expect(droppedList(s)).toEqual([])
    // Bringing it back then only clears the record: her own day stands, Wednesday stays free.
    bringBack(s, 'pull', 9)
    expect(s.week).toEqual({ 1: ['push'], 2: ['pull'], 5: ['legs'] })
  })
  it('only clears the record of a routine that no longer exists', () => {
    const s = fresh(rest('elbow'))
    dropSession(s, 'pull', 'elbow', 5)
    s.routines = s.routines.filter(r => r.id !== 'pull')
    expect(bringBack(s, 'pull', 9)).toBe(true)
    expect(s.week).toEqual({ 1: ['push'], 5: ['legs'] })
    expect(s.sessionDrops.pull).toEqual({ _ts: 9 })
  })
})

describe('when the limit changes', () => {
  it('stays dropped while she is still told to rest that area', () => {
    const s = fresh(rest('elbow'))
    dropSession(s, 'pull', 'elbow', 5)
    expect(settleDrops(s, 9)).toBe(0)
    expect(isDropped(s, 'pull')).toBe(true)
  })
  it('comes back with "It is better now"', () => {
    const s = fresh(rest('elbow'))
    dropSession(s, 'pull', 'elbow', 5)
    s.bodyLimits = withoutLimit(s.bodyLimits, 'elbow', 8)
    expect(settleDrops(s, 9)).toBe(1)
    expect(s.week).toEqual({ 1: ['push'], 3: ['pull'], 5: ['legs'] })
  })
  it('comes back when "told to rest" is changed to no, or the limit to Go easy', () => {
    for (const v of [{ mode: 'avoid', rest: false }, { mode: 'easy' }]) {
      const s = fresh(rest('elbow'))
      dropSession(s, 'pull', 'elbow', 5)
      s.bodyLimits = withLimit(s.bodyLimits, 'elbow', v, '2026-11-23', 8)
      expect(settleDrops(s, 9)).toBe(1)
      expect(s.week[3]).toEqual(['pull'])
    }
  })
  it('brings back only what was dropped for the area that got better', () => {
    const s = fresh({ ...rest('elbow'), ...rest('hip') })
    dropSession(s, 'pull', 'elbow', 5)
    dropSession(s, 'legs', 'hip', 6)
    s.bodyLimits = withoutLimit(s.bodyLimits, 'hip', 8)
    expect(settleDrops(s, 9)).toBe(1)
    expect(s.week).toEqual({ 1: ['push'], 5: ['legs'] })
    expect(droppedList(s).map(d => d.routine.id)).toEqual(['pull'])
  })
})

describe('the review', () => {
  it('has nothing left to ask about a dropped session', () => {
    const s = fresh(rest('elbow'))
    // Pull Day with an elbow at rest: nothing is left of it.
    expect(sessionCount(s, s.routines[1], gym)).toMatchObject({ total: 5, kept: 0, short: true })
    const before = undecidedCount(s, s.routines, gym)
    const asked = reviewList(s, [s.routines[2]], gym)[0].rows.filter(r => r.state === 'ask-rest').length
    expect(asked).toBeGreaterThan(0)
    dropSession(s, 'legs', 'elbow', 5)
    expect(reviewList(s, s.routines, gym).map(g => g.routine.id)).toEqual(['push', 'pull'])
    expect(undecidedCount(s, s.routines, gym)).toBe(before - asked)
    // "Approve all" writes nothing for it either.
    const all = approveAll({}, s, s.routines, gym, 1)
    expect(Object.keys(all).some(k => k.startsWith('gym:legs:'))).toBe(false)
  })
  it('lists what is dropped, in the order of her routines', () => {
    const s = fresh(rest('elbow'))
    dropSession(s, 'pull', 'elbow', 5)
    dropSession(s, 'push', 'elbow', 6)
    expect(droppedList(s).map(d => [d.routine.id, d.lim])).toEqual([['push', 'elbow'], ['pull', 'elbow']])
  })
})

describe('sync', () => {
  it('merges the drops per routine, like the other FitKat maps', () => {
    expect(STAMPED_MAPS).toContain('sessionDrops')
  })
})
