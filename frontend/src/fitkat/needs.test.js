// What an exercise needs to sit, lie, lean or step on (needs.js), and what that does to the library
// and to the stand-ins she is offered.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { accessoriesOf, eqAvailable } from '../lib/equipment.js'
import { setOverlay } from './brand.js'
import { NEEDS } from './needs-data.js'
import { needOf, fitkatAccessories } from './needs.js'
import { PRESETS } from './places.js'
import { suggestSwaps } from './place-swaps.js'

const byName = n => Object.values(EXIDX).find(e => e && e.n === n)
const HOME = PRESETS.home(), GYM = PRESETS.full(), NONE = PRESETS.bodyweight()
const flatOnly = [...HOME, 'bench'], adjustable = [...HOME, 'bench', 'adjustable bench'], withBox = [...HOME, 'box']
const can = (name, kit) => eqAvailable(kit, byName(name))

describe('under FitKat', () => {
  beforeAll(() => setOverlay(true))
  afterAll(() => setOverlay(null))

  it('has a reviewed answer for every exercise it names, and only known ones', () => {
    expect(Object.keys(NEEDS).length).toBe(1362)
    for (const [id, c] of Object.entries(NEEDS)) { expect(EXIDX[id], id).toBeTruthy(); expect('ncfibs').toContain(c) }
  })
  it('lets a chair do the job: a Bulgarian split squat, bench dips, a seated press and a hip thrust at home', () => {
    for (const n of ['dumbbell bulgarian split squat', 'bench dip (knees bent)', 'dumbbell seated shoulder press', 'barbell hip thrust'])
      expect(needOf(byName(n)), n).toBe('c')
    expect(can('dumbbell bulgarian split squat', HOME)).toBe(true)
    expect(can('dumbbell seated shoulder press', HOME)).toBe(true)
    // openGym hid this one without a bench, by the word in its name.
    expect(can('bench dip (knees bent)', NONE)).toBe(true)
  })
  it('asks for a flat bench where she lies on one, the name saying so or not', () => {
    // "Larsen press" names no bench: openGym let it through at home.
    for (const n of ['dumbbell bench press', 'dumbbell larsen press', 'dumbbell fly']) {
      expect(can(n, HOME), n).toBe(false)
      expect(can(n, flatOnly), n).toBe(true)
    }
  })
  it('asks for an adjustable bench for incline work, and a flat one will not do', () => {
    expect(can('dumbbell incline bench press', flatOnly)).toBe(false)
    expect(can('dumbbell incline bench press', adjustable)).toBe(true)
  })
  it('asks for a box or step to step onto: not at home until she ticks it, always at a gym', () => {
    expect(needOf(byName('dumbbell step-up'))).toBe('b')
    expect(can('dumbbell step-up', HOME)).toBe(false)
    expect(can('dumbbell step-up', withBox)).toBe(true)
    expect(can('dumbbell step-up', GYM)).toBe(true)
  })
  it('keeps gym furniture to places with weight machines', () => {
    expect(needOf(byName('barbell preacher curl'))).toBe('s')
    expect(can('barbell preacher curl', [...HOME, 'barbell', 'bench', 'adjustable bench'])).toBe(false)
    expect(can('barbell preacher curl', GYM)).toBe(true)
  })
  it('keeps what else the name asks for: a pull-up bar', () => {
    const ex = byName('bench pull-ups')
    expect(needOf(ex)).toBe('c')
    expect(accessoriesOf(ex)).toEqual(['pull-up bar'])
  })
  it('drops a bench the name implies when the exercise does not use one', () => {
    // "Incline" in the name, done on a stability ball.
    const ex = byName('cable incline fly (on stability ball)')
    expect(needOf(ex)).toBe('n')
    expect(accessoriesOf(ex)).toEqual([])
  })
  it('leaves openGym\'s reading for an exercise it has no answer for', () => {
    const ex = Object.values(EXIDX).find(e => e && !NEEDS[e.id] && /\bbench\b/.test(e.n) && e.eq === 'dumbbell')
    expect(ex).toBeTruthy()
    expect(fitkatAccessories(ex, ['bench'])).toEqual(['bench'])
  })
  it('no longer offers a bench press stand-in that needs a bench at a place without one', () => {
    const home = { id: 'h', name: 'Home', equipment: HOME, accV: 3 }
    const got = suggestSwaps(byName('barbell bench press'), home, { n: 20 }).map(s => s.ex)
    expect(got.length).toBeGreaterThan(0)
    for (const ex of got) expect(['f', 'i', 's', 'b'], ex.n).not.toContain(needOf(ex))
    expect(got.map(e => e.n)).not.toContain('dumbbell larsen press')
  })
})

describe('outside FitKat', () => {
  it('leaves openGym\'s rule exactly as it was', () => {
    expect(accessoriesOf(byName('bench dip (knees bent)'))).toEqual(['bench'])
    expect(can('dumbbell larsen press', HOME)).toBe(true)
    expect(can('dumbbell step-up', HOME)).toBe(true)
  })
})
