// "Build your own": filling a session that resting an area left short.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { setOverlay } from './brand.js'
import { withLimit, withoutLimit, areasLoaded, poolTouches, POOL_IDS, REGION } from './limits.js'
import { fitsPlace, routineForPlace, sessionCount } from './place-swaps.js'
import { areasOfExercise } from './checkin.js'
import { fillKey, fillOf, fillSuggestions, fillEntries, withFillAdded, withFillRemoved } from './fills.js'

const byName = n => Object.values(EXIDX).find(e => e && e.n === n)?.id
const gym = { id: 'gym', name: 'My gym', equipment: ['barbell', 'dumbbell', 'cable', 'leverage machine', 'sled machine', 'bench', 'adjustable bench', 'pull-up bar'], accV: 3 }
const home = { id: 'home', name: 'Home', equipment: ['dumbbell'], accV: 3 }
// Push Day of Push / Pull / Legs.
const push = { id: 'push', name: 'Push Day', ex: ['0025', '0047', '0426', '0334', '0241', '0251'].map(id => ({ id, sets: 3, reps: 10 })) }
const rest = (area, more = {}) => ({ bodyLimits: withLimit({}, area, { mode: 'avoid', rest: true }, '2026-11-21', 1), ...more })
const key = fillKey('gym', 'push')

beforeAll(() => setOverlay(true))
afterAll(() => setOverlay(null))

describe('what she can add', () => {
  it('suggests nothing while nothing was taken out', () => {
    expect(fillSuggestions({}, push, gym)).toEqual([])
    expect(fillSuggestions({ bodyLimits: withLimit({}, 'shoulder', { mode: 'avoid' }, '', 1) }, push, gym)).toEqual([])
  })
  it('suggests exercises that spare her limits, fit her place and are not in the session', () => {
    const S = rest('shoulder')
    expect(sessionCount(S, push, gym).short).toBe(true)
    const got = fillSuggestions(S, push, gym)
    expect(got.length).toBeGreaterThan(3)
    for (const { ex, why } of got) {
      expect(POOL_IDS, ex.n).toContain(ex.id)
      expect(poolTouches(ex.id), ex.n).not.toContain('shoulder')
      // Nothing from around the shoulder at all, whatever the tags say.
      expect(REGION.shoulder, ex.n).not.toContain(ex.bp)
      expect(fitsPlace(ex, gym), ex.n).toBe(true)
      expect(push.ex.map(e => e.id)).not.toContain(ex.id)
      expect(['strength', 'calisthenics']).toContain(ex.cat)
      expect(why).toBeTruthy()
    }
  })
  it('puts core before the rest of the body, and gives no muscle more than two', () => {
    const got = fillSuggestions(rest('shoulder'), push, gym)
    expect(got[0].why).toBe('Core')
    expect(got.map(g => g.why)).toContain('Another part of the body')
    const per = {}
    for (const { ex } of got) per[ex.tg] = (per[ex.tg] || 0) + 1
    expect(Math.max(...Object.values(per))).toBeLessThanOrEqual(2)
  })
  it('keeps to the kit of the place', () => {
    for (const { ex } of fillSuggestions(rest('shoulder'), push, home)) expect(fitsPlace(ex, home), ex.n).toBe(true)
  })
  it('spares every one of her limits, not only the one she rests', () => {
    const S = { bodyLimits: withLimit(rest('shoulder').bodyLimits, 'elbow', { mode: 'easy' }, '', 2) }
    for (const { ex } of fillSuggestions(S, push, gym)) expect(poolTouches(ex.id), ex.n).not.toContain('elbow')
  })
  it('hides what works an area she said is sore today', () => {
    const today = '2026-11-21'
    const plain = fillSuggestions(rest('shoulder'), push, gym, { today })
    const area = areasOfExercise(plain[0].ex)[0]
    expect(area).toBeTruthy()
    const sore = rest('shoulder', { dayForm: { [today]: { sleep: 3, energy: 3, sore: 4, stress: 2, soreAreas: [area] } } })
    const got = fillSuggestions(sore, push, gym, { today })
    expect(got.map(g => g.ex.id)).not.toContain(plain[0].ex.id)
    for (const { ex } of got) expect(areasOfExercise(ex), ex.n).not.toContain(area)
    // It is a day's word: tomorrow nothing is hidden.
    expect(fillSuggestions(sore, push, gym, { today: '2026-11-22' })[0].ex.id).toBe(plain[0].ex.id)
  })
})

describe('what she added', () => {
  it('is kept per place and routine, in the order she added it', () => {
    let m = withFillAdded({}, key, '0001', 1)
    m = withFillAdded(m, key, '0002', 2)
    m = withFillAdded(m, key, '0001', 3)
    expect(fillOf({ placeFills: m }, 'gym', 'push')).toEqual(['0001', '0002'])
    expect(fillOf({ placeFills: withFillRemoved(m, key, '0001', 4) }, 'gym', 'push')).toEqual(['0002'])
    expect(fillOf({}, 'gym', 'push')).toEqual([])
  })
  it('runs at the end of the session, three sets, with no weight carried', () => {
    const S = rest('shoulder')
    const pick = fillSuggestions(S, push, gym)[0].ex.id
    S.placeFills = withFillAdded({}, key, pick, 1)
    const run = routineForPlace(S, push, gym)
    expect(run.ex[run.ex.length - 1]).toMatchObject({ id: pick, sets: 3, added: true })
    expect(run.ex[run.ex.length - 1].weight).toBeUndefined()
    expect(run.ex.length).toBe(sessionCount(S, push, gym).kept + 1)
  })
  it('goes when the limit goes: the routine runs as written again', () => {
    const S = rest('shoulder')
    const pick = fillSuggestions(S, push, gym)[0].ex.id
    const better = { bodyLimits: withoutLimit(S.bodyLimits, 'shoulder', 9), placeFills: withFillAdded({}, key, pick, 1) }
    expect(fillEntries(better, push, gym)).toEqual([])
    expect(routineForPlace(better, push, gym)).toBe(push)
  })
  it('drops an added exercise that a new limit of hers would load', () => {
    const S = rest('shoulder')
    const pick = fillSuggestions(S, push, gym)[0].ex.id
    const area = poolTouches(pick)[0]
    S.placeFills = withFillAdded({}, key, pick, 1)
    if (area) {
      S.bodyLimits = withLimit(S.bodyLimits, area, { mode: 'easy' }, '', 2)
      expect(fillEntries(S, push, gym).map(e => e.id)).not.toContain(pick)
    }
  })
})
