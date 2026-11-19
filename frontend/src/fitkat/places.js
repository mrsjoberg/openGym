// Places: where she trains and what each place has.
//
// A place is one of openGym's equipment profiles (lib/equipment.js) with a `kind` of our own on
// it; everything openGym does per gym (plates, dumbbells, bar weights, lib/gym-inventory.js) keeps
// working, since nothing about the profile's shape changes. What FitKat adds is the front door: a
// short list of places to pick from, presets to start a kit from, and a picker that groups
// openGym's equipment values the way a person thinks about them.
import { ALL_EQUIPMENT, ACC_V, newProfile, profileEquipment } from '../lib/equipment.js'
import { switchGym } from '../lib/gym-inventory.js'
import { STARTER_PLANS } from '../../../api/coach/core/starter-plans.js'
import { fitOf } from './place-swaps.js'

const list = v => (Array.isArray(v) ? v : [])

/** The places offered in onboarding, with the name each is saved under and the preset it starts from. */
export const PLACE_KINDS = [
  { kind: 'gym', label: 'A gym', name: 'My gym', preset: 'full' },
  { kind: 'home', label: 'At home', name: 'Home', preset: 'home' },
  { kind: 'travel', label: 'Travelling', name: 'Travel', preset: 'bodyweight', hint: 'Hotel rooms, little or no kit' },
  { kind: 'outdoors', label: 'Outdoors', name: 'Outdoors', preset: 'bodyweight', hint: 'Park, garden or track' },
]

// One chip of the picker: a piece of kit as people name it, and the catalogue values it stands
// for. "Resistance bands" is two values because the catalogue files band exercises under both.
export const KIT_GROUPS = [
  { title: 'Free weights', chips: [
    { id: 'dumbbell', label: 'Dumbbells', eq: ['dumbbell'] },
    { id: 'kettlebell', label: 'Kettlebell', eq: ['kettlebell'] },
    { id: 'barbell', label: 'Barbell', eq: ['barbell', 'olympic barbell'] },
    { id: 'plate', label: 'Weight plates', eq: ['weight plate'] },
    { id: 'ez', label: 'EZ bar', eq: ['ez barbell'] },
    { id: 'trap', label: 'Trap bar', eq: ['trap bar'] },
  ] },
  { title: 'Benches and bars', chips: [
    // An adjustable bench is a flat one too: it brings the flat bench along, and leaves it behind
    // when it goes. No flat bench means no bench at all.
    { id: 'bench', label: 'Flat bench', eq: ['bench'], off: ['bench', 'adjustable bench'] },
    { id: 'adjbench', label: 'Adjustable bench', eq: ['bench', 'adjustable bench'], off: ['adjustable bench'] },
    { id: 'pullup', label: 'Pull-up bar', eq: ['pull-up bar'] },
  ] },
  { title: 'Bands and small kit', chips: [
    { id: 'bands', label: 'Resistance bands', eq: ['band', 'resistance band'] },
    { id: 'ball', label: 'Stability ball', eq: ['stability ball'] },
    { id: 'medball', label: 'Medicine ball', eq: ['medicine ball'] },
    { id: 'trx', label: 'Suspension trainer', eq: ['suspension trainer'] },
    { id: 'bosu', label: 'Balance trainer', eq: ['bosu ball'] },
    { id: 'roller', label: 'Foam roller', eq: ['roller', 'massage ball'] },
    { id: 'rope', label: 'Jump rope', eq: ['rope'] },
    { id: 'vest', label: 'Weight vest or belt', eq: ['weighted'] },
    { id: 'wheel', label: 'Ab wheel', eq: ['wheel roller'] },
    { id: 'sandbag', label: 'Sandbag', eq: ['sandbag'] },
  ] },
  { title: 'Machines and cable', chips: [
    { id: 'cable', label: 'Cable machine', eq: ['cable'] },
    { id: 'machines', label: 'Weight machines', eq: ['leverage machine'] },
    { id: 'sled', label: 'Leg press and sled', eq: ['sled machine'] },
    { id: 'smith', label: 'Smith machine', eq: ['smith machine'] },
    { id: 'assisted', label: 'Assisted pull-up machine', eq: ['assisted'] },
    { id: 'landmine', label: 'Landmine', eq: ['landmine'] },
  ] },
  { title: 'Cardio and more', chips: [
    { id: 'bike', label: 'Exercise bike', eq: ['stationary bike'] },
    { id: 'elliptical', label: 'Cross trainer', eq: ['elliptical machine'] },
    { id: 'cardio', label: 'Other cardio machines', eq: ['upper body ergometer', 'skierg machine', 'stepmill machine'] },
    { id: 'strongman', label: 'Strongman kit', eq: ['tire', 'hammer', 'macebell', 'clubbell'] },
  ] },
]
export const KIT_CHIPS = KIT_GROUPS.flatMap(g => g.chips)

const clean = eq => [...new Set(list(eq))].filter(e => ALL_EQUIPMENT.includes(e))

/** The kits a place can start from. */
export const PRESETS = {
  full: () => [...ALL_EQUIPMENT],
  home: () => clean(['dumbbell', 'kettlebell', 'band', 'resistance band']),
  bodyweight: () => [],
}
export const PRESET_LABEL = { full: 'Full gym', home: 'Home basics', bodyweight: 'Bodyweight only' }

const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x))
/** The preset an equipment list is exactly, or null once she has changed it. */
export const presetOf = equipment => Object.keys(PRESETS).find(k => sameSet(clean(equipment), PRESETS[k]())) || null

/** Whether a chip is ticked: the place has every value it stands for. */
export const hasChip = (equipment, chip) => chip.eq.every(e => list(equipment).includes(e))

/**
 * The equipment list with a chip switched. Unticking takes away what the chip says it takes
 * (`off`, else its own values), except what another ticked chip still stands for.
 */
export function toggleChip(equipment, chip) {
  const have = clean(equipment)
  if (!hasChip(have, chip)) return clean([...have, ...chip.eq])
  const gone = chip.off || chip.eq
  const after = have.filter(e => !gone.includes(e))
  const kept = new Set(chip.off ? [] : KIT_CHIPS.filter(c => c.id !== chip.id && hasChip(have, c)).flatMap(c => c.eq))
  return have.filter(e => after.includes(e) || kept.has(e))
}

/** How many chips are ticked, for "3 selected". */
export const chipCount = equipment => KIT_CHIPS.filter(c => hasChip(equipment, c)).length

/** A short line naming what a place has. */
export function kitSummary(place, label = s => s) {
  const eq = profileEquipment(place)
  const preset = presetOf(eq)
  if (preset) return label(PRESET_LABEL[preset])
  // The flat bench is part of the adjustable one: name the bench she has once.
  const names = KIT_CHIPS.filter(c => hasChip(eq, c) && !(c.id === 'bench' && eq.includes('adjustable bench'))).map(c => label(c.label))
  return names.length ? names.slice(0, 4).join(', ') + (names.length > 4 ? ' …' : '') : label('Bodyweight only')
}

/** A new place of `kind`, named `name`, starting from that kind's preset. */
export function makePlace(kind, name) {
  const def = PLACE_KINDS.find(k => k.kind === kind) || PLACE_KINDS[0]
  return { ...newProfile(name || def.name), kind: def.kind, equipment: PRESETS[def.preset](), accV: ACC_V }
}

export const placesOf = S => list(S?.equipProfiles).filter(p => p && p.id != null)

/**
 * Adds places to the state draft `s` and makes the first one the place she is at, with the library
 * filtered by it: from here on the app shows what she can do where she is.
 */
export function addPlaces(s, places, now = Date.now()) {
  s.equipProfiles = [...list(s.equipProfiles), ...places]
  if (places[0] && !placesOf(s).some(p => p.id === s.activeEquipId)) switchGym(s, places[0].id, now)
  s.equipFilterOn = true
}

/** Removes a place and the decisions kept for it; the next place becomes the current one. */
export function removePlace(s, id, now = Date.now()) {
  const rest = placesOf(s).filter(p => p.id !== id)
  if (s.activeEquipId === id && rest[0]) switchGym(s, rest[0].id, now)
  s.equipProfiles = list(s.equipProfiles).filter(p => p && p.id !== id)
  if (s.activeEquipId === id) s.activeEquipId = null
  if (s.invGym === id) delete s.invGym
  // A cleared entry, not a deleted key: a deletion would come back from the next device that syncs.
  const swaps = s.placeSwaps && typeof s.placeSwaps === 'object' ? s.placeSwaps : {}
  for (const k of Object.keys(swaps)) if (k.startsWith(id + ':')) swaps[k] = { _ts: now }
}

/**
 * The built-in programmes with how each fits `place`: [{ id, days, sessions, exercises, swaps }].
 * `swaps` is how many of its exercises the place's kit cannot do, 0 for a programme that fits.
 */
export function programmeFits(place) {
  return Object.entries(STARTER_PLANS).map(([id, plan]) => {
    let exercises = 0, swaps = 0
    for (const [key, , , rows] of plan.routines) {
      const f = fitOf({}, { id: key, ex: rows.map(([exId]) => ({ id: exId })) }, place)
      exercises += f.total; swaps += f.swaps
    }
    return { id, days: plan.schedule.length, sessions: plan.routines.length, exercises, swaps }
  })
}
