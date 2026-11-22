// What Home says about today's session, row by row: each exercise as she will run it at her place,
// with what changed about it. Pure: the routines come in already built for the place and her
// limits (place-swaps.js routineHere), the same way a session is built when it starts.
import { exOr } from '../lib/exercises.js'
import { estimateMinutes } from '../lib/session-builder.js'
import { limitsOf } from './limits.js'
import { soreAreasOf, areasOfExercise } from './checkin.js'

/** How much of it: "4 × 8", "2 × 30 s", or just the sets when nothing else is planned. */
export function amountOf(cfg) {
  const sets = Math.max(1, Number(cfg?.sets) || 1)
  if (cfg?.mode === 'time') return sets + ' × ' + (Number(cfg.sec) || 30) + ' s'
  return Number(cfg?.reps) > 0 ? sets + ' × ' + cfg.reps : String(sets)
}

/**
 * The rows of today's list. Each: { id, ex, cfg, tags }, a tag being one of
 *   { kind: 'mobility', area }   a move of the mobility block
 *   { kind: 'finisher', which }  a bone and balance finisher she added
 *   { kind: 'added' }            something she added with "Build your own"
 *   { kind: 'limit', area, mode } here, or easier, because of a limit
 *   { kind: 'swapped' }          stands in for an exercise her place has no kit for
 *   { kind: 'sore' }             works an area she said is sore today
 */
export function todayRows(S, routines, iso) {
  const sore = new Set(soreAreasOf(S, iso))
  const modes = Object.fromEntries(limitsOf(S).map(l => [l.area, l.mode]))
  const rows = []
  for (const r of routines || []) for (const cfg of (r && r.ex) || []) {
    if (!cfg || !cfg.id) continue
    const ex = exOr(cfg.id)
    const tags = []
    if (cfg.mobility) tags.push({ kind: 'mobility', area: cfg.mobility })
    else if (cfg.finisher) tags.push({ kind: 'finisher', which: cfg.finisher })
    else if (cfg.added) tags.push({ kind: 'added' })
    if (cfg.limit && modes[cfg.limit]) tags.push({ kind: 'limit', area: cfg.limit, mode: modes[cfg.limit] })
    else if (cfg.swappedFrom) tags.push({ kind: 'swapped' })
    if (sore.size && !cfg.mobility && areasOfExercise(ex).some(a => sore.has(a))) tags.push({ kind: 'sore' })
    rows.push({ id: cfg.id, ex, cfg, tags })
  }
  return rows
}

/** Roughly how long the list takes, in minutes rounded to five (lib/session-builder.js). */
export function todayMinutes(rows) {
  const m = estimateMinutes(rows.map(r => r.cfg))
  return Math.max(5, Math.round(m / 5) * 5)
}
