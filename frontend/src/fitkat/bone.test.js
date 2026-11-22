// Bone and balance: what a logged day counts for, the week's tally, the impact unlock, the finishers.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { STAMPED_MAPS } from '../lib/sync-merge.js'
import { buildSessionEntries } from '../lib/session-start.js'
import { isWarmupRow } from '../lib/workout-model.js'
import { setOverlay } from './brand.js'
import { BALANCE, POSTURE, IMPACT } from './bone-data.js'
import { withLimit } from './limits.js'
import { routineHere } from './place-swaps.js'
import {
  MEASURES, GOAL_DEFAULT, FINISHERS, UNLOCK_DAYS, goalOf, withGoal, withBone, walkingOn, walkedOn, finisherOn, isLoadedLift, impactOf,
  dayWork, dayCounts, boneWeek, goalsMet, recentStrengthDays, impactState, finisherPlan, withFinishers,
} from './bone.js'

beforeAll(() => setOverlay(true))
afterAll(() => setOverlay(null))

const byName = n => Object.values(EXIDX).find(e => e && e.n === n)?.id
const BENCH = byName('barbell bench press'), SQUAT = byName('barbell full squat'), ROW = byName('barbell bent over row'), CURL = byName('barbell curl')
const PUSHUP = byName('push-up'), JACK = byName('jumping jack'), BIRD = byName('bird dog'), STAND = byName('single leg stand')
const done = (id, sets) => ({ id, sets: sets.map(s => ({ done: true, ...s })) })
const lift = id => done(id, [{ w: 20, r: 10 }, { w: 20, r: 10 }])
const workout = (d, ...entries) => ({ d, entries })
const strengthDay = d => workout(d, lift(BENCH), lift(SQUAT), lift(ROW))
// Monday 16 to Sunday 22 November 2026.
const MON = '2026-11-16', TUE = '2026-11-17', WED = '2026-11-18', FRI = '2026-11-20', SUN = '2026-11-22'
const routine = (id, ids) => ({ id, name: id, ex: ids.map(x => ({ id: x, sets: 3, reps: 10 })) })
const plan = () => ({
  unit: 'kg', workouts: [], settings: {}, equipProfiles: [],
  routines: [routine('a', [BENCH, ROW]), routine('b', [SQUAT, CURL]), routine('c', [BENCH, SQUAT])],
  week: { 1: ['a'], 3: ['b'], 5: ['c'] },
})

describe('the tags', () => {
  it('name exercises that exist, each list once', () => {
    for (const ids of [BALANCE, POSTURE, Object.keys(IMPACT)]) {
      expect(new Set(ids).size).toBe(ids.length)
      for (const id of ids) expect(EXIDX[id], id).toBeTruthy()
    }
    for (const v of Object.values(IMPACT)) expect([1, 2, 3]).toContain(v)
  })
  it('put the obvious ones where they belong', () => {
    expect(BALANCE).toContain(STAND)
    expect(POSTURE).toContain(BIRD)
    expect(impactOf(JACK)).toBe(2)
    expect(impactOf(byName('jump squat'))).toBe(3)
    expect(impactOf(BENCH)).toBe(0)
    expect(BALANCE).not.toContain(BENCH)
    expect(POSTURE).not.toContain(ROW)
  })
})

describe('what a day counts for', () => {
  it('is a strength day with three loaded lifts, not with two, and not with body weight', () => {
    expect(isLoadedLift(BENCH)).toBe(true)
    expect(isLoadedLift(PUSHUP)).toBe(false)
    expect(dayCounts({ workouts: [strengthDay(MON)] }, MON).strength).toBe(true)
    expect(dayCounts({ workouts: [workout(MON, lift(BENCH), lift(SQUAT))] }, MON).strength).toBe(false)
    expect(dayCounts({ workouts: [workout(MON, lift(BENCH), lift(SQUAT), lift(PUSHUP))] }, MON).strength).toBe(false)
  })
  it('counts the same lift once, and two sessions of a day together', () => {
    const S = { workouts: [workout(MON, lift(BENCH), lift(BENCH)), workout(MON, lift(SQUAT), lift(ROW))] }
    expect(dayWork(S, MON).lifts).toBe(3)
  })
  it('counts only sets she ticked off, and never a warm-up', () => {
    const open = { id: BENCH, sets: [{ w: 20, r: 10, done: false }] }
    const warm = { id: SQUAT, sets: [{ w: 10, r: 10, done: true, warmup: true, phase: 'warmup' }] }
    expect(isWarmupRow(warm.sets[0])).toBe(true)
    expect(dayWork({ workouts: [workout(MON, open, warm, lift(ROW))] }, MON).lifts).toBe(1)
  })
  it('is an impact day at about 50 landings: a rep is a landing, timed work one a second', () => {
    const jacks = n => ({ workouts: [workout(MON, done(JACK, [{ r: n }, { r: n }]))] })
    expect(dayWork(jacks(25), MON).landings).toBe(50)
    expect(dayCounts(jacks(25), MON).impact).toBe(true)
    expect(dayCounts(jacks(20), MON).impact).toBe(false)
    expect(dayWork({ workouts: [workout(MON, done(JACK, [{ sec: 60 }]))] }, MON).landings).toBe(60)
  })
  it('does not count low impact as landings', () => {
    const MARCH = byName('marching on spot')
    expect(impactOf(MARCH)).toBe(1)
    expect(dayWork({ workouts: [workout(MON, done(MARCH, [{ r: 100 }]))] }, MON).landings).toBe(0)
  })
  it('is a balance or a posture day with one such exercise', () => {
    const S = { workouts: [workout(MON, done(STAND, [{ sec: 20 }])), workout(TUE, done(BIRD, [{ r: 10 }]))] }
    expect(dayCounts(S, MON)).toMatchObject({ balance: true, posture: false })
    expect(dayCounts(S, TUE)).toMatchObject({ balance: false, posture: true })
  })
})

describe('walking', () => {
  it('counts as an impact day only when she chose to count it, and ticked that day', () => {
    let S = { workouts: [], bone: withBone({}, 'walk:' + MON, { on: true }, 1) }
    expect(walkedOn(S, MON)).toBe(true)
    expect(dayCounts(S, MON).impact).toBe(false)
    S = { ...S, bone: withBone(S.bone, 'pref:walking', { on: true }, 2) }
    expect(walkingOn(S)).toBe(true)
    expect(dayCounts(S, MON).impact).toBe(true)
    expect(dayCounts(S, TUE).impact).toBe(false)
    expect(boneWeek(S, SUN).impact.done).toBe(1)
    S = { ...S, bone: withBone(S.bone, 'walk:' + MON, { on: false }, 3) }
    expect(boneWeek(S, SUN).impact.done).toBe(0)
  })
})

describe('the week', () => {
  it('starts from the defaults of the brief', () => {
    expect(GOAL_DEFAULT).toEqual({ strength: 2, impact: 4, balance: 2, posture: 2 })
    const w = boneWeek({ workouts: [] }, SUN)
    expect(MEASURES.map(m => [w[m].done, w[m].goal])).toEqual([[0, 2], [0, 4], [0, 2], [0, 2]])
  })
  it('counts this week only, up to today', () => {
    const S = { workouts: [strengthDay('2026-11-13'), strengthDay(MON), strengthDay(WED), strengthDay(FRI)] }
    expect(boneWeek(S, SUN).strength.done).toBe(3)
    expect(boneWeek(S, WED).strength.done).toBe(2)
    expect(goalsMet(S, SUN)).toBe(1)
  })
  it('follows a week that starts on Sunday', () => {
    const S = { weekStart: 0, workouts: [strengthDay('2026-11-15'), strengthDay(MON)] }
    expect(boneWeek(S, '2026-11-21').strength.done).toBe(2)
    expect(boneWeek({ workouts: S.workouts }, '2026-11-21').strength.done).toBe(1)
  })
  it('lets her change a goal, within one to seven days', () => {
    let bone = withGoal({}, 'impact', 3, 1)
    expect(goalOf({ bone }, 'impact')).toBe(3)
    expect(goalOf({ bone }, 'balance')).toBe(2)
    bone = withGoal(bone, 'impact', 12, 2)
    expect(goalOf({ bone }, 'impact')).toBe(7)
    expect(goalOf({ bone: { 'goal:impact': { n: 'x' } } }, 'impact')).toBe(4)
  })
})

describe('the impact set', () => {
  const trained = n => ({ workouts: Array.from({ length: n }, (_, k) => strengthDay('2026-11-' + String(22 - k * 3).padStart(2, '0'))) })
  it('opens after eight strength days within four weeks', () => {
    expect(impactState(trained(5), SUN)).toEqual({ state: 'locked', left: UNLOCK_DAYS - 5 })
    expect(recentStrengthDays(trained(8), SUN)).toBe(8)
    expect(impactState(trained(8), SUN)).toEqual({ state: 'open' })
  })
  it('does not count strength days older than four weeks', () => {
    const S = { workouts: [...trained(7).workouts, strengthDay('2026-10-01')] }
    expect(impactState(S, SUN)).toEqual({ state: 'locked', left: 1 })
  })
  it('is not offered with a knee, hip or ankle limit, whatever she has trained', () => {
    for (const area of ['knee', 'hip', 'ankle']) {
      const S = { ...trained(8), bodyLimits: withLimit({}, area, { mode: 'easy' }, MON, 1) }
      expect(impactState(S, SUN)).toEqual({ state: 'limit', area })
    }
    const S = { ...trained(8), bodyLimits: withLimit({}, 'shoulder', { mode: 'avoid' }, MON, 1) }
    expect(impactState(S, SUN)).toEqual({ state: 'open' })
  })
})

describe('finishers', () => {
  const on = (S, ...kinds) => ({ ...S, bone: kinds.reduce((m, k) => withBone(m, 'add:' + k, { on: true }, 1), S.bone) })
  const open = S => ({ ...S, workouts: Array.from({ length: 8 }, (_, k) => strengthDay('2026-11-' + String(22 - k * 3).padStart(2, '0'))) })
  const ids = r => r.ex.filter(e => e.finisher).map(e => [e.finisher, e.id])

  it('add up to an impact day, and exist in the catalogue', () => {
    expect(FINISHERS.impact.reduce((n, f) => n + f.sets * f.reps, 0)).toBe(50)
    for (const list of Object.values(FINISHERS)) for (const f of list) expect(EXIDX[f.id], f.id).toBeTruthy()
    expect(FINISHERS.impact.every(f => impactOf(f.id) >= 2)).toBe(true)
    expect(FINISHERS.balance.every(f => BALANCE.includes(f.id))).toBe(true)
    expect(FINISHERS.posture.every(f => POSTURE.includes(f.id))).toBe(true)
  })
  it('change nothing until she adds one', () => {
    const S = plan()
    expect(finisherOn(S, 'balance')).toBe(false)
    expect(withFinishers(S, S.routines[0], SUN)).toBe(S.routines[0])
    expect(routineHere(S, S.routines[0])).toBe(S.routines[0])
  })
  it('put balance on the first training days of the week and posture on the last, as many as the goal', () => {
    const S = on(plan(), 'balance', 'posture')
    expect([...finisherPlan(S, 'balance').ids]).toEqual(['a', 'b'])
    expect([...finisherPlan(S, 'posture').ids]).toEqual(['b', 'c'])
    expect(finisherPlan(S, 'balance').days).toBe(2)
    expect(ids(withFinishers(S, S.routines[0], SUN)).map(x => x[0])).toEqual(['balance', 'balance'])
    expect(ids(withFinishers(S, S.routines[1], SUN)).map(x => x[0])).toEqual(['balance', 'balance', 'posture', 'posture'])
    expect(ids(withFinishers(S, S.routines[2], SUN)).map(x => x[0])).toEqual(['posture', 'posture'])
  })
  it('follow the goal she set', () => {
    const S = on(plan(), 'balance')
    const more = { ...S, bone: withGoal(S.bone, 'balance', 3, 2) }
    expect([...finisherPlan(more, 'balance').ids]).toEqual(['a', 'b', 'c'])
    const five = { ...S, bone: withGoal(S.bone, 'balance', 5, 2) }
    expect(finisherPlan(five, 'balance').days).toBe(3)
  })
  it('add the impact set to every training day once it is open, and not before', () => {
    const locked = on(plan(), 'impact')
    expect(ids(withFinishers(locked, locked.routines[0], SUN))).toEqual([])
    const S = open(locked)
    for (const r of S.routines) expect(ids(withFinishers(S, r, SUN))).toEqual(FINISHERS.impact.map(f => ['impact', f.id]))
    const limited = { ...S, bodyLimits: withLimit({}, 'knee', { mode: 'easy' }, MON, 1) }
    expect(ids(withFinishers(limited, limited.routines[0], SUN))).toEqual([])
  })
  it('skip a session that already holds that kind of work', () => {
    const S = on(plan(), 'balance')
    const own = { ...S.routines[0], ex: [...S.routines[0].ex, { id: STAND, sets: 2, sec: 20, mode: 'time' }] }
    expect(withFinishers(S, own, SUN)).toBe(own)
  })
  it('take every routine as a day when the plan runs as a rotation', () => {
    const S = on({ ...plan(), week: {}, scheduleMode: 'rotation' }, 'balance')
    expect([...finisherPlan(S, 'balance').ids]).toEqual(['a', 'b'])
  })
  it('run in a session at the end, marked, with nothing to progress', () => {
    const S = on(plan(), 'balance')
    const entries = buildSessionEntries(S, S.routines[0])
    expect(entries.map(e => e.id)).toEqual([BENCH, ROW, ...FINISHERS.balance.map(f => f.id)])
    const [stand, walk] = entries.slice(2)
    expect(stand.finisher).toBe('balance')
    expect(stand.plan.kind).toBe('off')
    expect(stand.sets.filter(s => !isWarmupRow(s)).every(s => s.sec === 20 || s.sides)).toBe(true)
    expect(walk.sets.map(s => s.r)).toEqual([12, 12])
    expect(entries[0].finisher).toBeUndefined()
  })
})

describe('sync', () => {
  it('merges what she set entry by entry', () => {
    expect(STAMPED_MAPS).toContain('bone')
  })
})
