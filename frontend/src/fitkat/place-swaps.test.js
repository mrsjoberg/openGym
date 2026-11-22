// Programmes fitted to a place: suggestions, the decisions she makes, and the routine a session runs.
import { describe, it, expect } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { buildSessionEntries } from '../lib/session-start.js'
import { STARTER_PLANS } from '../../../api/coach/core/starter-plans.js'
import { PRESETS } from './places.js'
import { withLimit } from './limits.js'
import { mergeStates } from '../lib/sync-merge.js'
import {
  suggestSwaps, fitsPlace, routineAtPlace, routineForPlace, routineHere, fitOf, swapKey,
  withApproved, withChosen, withDeclined, withSkipped, withCleared, decisionOf, readDecision,
  reviewList, undecidedCount, swappedCount, approveAll, FORM_CHECK, questionIndex, rowSig,
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
  it('never offers a demonstration of form in place of an exercise', () => {
    const all = Object.values(EXIDX).filter(Boolean)
    expect(all.filter(e => FORM_CHECK.test(e.n)).length).toBeGreaterThan(20)
    // Whatever the kit, across every exercise of the built-in plan and the lifts the form checks show.
    for (const id of ['1060', '0085', '2290', '1409', '0605', '1061', '0586', '0043', '0025']) for (const place of [home, gym, travel])
      for (const s of suggestSwaps(EXIDX[id], place, { n: 40 })) expect(s.ex.n).not.toMatch(FORM_CHECK)
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

describe('no replacement twice in one session', () => {
  const basics = { id: 'home', name: 'Home', equipment: PRESETS.home(), accV: 3 }
  const all = Object.values(STARTER_PLANS).flatMap(p => p.routines.map(([id, rname, , rows]) => ({ id, name: rname, ex: rows.map(([x, sets, n, kind]) => (kind === 'time' ? { id: x, sets, mode: 'time', sec: n } : { id: x, sets, reps: n })) })))
  const states = [{}, ...['shoulder', 'back', 'hip'].map(a => ({ bodyLimits: withLimit({}, a, { mode: 'avoid', rest: true }, '2026-11-22', 1) }))]
  const ran = (S, routine, place) => routineForPlace(S, routine, place).ex.map(e => e.id)

  it('offers every exercise of a session something different, in every built-in programme, with and without a rested area', () => {
    for (const S of states) for (const routine of all) for (const place of [basics, travel]) {
      const offered = routineAtPlace(S, routine, place).filter(r => r.state === 'pending' && !r.suggestion.keep).map(r => r.suggestion.ex.id)
      expect(new Set(offered).size, routine.name + ' at ' + place.name).toBe(offered.length)
      // And "Approve all" leaves no exercise in the session twice.
      const run = ran({ ...S, placeSwaps: approveAll({}, S, [routine], place, 1) }, routine, place)
      expect(new Set(run).size, routine.name + ' at ' + place.name).toBe(run.length)
    }
  }, 60000)
  it('takes the next suggestion for the second of two alike, and again once the first is approved', () => {
    // With a rested shoulder at home the leg press and the leg extension both came out as the band leg extension.
    const S = states[1]
    const legs = all.find(r => { const o = routineAtPlace(S, r, basics); return o.some(x => x.cfg.id === '0739') && o.some(x => x.cfg.id === '0585') })
    const pair = s => routineAtPlace(s, legs, basics).filter(r => r.cfg.id === '0739' || r.cfg.id === '0585')
    const [a, b] = pair(S)
    expect(a.state).toBe('pending'); expect(b.state).toBe('pending')
    expect(b.suggestion.ex.id).not.toBe(a.suggestion.ex.id)
    const approved = { ...S, placeSwaps: withApproved({}, swapKey('home', legs.id, a.cfg.id), a.suggestion.ex.id, 1) }
    expect(pair(approved)[0].state).toBe('approved')
    expect(pair(approved)[1].suggestion.ex.id).not.toBe(a.suggestion.ex.id)
  })
  it('asks the later one again when both were approved onto the same exercise before this rule', () => {
    const two = { id: 'r9', name: 'Lower', ex: [{ id: '1060', sets: 3, reps: 10 }, { id: '1409', sets: 3, reps: 10 }] }
    const to = suggestSwaps(EXIDX['1060'], home, { exclude: ['1060', '1409'], n: 1 })[0].ex.id
    let m = withApproved({}, swapKey('home', 'r9', '1060'), to, 1)
    m = withApproved(m, swapKey('home', 'r9', '1409'), to, 2)
    const [first, second] = routineAtPlace({ placeSwaps: m }, two, home)
    expect(first).toMatchObject({ state: 'approved', to: { id: to } })
    expect(second.state).toBe('pending')
    expect(second.suggestion.ex.id).not.toBe(to)
    expect(ran({ placeSwaps: m }, two, home).filter(id => id === to)).toHaveLength(1)
  })
})

describe('asked once: the same exercise in several sessions', () => {
  // The hip thrust is in both; Lower B also holds what the hip thrust is first offered at home.
  const first = suggestSwaps(EXIDX['1060'], home, { exclude: ['1060'], n: 1 })[0].ex.id
  const a = { id: 'a', name: 'Lower A', ex: [{ id: '1060', sets: 4, reps: 10 }, { id: '0605', sets: 3, reps: 15 }] }
  const b = { id: 'b', name: 'Lower B', ex: [{ id: '1060', sets: 3, reps: 12 }] }
  const c = { id: 'c', name: 'Lower C', ex: [{ id: '1060', sets: 3, reps: 12 }, { id: first, sets: 3, reps: 12 }] }
  const S = { routines: [a, b, c] }
  const keysFor = (s, routine) => {
    const row = routineAtPlace(s, routine, home).find(r => r.cfg.id === '1060')
    return (questionIndex(s, s.routines, home).get(rowSig(row)) || []).map(x => x.key)
  }
  const answer = (s, routine, fn) => ({ ...s, placeSwaps: keysFor(s, routine).reduce((m, k) => fn(m, k), s.placeSwaps) })
  const at = (s, routine) => routineAtPlace(s, routine, home).find(r => r.cfg.id === '1060')

  it('is one question where the rows show the same thing, and its own where they differ', () => {
    expect(at(S, a).suggestion.ex.id).toBe(first)
    expect(at(S, b).suggestion.ex.id).toBe(first)
    // Lower C already holds that exercise, so it is offered the next one: a different question.
    expect(at(S, c).suggestion.ex.id).not.toBe(first)
    expect(keysFor(S, a)).toEqual([swapKey('home', 'a', '1060'), swapKey('home', 'b', '1060')])
    expect(keysFor(S, c)).toEqual([swapKey('home', 'c', '1060')])
    // A row that fits, and one of another exercise, are nobody's question.
    expect([...questionIndex(S, S.routines, home).keys()].every(sig => !sig.startsWith('2290|'))).toBe(true)
  })
  it('gives her answer to every session that asks the same thing, and leaves the others alone', () => {
    const s = answer(S, a, (m, k) => withApproved(m, k, first, 1))
    expect(at(s, a)).toMatchObject({ state: 'approved', to: { id: first } })
    expect(at(s, b)).toMatchObject({ state: 'approved', to: { id: first } })
    expect(at(s, c).state).toBe('pending')
    // Answering Lower C later does not come back and change the other two.
    const s2 = answer(s, c, (m, k) => withApproved(m, k, at(s, c).suggestion.ex.id, 2))
    expect(at(s2, a).to.id).toBe(first)
    expect(at(s2, b).to.id).toBe(first)
    expect(at(s2, c)).toMatchObject({ state: 'approved' })
    expect(at(s2, c).to.id).not.toBe(first)
  })
  it('carries "Suggest another", the skip and "Undo" the same way', () => {
    let s = answer(S, b, (m, k) => withDeclined(m, k, first, 1))
    expect(at(s, a).suggestion.ex.id).toBe(at(s, b).suggestion.ex.id)
    expect(at(s, a).suggestion.ex.id).not.toBe(first)
    s = answer(s, a, (m, k) => withSkipped(m, k, 2))
    expect([at(s, a).state, at(s, b).state]).toEqual(['skipped', 'skipped'])
    // "Restore" on either one asks about both again.
    s = answer(s, b, (m, k) => withCleared(m, k, 3))
    expect([at(s, a).state, at(s, b).state]).toEqual(['pending', 'pending'])
  })
  it('"Approve all" for one session answers the same exercises in the others', () => {
    const s = { ...S, placeSwaps: approveAll({}, S, [a], home, 1) }
    expect(at(s, b)).toMatchObject({ state: 'approved', to: { id: first } })
    expect(at(s, c).state).toBe('pending')
    expect(undecidedCount(s, [a, b], home)).toBe(0)
  })
  it('keeps answers apart from place to place', () => {
    const s = answer(S, a, (m, k) => withApproved(m, k, first, 1))
    expect(decisionOf(s, 'travel', 'a', '1060')).toBe(null)
    expect(routineAtPlace(s, a, travel).find(r => r.cfg.id === '1060').state).not.toBe('approved')
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
  it('carries her own choice under a limit across devices, mark and all', () => {
    const k = swapKey('home', 'r1', '1060')
    const phone = { placeSwaps: withChosen({}, k, '4742', 'hip', 7) }
    const laptop = { placeSwaps: withDeclined({}, k, '1459', 3, 'hip') }
    expect(readDecision(mergeStates(phone, laptop).placeSwaps[k])).toEqual({ to: '4742', own: true, declined: [], lim: 'hip' })
    expect(readDecision(mergeStates(laptop, phone).placeSwaps[k])).toEqual({ to: '4742', own: true, declined: [], lim: 'hip' })
  })
})

describe('the review', () => {
  const upperA = { id: 'r2', name: 'Upper A', ex: [{ id: '0289', sets: 3, reps: 10 }, { id: '0334', sets: 3, reps: 15 }] }   // dumbbell bench press, lateral raise
  it('lists only what the place cannot do, routine by routine', () => {
    const groups = reviewList({}, [lowerA, upperA], home)
    expect(groups.map(g => [g.routine.name, g.rows.length])).toEqual([['Lower A', 4], ['Upper A', 1]])
    expect(reviewList({}, [lowerA, upperA], gym)).toEqual([])
    expect(undecidedCount({}, [lowerA, upperA], home)).toBe(5)
  })
  it('approve all takes every suggestion on screen and leaves the skip question to her', () => {
    const key = swapKey('home', 'r1', '1409')
    let S = { placeSwaps: {} }
    for (let i = 0; i < 2; i++) S = { placeSwaps: withDeclined(S.placeSwaps, key, routineAtPlace(S, lowerA, home)[3].suggestion.ex.id, i + 1) }
    S = { placeSwaps: approveAll(S.placeSwaps, S, [lowerA, upperA], home, 9) }
    expect(swappedCount(S, [lowerA, upperA], home)).toBe(4)
    expect(undecidedCount(S, [lowerA, upperA], home)).toBe(1)
    expect(routineAtPlace(S, lowerA, home)[3].state).toBe('ask-skip')
    expect(routineForPlace(S, lowerA, home).ex.filter(e => e.swappedFrom).length).toBe(3)
  })
})
