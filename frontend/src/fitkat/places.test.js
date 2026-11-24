import { describe, it, expect } from 'vitest'
import { ALL_EQUIPMENT } from '../lib/equipment.js'
import {
  PLACE_KINDS, KIT_CHIPS, PRESETS, presetOf, hasChip, toggleChip, chipCount, makePlace, addPlaces, removePlace,
  placesOf, programmeFits, kitSummary,
} from './places.js'
import { withSkipped, swapKey, readDecision } from './place-swaps.js'
import { RU_KEYS, ft } from './strings.js'

const chip = id => KIT_CHIPS.find(c => c.id === id)

describe('the kit picker', () => {
  it('covers every equipment value the catalogue uses, each under a chip', () => {
    const covered = new Set(KIT_CHIPS.flatMap(c => c.eq))
    expect(ALL_EQUIPMENT.filter(e => e !== 'body weight' && !covered.has(e))).toEqual([])
    // Every chip stands for openGym's values, but "Box or step", which is FitKat's own (needs.js).
    for (const c of KIT_CHIPS) for (const e of c.eq) if (e !== 'box') expect(ALL_EQUIPMENT, c.label).toContain(e)
    expect(chip('box').eq).toEqual(['box'])
  })
  it('ticks and unticks a chip', () => {
    let eq = toggleChip([], chip('dumbbell'))
    expect(hasChip(eq, chip('dumbbell'))).toBe(true)
    eq = toggleChip(eq, chip('bands'))
    expect(eq).toEqual(expect.arrayContaining(['dumbbell', 'band', 'resistance band']))
    expect(chipCount(eq)).toBe(2)
    expect(toggleChip(eq, chip('dumbbell'))).not.toContain('dumbbell')
  })
  it('keeps the flat bench when the adjustable one goes, and takes it along when it comes', () => {
    let eq = toggleChip([], chip('adjbench'))
    expect(eq).toEqual(expect.arrayContaining(['bench', 'adjustable bench']))
    expect(hasChip(eq, chip('bench'))).toBe(true)
    eq = toggleChip(eq, chip('adjbench'))
    expect(eq).toEqual(['bench'])
    expect(toggleChip(eq, chip('bench'))).toEqual([])
  })
  it('knows a preset until she changes it', () => {
    expect(presetOf(PRESETS.full())).toBe('full')
    expect(presetOf(PRESETS.home())).toBe('home')
    expect(presetOf(toggleChip(PRESETS.home(), chip('ball')))).toBe(null)
  })
})

describe('places', () => {
  it('start from the preset of their kind', () => {
    const [gym, home, travel] = ['gym', 'home', 'travel'].map(k => makePlace(k))
    // A gym has everything, a box or step included.
    expect(gym.name).toBe('My gym'); expect(gym.equipment.length).toBe(ALL_EQUIPMENT.length + 1); expect(gym.equipment).toContain('box')
    expect(home.equipment).not.toContain('box')
    expect(home.kind).toBe('home'); expect(presetOf(home.equipment)).toBe('home')
    expect(travel.equipment).toEqual([])
    expect(new Set([gym.id, home.id, travel.id]).size).toBe(3)
    expect(PLACE_KINDS.map(k => k.kind)).toEqual(['gym', 'home', 'travel', 'outdoors'])
  })
  it('the first one added is where she is, and the library filters by it', () => {
    const s = { equipProfiles: [], activeEquipId: null }
    const gym = makePlace('gym'), home = makePlace('home')
    addPlaces(s, [gym, home])
    expect(placesOf(s).map(p => p.name)).toEqual(['My gym', 'Home'])
    expect(s.activeEquipId).toBe(gym.id)
    expect(s.equipFilterOn).toBe(true)
  })
  it('removing one moves her to the next and clears what was decided there', () => {
    const s = { equipProfiles: [], activeEquipId: null }
    const gym = makePlace('gym'), home = makePlace('home')
    addPlaces(s, [gym, home])
    s.placeSwaps = withSkipped(withSkipped({}, swapKey(gym.id, 'r1', '0025'), 1), swapKey(home.id, 'r1', '0025'), 1)
    removePlace(s, gym.id, 5)
    expect(placesOf(s).map(p => p.id)).toEqual([home.id])
    expect(s.activeEquipId).toBe(home.id)
    expect(readDecision(s.placeSwaps[swapKey(gym.id, 'r1', '0025')])).toBe(null)
    expect(readDecision(s.placeSwaps[swapKey(home.id, 'r1', '0025')])).toEqual({ skip: true, declined: [] })
  })
  it('sums a place up in a few words', () => {
    expect(kitSummary(makePlace('gym'))).toBe('Full gym')
    expect(kitSummary(makePlace('travel'))).toBe('Bodyweight only')
    expect(kitSummary({ ...makePlace('home'), equipment: ['dumbbell', 'bench'] })).toBe('Dumbbells, Flat bench')
    expect(kitSummary({ ...makePlace('home'), equipment: ['dumbbell', 'bench', 'adjustable bench'] })).toBe('Dumbbells, Adjustable bench')
  })
})

describe('programmes that fit', () => {
  it('every built-in programme fits a full gym', () => {
    for (const p of programmeFits(makePlace('gym'))) expect(p.swaps, p.id).toBe(0)
  })
  it('at home the dumbbell plan fits and the barbell ones need swaps', () => {
    const by = Object.fromEntries(programmeFits(makePlace('home')).map(p => [p.id, p]))
    expect(by.dumbbells.swaps).toBe(0)
    expect(by['5x5'].swaps).toBeGreaterThan(by['5x5'].exercises / 2)
    expect(by.ppl.swaps).toBeGreaterThan(0)
    expect(by.ppl.days).toBe(3)
  })
  it('counts something for every programme, even with no kit', () => {
    for (const p of programmeFits(makePlace('travel'))) expect(p.exercises).toBeGreaterThan(0)
  })
})

describe('FitKat strings', () => {
  it('fills the arguments in, and has no empty Russian', () => {
    expect(ft('Step {0} of {1}', 2, 4)).toBe('Step 2 of 4')
    expect(RU_KEYS.length).toBeGreaterThan(50)
    for (const k of RU_KEYS) expect(ft(k), k).toBeTruthy()
  })
})
