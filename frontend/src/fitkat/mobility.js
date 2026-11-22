// The mobility block: two gentle moves for an area she chose "Go easy" for, at the start of every
// session in which she has accepted an exercise for that area: a ladder step, or the exercise kept
// easier (owner, 22 Nov; rule F8). Nothing changes before she has approved it, so a session whose
// exercises still wait for her answer has no block yet. Not under Avoid, which asks for the area
// to be left alone, and not when she was told to rest it.
//
// The lists are hand-picked from the catalogue's body-weight mobility entries and were read step
// by step by two AI reviewers, not by a physiotherapist. All are moving, unloaded and need nothing
// more than a wall, a chair or bench, or the floor. The first two of a list make the block; the
// rest are spares, used when one of the first two is already in the session.
//
// A move runs as one set of ten slow reps, with progression off: it is a warm-up, not training.
// The catalogue's steps often give no count and no "comfortable range" cue, so the note under the
// exercise says both (PlaceBar.jsx SwappedNote).
import { EXIDX } from '../lib/exercises.js'
import { AREAS, limitsOf } from './limits.js'

export const MOBILITY = {
  neck: ['5063', '10556', '10557'],       // seated chin tuck, seated neck twist, seated neck side bend
  shoulder: ['6438', '4395', '3129'],     // bent-over pendulum, shoulder circle, shoulder blade squeeze and spread
  elbow: ['2764', '2765', '2763'],        // elbow bend, forearm turn, elbow straighten
  wrist: ['1428', '2790', '2791'],        // wrist circles, wrist extension, wrist flexion
  back: ['7294', '4609', '11095'],        // lying pelvic tilt, lying knees side to side, seated cat and cow
  hip: ['4932', '10517', '4286'],         // lying bent-knee figure 8, leg swirl holding a chair, standing hip circles
  knee: ['9969', '10537', '10534'],       // lying heel slide, seated knee extension, seated knee bend
  ankle: ['2761', '10908', '2762', '8188'], // ankle pull-up, seated foot circle, ankle point, standing ankle circles
}
export const MOBILITY_MOVES = 2
export const MOBILITY_REPS = 10

/**
 * The block for a session, as exercise settings to put in front of it: [{ id, sets, reps, …,
 * mobility: area }]. `rows` is routineAtPlace's; `taken` the ids the session already holds.
 */
export function mobilityEntries(S, rows, taken = new Set()) {
  const easy = new Set(limitsOf(S).filter(l => l.mode === 'easy').map(l => l.area))
  const out = []
  for (const area of AREAS) {
    if (!easy.has(area)) continue
    if (!rows.some(r => r.state === 'approved' && r.limit?.area === area)) continue
    let n = 0
    for (const id of MOBILITY[area] || []) {
      if (n >= MOBILITY_MOVES) break
      if (!EXIDX[id] || taken.has(id) || out.some(e => e.id === id)) continue
      out.push({ id, sets: 1, reps: MOBILITY_REPS, weight: 0, mode: 'reps', bodyweight: true, prog: 'off', mobility: area })
      n++
    }
  }
  return out
}
