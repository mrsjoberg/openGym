import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { setOverlay } from './brand.js'
import { FLAGS, LISTS, WHYS } from './limits-data.js'
import { AREAS, limitsOf, withLimit, withoutLimit, limitOn, limitOffers, areasLoaded, areasTouched, restInvolved, readLimit, KEEP_EASIER, KEEP_SHORTER } from './limits.js'
import { routineAtPlace, routineForPlace, swapKey, withApproved, withKept, withDeclined, withSkipped, sessionCount, restCost, approveAll, fitOf, undecidedCount } from './place-swaps.js'

const byName = n => Object.values(EXIDX).find(e => e && e.n === n)?.id
const SQUAT = byName('barbell full squat')
const BENCH = byName('barbell bench press')
const BOX = byName('dumbbell goblet box squat')
const BW_BOX = byName('bodyweight box squat')
const QUARTER = byName('bodyweight quarter squat')
const THIGH_HOLD = byName('static quadriceps contraction (isometric)')
const names = offers => offers.map(o => (o.keep ? 'KEEP' : EXIDX[o.id].n))
const S = limits => ({ bodyLimits: limits })
const lim = (area, mode, rest) => withLimit({}, area, { mode, rest }, '2026-11-21', 1)

beforeAll(() => setOverlay(true))
afterAll(() => setOverlay(null))

describe('the data file', () => {
  it('names only exercises, lists and reasons that exist', () => {
    for (const [id, row] of Object.entries(FLAGS)) {
      expect(EXIDX[id], id).toBeTruthy()
      for (const v of Object.values(row)) if (typeof v === 'number') expect(LISTS[v], id).toBeTruthy()
    }
    for (const steps of LISTS) for (const [kind, body] of steps) {
      if (kind === 'a') { expect(WHYS[body]).toBeTruthy(); continue }
      expect(['r', 'h']).toContain(kind)
      for (const [id, why] of body) { expect(EXIDX[id], id).toBeTruthy(); expect(WHYS[why]).toBeTruthy() }
    }
  })
  it('puts a hold last, and no step twice', () => {
    for (const steps of LISTS) {
      const holds = steps.map(s => s[0] === 'h')
      expect(holds.indexOf(true) === -1 || holds.indexOf(true) === steps.length - 1).toBe(true)
    }
  })
  it('writes its reasons plainly, with no em dash', () => {
    for (const w of WHYS) expect(w).not.toMatch(/—/)
  })
})

describe('her limits', () => {
  it('reads a limit back, and only Avoid can carry "told to rest"', () => {
    expect(readLimit({ mode: 'easy', rest: true, since: '2026-11-21' })).toEqual({ mode: 'easy', rest: false, since: '2026-11-21' })
    expect(readLimit({ mode: 'avoid', rest: true })).toEqual({ mode: 'avoid', rest: true, since: '' })
    expect(readLimit({ _ts: 5 })).toBe(null)
    expect(readLimit({ mode: 'sometimes' })).toBe(null)
  })
  it('lists them in the order of the areas and keeps the day a limit was first set', () => {
    let m = withLimit({}, 'knee', { mode: 'easy' }, '2026-11-01', 1)
    m = withLimit(m, 'shoulder', { mode: 'avoid', rest: true }, '2026-11-02', 2)
    m = withLimit(m, 'knee', { mode: 'avoid' }, '2026-11-21', 3)
    expect(limitsOf(S(m))).toEqual([
      { area: 'shoulder', mode: 'avoid', rest: true, since: '2026-11-02' },
      { area: 'knee', mode: 'avoid', rest: false, since: '2026-11-01' },
    ])
    expect(m.knee._ts).toBe(3)
  })
  it('takes a limit away with a cleared entry, so the removal syncs', () => {
    const m = withoutLimit(lim('knee', 'easy'), 'knee', 9)
    expect(m.knee).toEqual({ _ts: 9 })
    expect(limitsOf(S(m))).toEqual([])
  })
  it('ignores an area it does not know', () => {
    expect(withLimit({}, 'toe', { mode: 'easy' })).toEqual({})
    expect(AREAS).toHaveLength(8)
  })
})

describe('what is flagged', () => {
  it('knows a squat loads the knee and the hip, and a bench press the shoulder', () => {
    expect(areasLoaded(SQUAT)).toEqual(expect.arrayContaining(['hip', 'knee']))
    expect(areasLoaded(BENCH)).toContain('shoulder')
  })
  it('lets no limit touch an exercise that does not load her area', () => {
    expect(limitOn(S(lim('knee', 'easy')), BENCH)).toBe(null)
    expect(limitOffers(S(lim('knee', 'easy')), BENCH)).toBe(null)
    expect(limitOn(S({}), SQUAT)).toBe(null)
  })
  it('lets told to rest win over Avoid, and Avoid over Go easy', () => {
    const both = { ...lim('knee', 'easy'), ...lim('hip', 'avoid') }
    expect(limitOn(S(both), SQUAT).area).toBe('hip')
    const rest = { ...lim('knee', 'avoid', true), ...lim('hip', 'avoid') }
    expect(limitOn(S(rest), SQUAT).area).toBe('knee')
  })
})

describe('what she is offered', () => {
  it('Go easy offers the first two steps of the ladder', () => {
    const o = limitOffers(S(lim('knee', 'easy')), SQUAT)
    expect(names(o.offers)).toEqual(['dumbbell goblet box squat', 'bodyweight quarter squat'])
    expect(o.offers[0].why).toMatch(/box at chair height or higher/)
  })
  it('Avoid offers every step after the first, the hold last', () => {
    const o = limitOffers(S(lim('knee', 'avoid')), SQUAT)
    expect(names(o.offers)).toEqual(['bodyweight quarter squat', 'static quadriceps contraction (isometric)'])
    expect(o.offers[1].hold).toBe(true)
  })
  it('told to rest offers nothing and says so', () => {
    const o = limitOffers(S(lim('knee', 'avoid', true)), SQUAT)
    expect(o).toMatchObject({ rest: true, offers: [] })
  })
  it('takes the first exercise of a step her place has the kit for', () => {
    const noDumbbells = ex => ex.eq !== 'dumbbell'
    const o = limitOffers(S(lim('knee', 'easy')), SQUAT, { fits: noDumbbells })
    expect(names(o.offers)).toEqual(['bodyweight box squat', 'bodyweight quarter squat'])
  })
  it('keeps positions fixed before the kit filter: Avoid never falls back to the first step', () => {
    const onlyDumbbells = ex => ex.eq === 'dumbbell'
    expect(limitOffers(S(lim('knee', 'avoid')), SQUAT, { fits: onlyDumbbells }).offers).toEqual([])
  })
  it('never offers what the routine already holds', () => {
    const o = limitOffers(S(lim('knee', 'easy')), SQUAT, { exclude: [BOX, BW_BOX] })
    expect(names(o.offers)).toEqual(['bodyweight quarter squat'])
  })
  it('never offers a step that loads another of her limits', () => {
    // The quarter squat is a squat: it loads the hip too.
    const both = { ...lim('knee', 'avoid'), ...lim('hip', 'easy') }
    const o = limitOffers(S(both), SQUAT)
    expect(o.limit.area).toBe('knee')
    for (const x of o.offers) if (x.id) expect(areasLoaded(x.id)).not.toContain('hip')
  })
  it('offers "Keep it, easier" under Go easy when nothing is left, and nothing under Avoid', () => {
    const nothing = () => false
    expect(limitOffers(S(lim('knee', 'easy')), SQUAT, { fits: nothing }).offers).toEqual([{ keep: true, why: KEEP_EASIER }])
    expect(limitOffers(S(lim('knee', 'avoid')), SQUAT, { fits: nothing }).offers).toEqual([])
  })
  it('sends jumping with a knee limit straight to the skip question, under Go easy too', () => {
    const jump = Object.keys(FLAGS).find(id => FLAGS[id].k === 'x')
    expect(limitOffers(S(lim('knee', 'easy')), jump).offers).toEqual([])
    expect(limitOffers(S(lim('knee', 'avoid')), jump).offers).toEqual([])
  })
  it('keeps a hold for a shorter time under Go easy', () => {
    const hold = Object.keys(FLAGS).find(id => Object.values(FLAGS[id]).includes('t'))
    const area = AREAS.find(a => areasLoaded(hold).includes(a) && FLAGS[hold][{ back: 'b' }[a] || a[0]] === 't')
    expect(limitOffers(S(lim(area, 'easy')), hold).offers).toEqual([{ keep: true, why: KEEP_SHORTER }])
  })
  it('keeps a machine press on the same machine first, and Avoid starts after it', () => {
    const machine = byName('lever chest press')
    const easy = limitOffers(S(lim('shoulder', 'easy')), machine).offers
    expect(easy[0]).toMatchObject({ keep: true })
    expect(easy[0].why).toMatch(/same machine/)
    expect(names(limitOffers(S(lim('shoulder', 'avoid')), machine).offers)[0]).toBe('push-up (wall)')
  })
  it('keeps a band exercise with a lighter band, then its hold, and never sends it to other kit', () => {
    const band = byName('band bench press')
    const easy = limitOffers(S(lim('shoulder', 'easy')), band).offers
    expect(easy[0].why).toMatch(/lighter band/)
    expect(easy[1].hold).toBe(true)
    expect(limitOffers(S(lim('shoulder', 'avoid')), band).offers).toHaveLength(1)
  })
})

describe('a routine under a limit', () => {
  const place = { id: 'home', name: 'Home', equipment: ['body weight', 'dumbbell'] }
  const routine = { id: 'r1', name: 'Lower A', ex: [{ id: SQUAT, sets: 3, reps: 8, rest: 120 }, { id: BENCH, sets: 3, reps: 8 }] }
  const key = swapKey('home', 'r1', SQUAT)
  const at = s => routineAtPlace(s, routine, place)[0]

  it('asks about the flagged exercise with the first step and its reason', () => {
    const row = at(S(lim('knee', 'easy')))
    expect(row.state).toBe('pending')
    expect(row.limit.area).toBe('knee')
    expect(row.suggestion.ex.id).toBe(BOX)
    expect(row.suggestion.why).toMatch(/box/)
  })
  it('moves one step down on "Suggest another", then asks whether to skip', () => {
    let s = S(lim('knee', 'easy'))
    s.placeSwaps = withDeclined({}, key, BOX, 1, 'knee')
    expect(at(s).suggestion.ex.id).toBe(QUARTER)
    s.placeSwaps = withDeclined(s.placeSwaps, key, QUARTER, 2, 'knee')
    expect(at(s).state).toBe('ask-skip')
  })
  it('runs the approved step: sets, reps and rest kept, the weight never inherited', () => {
    const s = { ...S(lim('knee', 'easy')), placeSwaps: withApproved({}, key, BOX, 1, 'knee') }
    expect(at(s)).toMatchObject({ state: 'approved' })
    const run = routineForPlace(s, { ...routine, ex: [{ id: SQUAT, sets: 3, reps: 8, rest: 120, weight: 60 }] }, place)
    expect(run.ex[0]).toEqual({ id: BOX, swappedFrom: SQUAT, limit: 'knee', sets: 3, reps: 8, rest: 120 })
  })
  it('runs a hold in seconds, with the sets but not the reps of the lift it stands in for', () => {
    const s = { ...S(lim('knee', 'avoid')), placeSwaps: withApproved({}, key, THIGH_HOLD, 1, 'knee') }
    const run = routineForPlace(s, routine, place)
    expect(run.ex[0]).toEqual({ id: THIGH_HOLD, swappedFrom: SQUAT, limit: 'knee', mode: 'time', sec: 30, sets: 3, rest: 120 })
  })
  it('keeps the exercise, marked, when she chooses "Keep it"', () => {
    const s = { ...S(lim('knee', 'easy')), placeSwaps: withKept({}, key, 'knee', 1) }
    expect(at(s)).toMatchObject({ state: 'approved', keep: true })
    expect(routineForPlace(s, routine, place).ex[0]).toEqual({ id: SQUAT, sets: 3, reps: 8, rest: 120, limit: 'knee' })
  })
  it('skips every flagged exercise when she was told to rest it, with nothing to decide', () => {
    const s = S(lim('knee', 'avoid', true))
    expect(at(s)).toMatchObject({ state: 'skipped', rest: true })
    expect(routineForPlace(s, routine, place).ex.map(e => e.id)).toEqual([BENCH])
  })
  it('never offers two exercises of one session the same replacement', () => {
    const incline = byName('barbell incline bench press')
    const two = { id: 'r2', name: 'Push', ex: [{ id: BENCH, sets: 3, reps: 8 }, { id: incline, sets: 3, reps: 8 }] }
    const s = S(lim('shoulder', 'avoid'))
    const first = routineAtPlace(s, two, place).map(r => r.suggestion.ex.id)
    expect(first[0]).not.toBe(first[1])
    // And once the first is approved, the second still does not get it.
    s.placeSwaps = withApproved({}, swapKey(place.id, 'r2', BENCH), first[0], 1, 'shoulder')
    const rows = routineAtPlace(s, two, place)
    expect(rows[0].state).toBe('approved')
    expect(rows[1].suggestion.ex.id).not.toBe(first[0])
  })
  it('counts what a session keeps while she rests an area, and calls it short under half', () => {
    const legs = { id: 'r3', name: 'Leg Day', ex: [SQUAT, byName('sled 45° leg press'), byName('lever leg extension'), BENCH].map(id => ({ id, sets: 3, reps: 10 })) }
    expect(sessionCount(S(lim('knee', 'avoid', true)), legs, place)).toEqual({ total: 4, kept: 1, resting: ['knee'], short: true })
    expect(sessionCount(S(lim('knee', 'avoid', true)), routine, place)).toMatchObject({ total: 2, kept: 1, short: true })
    expect(sessionCount(S(lim('knee', 'avoid')), legs, place)).toMatchObject({ kept: 4, resting: [], short: false })
  })
  it('says what resting an area would cost before she answers', () => {
    const legs = { id: 'r3', name: 'Leg Day', ex: [SQUAT, byName('sled 45° leg press'), byName('lever leg extension'), BENCH].map(id => ({ id, sets: 3, reps: 10 })) }
    const upper = { id: 'r4', name: 'Upper', ex: [{ id: BENCH, sets: 3, reps: 8 }] }
    // Asked while the limit is still only "Avoid": the answer is for "what if yes".
    expect(restCost(S(lim('knee', 'avoid')), [legs, upper], place, 'knee')).toEqual({ skipped: 3, short: [{ name: 'Leg Day', kept: 1, total: 4 }] })
    expect(restCost(S({}), [upper], place, 'knee')).toEqual({ skipped: 0, short: [] })
    expect(restCost(S({}), [legs], null, 'knee')).toEqual({ skipped: 0, short: [] })
  })
  it('leaves the routine as written until she has decided', () => {
    expect(routineForPlace(S(lim('knee', 'easy')), routine, place)).toBe(routine)
  })
  it('returns to the original when the limit is taken away', () => {
    const s = { bodyLimits: withoutLimit(lim('knee', 'easy'), 'knee', 5), placeSwaps: withApproved({}, key, BOX, 1, 'knee') }
    // The row is no longer a limit's: only the kit question is left, and the approved step is gone.
    expect(at(s).limit).toBeUndefined()
    expect(at(s).state).not.toBe('approved')
    expect(routineForPlace(s, routine, place)).toBe(routine)
  })
  it('does not let a decision made for the kit stand in for one about a limit, or the other way round', () => {
    const s = { ...S(lim('knee', 'easy')), placeSwaps: withSkipped({}, key, 1) }
    expect(at(s).state).toBe('pending')
  })
})

describe('an exercise that only involves an area she rests', () => {
  // A Romanian deadlift hangs from the hands: it involves the shoulder without loading it.
  const RDL = byName('barbell romanian deadlift')
  const gym = { id: 'gym', name: 'My gym', equipment: ['barbell', 'dumbbell', 'cable', 'leverage machine', 'bench', 'adjustable bench'], accV: 3 }
  const legs = { id: 'legs', name: 'Leg Day', ex: [{ id: RDL, sets: 3, reps: 10 }, { id: byName('lever lying leg curl'), sets: 3, reps: 12 }] }
  const key = swapKey('gym', 'legs', RDL)
  const row = s => routineAtPlace(s, legs, gym)[0]

  it('is found by what it touches, and only while she rests that area', () => {
    expect(areasLoaded(RDL)).not.toContain('shoulder')
    expect(areasTouched(RDL)).toContain('shoulder')
    expect(restInvolved(S(lim('shoulder', 'avoid', true)), RDL)).toMatchObject({ area: 'shoulder', rest: true })
    expect(restInvolved(S(lim('shoulder', 'avoid')), RDL)).toBe(null)
    expect(restInvolved(S(lim('shoulder', 'easy')), RDL)).toBe(null)
  })
  it('is not skipped: she is asked, and until she answers it stays in', () => {
    const s = S(lim('shoulder', 'avoid', true))
    expect(row(s)).toMatchObject({ state: 'ask-rest', involved: true })
    expect(routineAtPlace(s, legs, gym)[1].state).toBe('fits')
    expect(routineForPlace(s, legs, gym)).toBe(legs)
    expect(undecidedCount(s, [legs], gym)).toBe(1)
    expect(sessionCount(s, legs, gym)).toMatchObject({ total: 2, kept: 2, resting: [] })
  })
  it('keeps it when she says keep, with nothing changed in the session', () => {
    const s = { ...S(lim('shoulder', 'avoid', true)), placeSwaps: withKept({}, key, 'shoulder', 1) }
    expect(row(s).state).toBe('kept')
    expect(routineForPlace(s, legs, gym)).toBe(legs)
    expect(undecidedCount(s, [legs], gym)).toBe(0)
    expect(fitOf(s, legs, gym)).toMatchObject({ fits: 2, swaps: 0, undecided: 0 })
  })
  it('takes it out when she says skip', () => {
    const s = { ...S(lim('shoulder', 'avoid', true)), placeSwaps: withSkipped({}, key, 1, 'shoulder') }
    expect(row(s).state).toBe('skipped')
    expect(routineForPlace(s, legs, gym).ex.map(e => e.id)).toEqual([legs.ex[1].id])
  })
  it('is kept by "approve all"', () => {
    const s = S(lim('shoulder', 'avoid', true))
    s.placeSwaps = approveAll({}, s, [legs], gym, 5)
    expect(row(s).state).toBe('kept')
  })
  it('asks nothing once the limit is gone', () => {
    const s = { bodyLimits: withoutLimit(lim('shoulder', 'avoid', true), 'shoulder', 9), placeSwaps: withSkipped({}, key, 1, 'shoulder') }
    expect(row(s).state).toBe('fits')
  })
})
