import { describe, it, expect } from 'vitest'
import { isRough, formScore, readForm, withForm, lighterChanges } from '../lib/daily-form.js'
import { EXIDX } from '../lib/exercises.js'
import { buildSessionEntries } from '../lib/session-start.js'
import {
  TILES, formFromTiles, tilesFromForm, SORE_AREAS, cleanAreas, withSoreAreas, soreAreasOf, areasOfExercise,
  soreEntries, easierChanges, easierOffer, goEasierWhereSore, saidOf, sleepTileOf,
} from './checkin.js'

const none = { sleep: null, energy: null, sore: null, stress: null }

// Lower A on dumbbells: hip thrust, Romanian deadlift, Bulgarian split squat, glute bridge, calf raise.
const lowerA = { id: 'r1', name: 'Lower A', ex: [
  { id: '4742', sets: 4, reps: 10, weight: 20 }, { id: '1459', sets: 3, reps: 10, weight: 20 }, { id: '2290', sets: 3, reps: 10, weight: 10 },
  { id: '3335', sets: 3, reps: 12, weight: 20 }, { id: '0417', sets: 3, reps: 15, weight: 10 },
] }
const session = () => {
  const S = { unit: 'kg', workouts: [], routines: [lowerA], equipProfiles: [], settings: {} }
  return { ...S, active: { id: 'a', d: '2026-11-20', entries: buildSessionEntries(S, lowerA), cur: 0 } }
}

describe('the four tiles', () => {
  it('store a good day as fine on openGym\'s scale, and it is not a rough one', () => {
    const f = formFromTiles(none)
    expect(f).toEqual({ sleep: 4, energy: 4, sore: 2, stress: 2 })
    expect(formScore(f)).toBe(4)
    expect(isRough(f)).toBe(false)
  })
  it('store "a bit" and "a lot" at the low end, soreness and stress the other way round', () => {
    expect(formFromTiles({ ...none, sleep: 'lot', sore: 'bit' })).toEqual({ sleep: 1, energy: 4, sore: 4, stress: 2 })
    expect(formFromTiles({ ...none, stress: 'lot' }).stress).toBe(5)
  })
  it('one thing off is not a rough day; two a lot, or three a bit, are', () => {
    expect(isRough(formFromTiles({ ...none, sleep: 'lot' }))).toBe(false)
    expect(isRough(formFromTiles({ ...none, sleep: 'bit', energy: 'bit' }))).toBe(false)
    expect(isRough(formFromTiles({ ...none, sleep: 'lot', energy: 'lot' }))).toBe(true)
    expect(isRough(formFromTiles({ ...none, sleep: 'bit', energy: 'bit', stress: 'bit' }))).toBe(true)
  })
  it('read back as the tiles she tapped', () => {
    const tiles = { sleep: 'lot', energy: null, sore: 'bit', stress: null }
    expect(tilesFromForm(formFromTiles(tiles))).toEqual(tiles)
    expect(TILES.map(t => t.key)).toEqual(['sleep', 'energy', 'sore', 'stress'])
  })
})

describe('sleep from the phone', () => {
  it('ticks the sleep tile after a short night and leaves it alone after a fair one', () => {
    expect(sleepTileOf(4.5)).toBe('lot')
    expect(sleepTileOf(5.6)).toBe('bit')
    expect(sleepTileOf(6)).toBe(null)
    expect(sleepTileOf(8.2)).toBe(null)
    expect(sleepTileOf(0)).toBe(null)
    expect(sleepTileOf(undefined)).toBe(null)
  })
})

describe('where she is sore', () => {
  it('is kept with the day, cleaned, and survives openGym reading the form', () => {
    let map = withForm({}, '2026-11-20', formFromTiles({ ...none, sore: 'bit' }), 5)
    map = withSoreAreas(map, '2026-11-20', ['back', 'nonsense', 'back', 'legs'])
    expect(soreAreasOf({ dayForm: map }, '2026-11-20')).toEqual(['legs', 'back'])
    expect(readForm(map['2026-11-20'])).toMatchObject({ sore: 4 })
    expect(map['2026-11-20']._ts).toBe(5)
    expect(withSoreAreas(map, '2026-11-20', [])['2026-11-20'].soreAreas).toBeUndefined()
    expect(withSoreAreas({}, '2026-11-20', ['back'])).toEqual({})
    expect(cleanAreas(SORE_AREAS.map(a => a.id)).length).toBe(6)
  })
  it('an exercise works an area through its helper muscles too', () => {
    expect(areasOfExercise(EXIDX['1459'])).toEqual(expect.arrayContaining(['legs', 'back']))   // romanian deadlift: hamstrings, lower back
    expect(areasOfExercise(EXIDX['0417'])).toEqual(['legs'])                                    // calf raise
    expect(areasOfExercise(EXIDX['0025'])).toEqual(expect.arrayContaining(['chest', 'arms']))   // bench press
  })
  it('finds the exercises of a session that work it', () => {
    const { active } = session()
    expect(soreEntries(active, ['legs'])).toEqual([0, 1, 2, 3, 4])
    expect(soreEntries(active, ['back'])).toEqual([1, 3])
    expect(soreEntries(active, ['chest'])).toEqual([])
    expect(soreEntries(active, [])).toEqual([])
  })
})

describe('going easier where she is sore', () => {
  it('is offered whenever a sore area is trained today, rough day or not', () => {
    const { active } = session()
    const form = formFromTiles({ ...none, sore: 'bit' })
    expect(easierOffer(active, form, ['back'])).toEqual({ rough: false, sore: 2, all: 5, kinds: ['load', 'sets'] })
    expect(easierOffer(active, form, ['chest']).sore).toBe(0)
    expect(easierOffer(active, formFromTiles({ ...none, sleep: 'lot', energy: 'lot' }), []).rough).toBe(true)
  })
  it('takes 10% off only the exercises that work the area, and only those sit out of progression', () => {
    const s = session()
    const before = s.active.entries.map(e => e.sets.filter(x => !x.warmup).map(x => x.w))
    expect(easierChanges(s.active, 'load', ['back']).map(c => c.entry)).toEqual([1, 3])
    expect(goEasierWhereSore(s, 'load', ['back'])).toBe(2)
    const after = s.active.entries.map(e => e.sets.filter(x => !x.warmup).map(x => x.w))
    expect(after[0]).toEqual(before[0]); expect(after[2]).toEqual(before[2]); expect(after[4]).toEqual(before[4])
    expect(after[1][0]).toBeLessThan(before[1][0]); expect(after[3][0]).toBeLessThan(before[3][0])
    expect(s.active.entries.map(e => !!e.noProg)).toEqual([false, true, false, true, false])
    expect(s.active.entries.map(e => e.eased)).toEqual([undefined, 'load', undefined, 'load', undefined])
    expect(s.active.noProg).toBeUndefined()
    expect(s.active.lighterAreas).toEqual(['back'])
  })
  it('or drops a set from them', () => {
    const s = session()
    expect(goEasierWhereSore(s, 'sets', ['back'])).toBe(2)
    expect(s.active.entries[1].sets.filter(x => !x.warmup).length).toBe(2)
    expect(s.active.entries[0].sets.filter(x => !x.warmup).length).toBe(4)
  })
  it('does nothing when the session trains none of it', () => {
    const s = session()
    expect(goEasierWhereSore(s, 'load', ['chest'])).toBe(0)
    expect(s.active.lighter).toBeUndefined()
    expect(lighterChanges(s.active, 'load').length).toBe(5)
  })
})

describe('in words', () => {
  it('says what was off, with the area', () => {
    let map = withForm({}, '2026-11-20', formFromTiles({ ...none, sleep: 'lot', sore: 'bit' }), 1)
    map = withSoreAreas(map, '2026-11-20', ['back'])
    expect(saidOf({ dayForm: map }, '2026-11-20')).toEqual(['slept badly', 'back a bit sore'])
    expect(saidOf({ dayForm: withForm({}, '2026-11-20', formFromTiles(none), 1) }, '2026-11-20')).toEqual([])
    expect(saidOf({}, '2026-11-20')).toEqual([])
  })
})
