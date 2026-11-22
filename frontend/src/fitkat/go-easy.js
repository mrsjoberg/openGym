// Progress under a limit: slower, and from a lighter start.
//
// An exercise that carries a limit label in a session (kept easier, or offered by a ladder, under
// Go easy or Avoid alike) still progresses, at about half the pace:
//
//   - It goes up only after two clean sessions in a row. A clean session is one where she ticked
//     off every planned set with at least the planned reps (or the planned seconds): what
//     lib/progression.js readSession calls `ok`. Where the progression rule says "up" after one,
//     the session opens at last time's numbers once more instead.
//   - The first session after she chose "Keep it, easier" opens about 10% lighter than her last
//     one. The app names that target and she picks the closest weight she has: it does not try to
//     work out her plates or dumbbells (owner, 22 Nov). Body-weight work, assisted machines and
//     timed holds have no such target.
//
// Nothing is stored. Like the progression engine, this is read off the history each time: a past
// session ran under the limit when the target it was built with says so (`target.limit`, which a
// session's exercise settings carry from fitkat/place-swaps.js routineForPlace).
//
// Hooked into lib/session-start.js planEntry, right after the engine's own prescription. The
// result is an ordinary prescription (`kind: 'hold'`) without the engine's "why" line, plus
// `easy`, which the note under the exercise reads (PlaceBar.jsx SwappedNote):
//   { kind: 'aim', weight, unit }   a lighter start, with its target
//   { kind: 'again' }               the same as last time, once more
import { modeOf } from '../lib/history.js'
import { isAssisted } from '../lib/exercises.js'
import { sessionsFor } from '../lib/progression.js'
import { gymSplitView } from '../lib/gym-split.js'

/** How much of last time's weight a kept exercise opens at. */
export const EASE = 0.9

/** The lighter target for a weight, on a half-kilo or one-pound grid, or null when that is no lighter. */
export function easeTarget(weight, unit = 'kg') {
  const grid = unit === 'lb' ? 1 : 0.5
  const aim = Math.round((Number(weight) || 0) * EASE / grid) * grid
  return aim > 0 && aim < weight ? aim : null
}

const under = (session, area) => !!session && session.target?.limit === area
const sameNumbers = (a, b) => a.weight === b.weight && a.goal === b.goal && (a.target?.sets || 0) === (b.target?.sets || 0)

// Last time's numbers as a prescription: its weight, its reps or seconds, its sets.
function repeatOf(last, mode, policy) {
  return {
    policy, kind: 'hold',
    ...(last.weight > 0 ? { weight: last.weight } : {}),
    ...(last.goal > 0 ? (mode === 'time' ? { sec: last.goal } : { reps: last.goal }) : {}),
    ...(last.target?.sets > 0 ? { sets: last.target.sets } : {}),
    ...(Array.isArray(last.target?.rowReps) ? { rowReps: last.target.rowReps } : {}),
  }
}

/**
 * The prescription for an exercise that carries a limit label, given the engine's own `plan`.
 * The same plan comes back when there is nothing to slow or ease: no limit, progression off, no
 * history, or a session the engine already holds or deloads.
 */
export function easyPlan(S, cfg, routine, plan) {
  const area = cfg?.limit
  if (!area || !plan || plan.kind === 'off' || plan.policy === 'off') return plan
  const mode = modeOf(cfg)
  if (mode !== 'reps' && mode !== 'time') return plan
  // The history the engine itself read, and a session with no target of its own must not pass
  // for one that ran under the limit: it falls back to these settings, so the label comes off.
  const { limit: _limit, ...bare } = cfg
  const sessions = sessionsFor(gymSplitView(S, cfg.id), cfg.id, bare, routine?.id)
  const last = sessions.at(-1)
  if (!last) return plan
  // The first session of an exercise she kept: about 10% lighter, at last time's reps.
  if (!under(last, area) && !cfg.swappedFrom && mode === 'reps' && !isAssisted(cfg) && last.weight > 0) {
    const unit = S?.unit || 'kg'
    const aim = easeTarget(last.weight, unit)
    if (aim) return { ...repeatOf(last, mode, plan.policy), weight: aim, easy: { kind: 'aim', weight: aim, unit } }
  }
  if (plan.kind !== 'up') return plan
  const prev = sessions.at(-2)
  const twice = under(last, area) && under(prev, area) && last.ok && prev.ok && sameNumbers(last, prev)
  return twice ? plan : { ...repeatOf(last, mode, plan.policy), easy: { kind: 'again' } }
}
