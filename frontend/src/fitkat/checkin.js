// The check-in before a workout, FitKat's way: "Anything off today?" Four tiles she taps only
// when they apply (slept badly, low energy, sore, stressed), each "a bit" or "a lot". A good day
// is no taps at all.
//
// It is openGym's daily form underneath (lib/daily-form.js): the same four answers on the same 1
// to 5 scale in S.dayForm, so its rough-day rule, its insights and its sync all keep working. A
// tile left alone is stored as fine, "a bit" and "a lot" as the two low ends of the scale.
//
// What FitKat adds is where she is sore. openGym keeps soreness as one number that only feeds the
// day's score; here the area is kept with it,
//
//   S.dayForm['2026-11-20'] = { sleep: 1, energy: 4, sore: 4, stress: 2, soreAreas: ['back'], _ts }
//
// and used: when today's session trains a sore area she is offered to go easier on just the
// exercises that work it, on a rough day or not. "As planned" stays the default, and an eased
// exercise sits out of progression the way openGym's lighter day does.
import { FORM_KEYS, LIGHTER_KINDS, isRough, lighterChanges, readForm, sleepRatingOf } from '../lib/daily-form.js'
import { applyAdapt } from '../lib/coach-adapt.js'
import { muscleWeightsOf } from '../lib/muscles.js'
import { MUSCLE_GROUPS } from '../lib/muscle-filter.js'
import { exOr } from '../lib/exercises.js'

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const list = v => (Array.isArray(v) ? v : [])

/* ------------------------------------------------------------------ tiles -- */

/** The four tiles, in openGym's order, with the words for each. */
export const TILES = [
  { key: 'sleep', label: 'Slept badly', hint: 'Short or broken night', said: 'slept badly' },
  { key: 'energy', label: 'Low energy', hint: 'Flat or tired', said: 'low energy' },
  { key: 'sore', label: 'Sore', hint: 'Tap to say where', said: 'sore' },
  { key: 'stress', label: 'Stressed', hint: 'A lot on your mind', said: 'stressed' },
]
export const LEVELS = ['bit', 'lot']

// Soreness and stress count the other way round in openGym's form: 5 is a lot of it.
const INVERTED = new Set(['sore', 'stress'])
const FINE = 4, A_BIT = 2, A_LOT = 1
const stored = (key, good) => (INVERTED.has(key) ? 6 - good : good)

/** The tiles as openGym's form: { sleep, energy, sore, stress }, each 1 to 5. */
export function formFromTiles(tiles) {
  const out = {}
  for (const k of FORM_KEYS) {
    const level = isMap(tiles) ? tiles[k] : null
    out[k] = stored(k, level === 'lot' ? A_LOT : level === 'bit' ? A_BIT : FINE)
  }
  return out
}

/** A stored form read back as tiles: { sleep: null | 'bit' | 'lot', ... }. */
export function tilesFromForm(form) {
  const f = readForm(form)
  const out = {}
  for (const k of FORM_KEYS) {
    const v = f ? f[k] : null
    const good = v == null ? FINE : INVERTED.has(k) ? 6 - v : v
    out[k] = good <= A_LOT ? 'lot' : good <= A_BIT + 0.5 ? 'bit' : null
  }
  return out
}

/**
 * Last night's sleep from the phone's health store as the sleep tile: under 5 hours is "a lot",
 * under 6 "a bit", anything longer leaves the tile alone. The same steps openGym's own check-in
 * uses for its sleep row (lib/daily-form.js sleepRatingOf). Whatever wrote the night to Apple
 * Health or Health Connect counts: a watch, a ring such as Oura, the phone itself.
 */
export function sleepTileOf(hours) {
  const rating = sleepRatingOf(hours)
  return rating == null ? null : rating <= 1 ? 'lot' : rating === 2 ? 'bit' : null
}

/* ------------------------------------------------------------- sore areas -- */

/** Where she can be sore: openGym's own muscle groups (lib/muscle-filter.js), named for a person. */
export const SORE_AREAS = [
  { id: 'legs', label: 'Legs and glutes', said: 'legs' },
  // "Back muscles", not "Back": that word is already the way back in every language (strings.js).
  { id: 'back', label: 'Back muscles', said: 'back' },
  { id: 'chest', label: 'Chest', said: 'chest' },
  { id: 'shoulders', label: 'Shoulders', said: 'shoulders' },
  { id: 'arms', label: 'Arms', said: 'arms' },
  { id: 'core', label: 'Core', said: 'core' },
]
const AREA_IDS = new Set(SORE_AREAS.map(a => a.id))
const musclesOfArea = Object.fromEntries(MUSCLE_GROUPS.map(g => [g.id, g.muscles]))

/** An area list cleaned: known ids, each once, in the picker's order. */
export const cleanAreas = areas => SORE_AREAS.map(a => a.id).filter(id => list(areas).includes(id))

/** The sore areas kept with a day's check-in. */
export const soreAreasOf = (S, iso) => cleanAreas(isMap(S?.dayForm) && isMap(S.dayForm[iso]) ? S.dayForm[iso].soreAreas : [])

/** S.dayForm with the day's sore areas set. The day's entry has to exist already (withForm made it). */
export function withSoreAreas(map, iso, areas) {
  if (!isMap(map) || !isMap(map[iso])) return map
  const clean = cleanAreas(areas)
  const { soreAreas, ...rest } = map[iso]
  return { ...map, [iso]: clean.length ? { ...rest, soreAreas: clean } : rest }
}

// A helper muscle counts: a Romanian deadlift works a sore lower back although it is a
// hamstring exercise. The muscle map credits helpers 0.4 (lib/muscles.js), so that is the bar.
const WORKS_AT = 0.4

/** The areas an exercise works. */
export function areasOfExercise(ex) {
  const w = muscleWeightsOf(ex)
  return SORE_AREAS.map(a => a.id).filter(id => (musclesOfArea[id] || []).some(m => (w[m] || 0) >= WORKS_AT))
}

/** Which entries of a session work a sore area: their indexes. */
export function soreEntries(active, areas) {
  const sore = new Set(cleanAreas(areas))
  if (!sore.size) return []
  return list(active?.entries).map((e, i) => (e && areasOfExercise(exOr(e.id)).some(a => sore.has(a)) ? i : -1)).filter(i => i >= 0)
}

/* ------------------------------------------------------------ going easier -- */

/** openGym's "go lighter" changes, only for the entries that work a sore area. */
export function easierChanges(active, kind, areas) {
  const hit = new Set(soreEntries(active, areas))
  return lighterChanges(active, kind).filter(c => hit.has(c.entry))
}

/**
 * What the check-in may offer for this session: { rough, sore, all, kinds }. `all` is how many
 * exercises can be eased at all: when the sore ones are all of them, there is one offer, not two.
 * `sore` is how many exercises work a sore area and can be eased; `rough` is openGym's rule (at
 * least two answers, an average of 2.5 or less) with something to ease. `kinds` is which of
 * openGym's two ways (10% off the weights, one set fewer) the session can take.
 */
export function easierOffer(active, form, areas) {
  const kinds = LIGHTER_KINDS.filter(k => lighterChanges(active, k).length > 0)
  const sore = kinds.length ? Math.max(...kinds.map(k => easierChanges(active, k, areas).length)) : 0
  const all = kinds.length ? Math.max(...kinds.map(k => lighterChanges(active, k).length)) : 0
  return { rough: isRough(readForm(form)) && kinds.length > 0, sore, all, kinds }
}

/**
 * Eases only the exercises that work a sore area, in the store draft `s` (mutated). Returns how
 * many changed. Those exercises sit out of progression and are marked `eased`; the rest of the
 * session counts as usual.
 */
export function goEasierWhereSore(s, kind, areas) {
  if (!s?.active || !LIGHTER_KINDS.includes(kind)) return 0
  const changes = easierChanges(s.active, kind, areas)
  if (!changes.length) return 0
  const entries = changes.map(c => s.active.entries[c.entry])
  const { applied } = applyAdapt(s, { kind: 'adapt', changes }, changes.map(c => c.id))
  if (!applied.length) return 0
  for (const e of entries) if (e) { e.noProg = true; e.eased = kind }
  s.active.lighter = kind
  s.active.lighterAreas = cleanAreas(areas)
  return applied.length
}

/** After openGym's whole-session "go lighter": marks every changed entry, for the label in the workout. */
export function markEased(active, kind) {
  for (const e of list(active?.entries)) if (e && e.noProg) e.eased = kind
}

/* ----------------------------------------------- said on Home, eased later -- */

// The check-in can be answered from Home, before any workout (PlaceBar.jsx). Whether to go easier
// is a question about a session, so it waits: the day is marked `pending` and the question is put
// when she starts. openGym's withForm rebuilds the day's entry, which drops the mark again.

/** S.dayForm with the day marked as answered from Home (the "go easier?" question still to come), or the mark taken off. */
export function withPending(map, iso, on = true) {
  if (!isMap(map) || !isMap(map[iso])) return map
  const { pending, ...rest } = map[iso]
  return { ...map, [iso]: on ? { ...rest, pending: true } : rest }
}

/** She answered from Home today and has not been asked about going easier yet. */
export const easePending = (S, iso) => !!(isMap(S?.dayForm) && isMap(S.dayForm[iso]) && S.dayForm[iso].pending === true && readForm(S.dayForm[iso]))

/** A day's check-in as the sheet shows it: { tiles, areas }, or null when there is none. */
export function checkinOf(S, iso) {
  const entry = isMap(S?.dayForm) ? S.dayForm[iso] : null
  return readForm(entry) ? { tiles: tilesFromForm(entry), areas: soreAreasOf(S, iso) } : null
}

/* -------------------------------------------- on the recovery map and Home -- */

// Soreness is what she said, fatigue is what the log works out (lib/recovery.js). They are shown
// side by side and never mixed: the map keeps its training colours and hatches the sore muscles
// over them, and Home says "you said" in a line of its own. It is a day's word: gone the next day.

/** The day's sore muscles for the recovery map: { quadriceps: 'bit', hamstring: 'bit', ... }, empty for none. */
export function soreMusclesOf(S, iso) {
  const c = checkinOf(S, iso)
  const out = {}
  if (!c || !c.tiles.sore) return out
  for (const id of c.areas) for (const m of musclesOfArea[id] || []) out[m] = c.tiles.sore
  return out
}

/**
 * The line for Home on a day she said she is sore: { areas, hits, planned }, or null. `routines`
 * are today's, as they would run here; `hits` is how many of their exercises work a sore area.
 * Quiet in the same cases as openGym's own hint (lib/recovery-hint.js): switched off, put away
 * for the day, a workout under way or already done today.
 */
export function soreHint(S, { today, routines = [] } = {}) {
  if (!S || !today || S.recoveryHint === false || S.recoveryHintDay === today || S.active) return null
  if (list(S.workouts).some(w => w?.d === today)) return null
  if (!Object.keys(soreMusclesOf(S, today)).length) return null
  const areas = soreAreasOf(S, today)
  const entries = list(routines).flatMap(r => list(r?.ex))
  return { areas, hits: soreEntries({ entries }, areas).length, planned: entries.length > 0 }
}

/* ---------------------------------------------------------------- in words -- */

/** Today's check-in as a few words for Home: ['slept badly', 'back a bit sore'], empty for a fine day or none. */
export function saidOf(S, iso, word = s => s) {
  const entry = isMap(S?.dayForm) ? S.dayForm[iso] : null
  if (!readForm(entry)) return []
  const tiles = tilesFromForm(entry)
  const areas = soreAreasOf(S, iso)
  const out = []
  for (const t of TILES) {
    if (!tiles[t.key]) continue
    if (t.key === 'sore' && areas.length) {
      const names = areas.map(id => word(SORE_AREAS.find(a => a.id === id).said)).join(', ')
      out.push(word(tiles.sore === 'lot' ? '{0} very sore' : '{0} a bit sore').replace('{0}', names))
    } else out.push(word(t.said))
  }
  return out
}
