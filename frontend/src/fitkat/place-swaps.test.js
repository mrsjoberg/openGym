// Programmes fitted to a place: suggestions, the decisions she makes, and the routine a session runs.
import { describe, it, expect } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { buildSessionEntries } from '../lib/session-start.js'
import { mergeStates } from '../lib/sync-merge.js'
import {
  suggestSwaps, fitsPlace, routineAtPlace, routineForPlace, routineHere, fitOf, swapKey,
  withApproved, withDeclined, withSkipped, withCleared, decisionOf, readDecision,
} from './place-swaps.js'

const ACC = { accV: 3 }
const home = { id: 'home', name: 'Home', equipment: ['dumbbell', 'kettlebell', 'resistance band', 'band'], ...ACC }
const gym = { id: 'gym', name: 'My gym', equipment: ['barbell', 'dumbbell', 'cable', 'leverage machine', 'sled machine', 'smith machine', 'bench', 'adjustable bench', 'pull-up bar'], ...ACC }
const travel = { id: 'travel', name: 'Travel', equipment: [], ...ACC }

// "Lower body, glutes first", Lower A (routines/opengym/glutes-first.json).
const lowerA = { id: 'r1', name: 'Lower A', ex: [
  { id: '1060', sets: 4, reps: 10, rest: 120, weight: 60 },   // barbell hip thrust
  { id: '0085', sets: 3, reps: 10, rest: 120, weight: 50 },   // barbell romanian deadlift
  { id: '2290', sets: 3, reps: 10, rest: 90, note: 'Each leg.' }, // dumbbell bulgarian split squat
  { id: '1409', sets: 3, reps: 12, rest: 60 },                // barbell glute bridge
  { id: '0605', sets: 3, reps: 15, rest: 45 },                // lever standing calf raise
] }
const name = id => EXIDX[id]?.n

describe('what a place can do', () => {
  it('reads the kit off the equipment profile', () => {
    expect(fitsPlace(EXIDX['1060'], gym)).toBe(true)
    expect(fitsPlace(EXIDX['1060'], home)).toBe(false)
    expect(fitsPlace(EXIDX['2290'], home)).toBe(true)
    expect(fitsPlace(EXIDX['0605'], travel)).toBe(false)
  })
  it('never second-guesses an exercise the catalogue does not know', () => {
    expect(fitsPlace(null, home)).toBe(true)
  })
})

describe('suggestions', () => {
  it('offers the same lift on the kit she has, same target muscle', () => {
    const [first, second] = suggestSwaps(EXIDX['1060'], home)
    expect(first.ex.tg).toBe('glutes')
    expect(first.ex.n).toMatch(/hip thrust/)
    expect(fitsPlace(first.ex, home)).toBe(true)
    expect(first.sameMovement).toBe(true)
    expect(first.loose).toBe(false)
    expect(second.ex.id).not.toBe(first.ex.id)
    expect(second.ex.tg).toBe('glutes')
  })
  it('puts a reviewed family member first', () => {
    const [first] = suggestSwaps(EXIDX['0085'], home)
    expect(['1459', '4861']).toContain(first.ex.id)   // dumbbell or kettlebell romanian deadlift
  })
  it('keeps a loaded lift loaded when it can', () => {
    for (const id of ['1060', '0085', '1409', '0605']) expect(suggestSwaps(EXIDX[id], home)[0].ex.eq, name(id)).not.toBe('body weight')
  })
  it('never offers what is excluded: the routine\'s own exercises, what she declined', () => {
    const [first] = suggestSwaps(EXIDX['1060'], home)
    const again = suggestSwaps(EXIDX['1060'], home, { exclude: [first.ex.id] })
    expect(again.map(s => s.ex.id)).not.toContain(first.ex.id)
  })
  it('never swaps a lift for a jump or a stretch', () => {
    for (const id of ['1060', '0085', '1061', '0586', '0043']) for (const place of [home, travel])
      for (const s of suggestSwaps(EXIDX[id], place, { n: 3 })) expect(['plyometrics', 'stretching', 'mobility', 'yoga', 'cardio'], s.ex.n).not.toContain(s.ex.cat)
  })
  it('gives the same answer every time', () => {
    expect(suggestSwaps(EXIDX['0605'], home).map(s => s.ex.id)).toEqual(suggestSwaps(EXIDX['0605'], home).map(s => s.ex.id))
  })
  it('still finds something with no kit at all, and never a stretch', () => {
    const out = suggestSwaps(EXIDX['0085'], travel)
    expect(out.length).toBeGreaterThan(0)
    for (const s of out) { expect(s.ex.eq).toBe('body weight'); expect(s.ex.n).not.toMatch(/stretch|pose/) }
  })
})

describe('a routine at a place', () => {
  it('fits the gym as written and needs four swaps at home', () => {
    expect(fitOf({}, lowerA, gym)).toEqual({ total: 5, fits: 5, swaps: 0, undecided: 0, skipped: 0 })
    expect(fitOf({}, lowerA, home)).toEqual({ total: 5, fits: 1, swaps: 4, undecided: 4, skipped: 0 })
  })
  it('changes nothing until she approves', () => {
    const S = { placeSwaps: {} }
    expect(routineForPlace(S, lowerA, home)).toBe(lowerA)
    expect(routineAtPlace(S, lowerA, home).map(r => r.state)).toEqual(['pending', 'pending', 'fits', 'pending', 'pending'])
  })
  it('walks approve, suggest another, and after two refusals asks about skipping', () => {
    const key = swapKey('home', 'r1', '1409')
    let S = { placeSwaps: {} }
    const first = routineAtPlace(S, lowerA, home)[3].suggestion.ex.id
    S = { placeSwaps: withDeclined(S.placeSwaps, key, first, 1) }
    const row2 = routineAtPlace(S, lowerA, home)[3]
    expect(row2.state).toBe('pending')
    expect(row2.suggestion.ex.id).not.toBe(first)
    S = { placeSwaps: withDeclined(S.placeSwaps, key, row2.suggestion.ex.id, 2) }
    expect(routineAtPlace(S, lowerA, home)[3].state).toBe('ask-skip')
    expect(decisionOf(S, 'home', 'r1', '1409').declined).toEqual([first, row2.suggestion.ex.id])
    S = { placeSwaps: withSkipped(S.placeSwaps, key, 3) }
    expect(routineAtPlace(S, lowerA, home)[3].state).toBe('skipped')
    expect(routineForPlace(S, lowerA, home).ex.map(e => e.id)).toEqual(['1060', '0085', '2290', '0605'])
  })
  it('skipping at home leaves the gym plan alone', () => {
    const S = { placeSwaps: withSkipped({}, swapKey('home', 'r1', '1409'), 1) }
    expect(routineForPlace(S, lowerA, gym)).toBe(lowerA)
    expect(fitOf(S, lowerA, home)).toMatchObject({ skipped: 1, undecided: 3 })
  })
  it('carries sets, reps, rest and the note over, and not the bar\'s weight', () => {
    const S = { placeSwaps: withApproved({}, swapKey('home', 'r1', '1060'), '4742', 1) }
    const fitted = routineForPlace(S, lowerA, home)
    expect(fitted.ex[0]).toEqual({ id: '4742', swappedFrom: '1060', sets: 4, reps: 10, rest: 120 })
    expect(fitted.ex.slice(1)).toEqual(lowerA.ex.slice(1))
    expect(lowerA.ex[0].id).toBe('1060')
  })
  it('drops an approval the place can no longer do, and asks again', () => {
    const S = { placeSwaps: withApproved({}, swapKey('home', 'r1', '1060'), '4742', 1) }
    const noBells = { ...home, equipment: ['resistance band', 'band'] }
    expect(routineAtPlace(S, lowerA, noBells)[0].state).toBe('pending')
  })
  it('taking a decision back asks from the start', () => {
    const key = swapKey('home', 'r1', '1060')
    const S = { placeSwaps: withCleared(withSkipped(withDeclined({}, key, '4742', 1), key, 2), key, 3) }
    expect(readDecision(S.placeSwaps[key])).toBe(null)
    expect(routineAtPlace(S, lowerA, home)[0].state).toBe('pending')
  })
})

describe('the session she starts', () => {
  const base = { unit: 'kg', workouts: [], routines: [lowerA], equipProfiles: [gym, home], settings: {} }
  it('runs the approved replacement at home and the routine as written at the gym', () => {
    const placeSwaps = withApproved({}, swapKey('home', 'r1', '1060'), '4742', 1)
    const atHome = { ...base, placeSwaps, activeEquipId: 'home' }
    const atGym = { ...base, placeSwaps, activeEquipId: 'gym' }
    expect(routineHere(atHome, lowerA).ex[0].id).toBe('4742')
    expect(routineHere(atGym, lowerA)).toBe(lowerA)
    const entries = buildSessionEntries(atHome, lowerA)
    expect(entries[0].id).toBe('4742')
    expect(entries[0].swappedFrom).toBe('1060')
    expect(entries[0].sets.filter(s => !s.warmup).length).toBe(4)
    expect(buildSessionEntries(atGym, lowerA)[0].id).toBe('1060')
    expect(buildSessionEntries(atGym, lowerA)[0].swappedFrom).toBeUndefined()
  })
  it('is the routine untouched with no place at all', () => {
    expect(buildSessionEntries({ ...base, equipProfiles: [] }, lowerA).map(e => e.id)).toEqual(lowerA.ex.map(e => e.id))
  })
})

describe('sync', () => {
  it('merges decisions one by one, the newer edit of each winning', () => {
    const k1 = swapKey('home', 'r1', '1060'), k2 = swapKey('home', 'r1', '0085')
    const phone = { placeSwaps: { [k1]: { to: '4742', declined: [], _ts: 5 }, [k2]: { skip: true, declined: [], _ts: 1 } } }
    const laptop = { placeSwaps: { [k1]: { skip: true, declined: [], _ts: 2 }, [k2]: { to: '1459', declined: [], _ts: 9 } } }
    const merged = mergeStates(phone, laptop)
    expect(merged.placeSwaps[k1].to).toBe('4742')
    expect(merged.placeSwaps[k2].to).toBe('1459')
  })
})
