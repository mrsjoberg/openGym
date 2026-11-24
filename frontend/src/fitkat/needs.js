// What an exercise needs to sit, lie, lean or step on, under FitKat (owner, 23 and 24 Nov).
//
// openGym decides that from the name: "bench" in it means a bench, "incline" or "decline" an
// adjustable one (lib/equipment.js accessoriesOf). That hides a Bulgarian split squat "on a bench"
// at home, where a chair does the same job, and lets a press through whose name does not say it is
// done lying on a bench. FitKat has the answer for 1,362 exercises, read from their text by four AI
// model types and, where they did not agree, from the exercise's animation (needs-data.js,
// scripts/fitkat/bench). For the rest, openGym's reading stands.
//
//   n  nothing beyond its own kit        c  a chair will do: every place has one
//   f  a flat bench to lie on            i  an adjustable bench
//   b  a box or step to stand, step or jump on ("Box or step" in the kit picker)
//   s  other gym furniture (a preacher or back-extension bench, dip bars, strongman kit): only where
//      the place has weight machines, which stands for a gym that has such things
//
// Whatever else the name asks for (a pull-up bar) is kept.
import { NEEDS } from './needs-data.js'

export const BOX = 'box'
const BENCHES = ['bench', 'adjustable bench']
const ADD = { n: [], c: [], f: ['bench'], i: ['bench', 'adjustable bench'], b: [BOX], s: ['leverage machine'] }

/** The class for an exercise, or undefined where FitKat has none. */
export const needOf = ex => (ex && NEEDS[ex.id]) || undefined

/** openGym's list of accessories for `ex`, with the bench part replaced where FitKat knows better. */
export function fitkatAccessories(ex, need) {
  const c = needOf(ex)
  if (!c) return need
  const rest = need.filter(a => !BENCHES.includes(a))
  return [...rest, ...ADD[c].filter(a => !rest.includes(a))]
}
