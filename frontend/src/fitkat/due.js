// A session's open questions, asked when the session is due (owner, 22 Nov).
//
// The setup used to end on one list of every exercise in the plan that needs an answer: a gentler
// version for a limit, a swap for kit the place lacks. That was a long step. Now she chooses in
// step 5: answer everything now, or answer each session's questions the first time she starts it.
// Nothing is stored for that choice. An exercise she has not answered about is simply still open,
// and a session with open questions asks them before it starts (DueReview.jsx, sheets.jsx startFlow),
// whichever she chose.
import { effectiveRoutines } from '../lib/history.js'
import { isoOf, todayISO } from '../lib/format.js'
import { currentPlace, reviewList, rowSig, undecidedCount } from './place-swaps.js'

const list = v => (Array.isArray(v) ? v : [])
// The rows she has not answered: the same ones undecidedCount counts (place-swaps.js).
const open = row => row.state !== 'approved' && row.state !== 'skipped' && row.state !== 'kept'

/** How many questions wait for these routines at a place (where she is training, when left out). */
export function dueCount(S, routineIds, place = currentPlace(S)) {
  const ids = list(routineIds)
  if (!place || !ids.length) return 0
  return undecidedCount(S, list(S?.routines).filter(r => r && ids.includes(r.id)), place)
}

/**
 * What waits at a place, session by session, in the order she will meet them:
 *   [{ routine, count, iso, weekday }]
 * `iso` is the first day from `today` on that the session is planned for, within `days`; null (and
 * a null weekday) for a session on no day, which comes last. A question is counted once, in the
 * first session that asks it: her answer there goes to the others (place-swaps.js questionIndex),
 * so a session whose questions were all met earlier is not listed.
 */
export function dueBySession(S, place, today = todayISO(), days = 14) {
  if (!place) return []
  const out = reviewList(S, list(S?.routines), place)
    .map(g => ({ routine: g.routine, sigs: g.rows.filter(open).map(rowSig), iso: null, weekday: null }))
    .filter(g => g.sigs.length > 0)
  for (let i = 0; i < days && out.some(g => !g.iso); i++) {
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() + i)
    const iso = isoOf(d)
    const ids = effectiveRoutines(S, iso).map(r => r.id)
    for (const g of out) if (!g.iso && ids.includes(g.routine.id)) { g.iso = iso; g.weekday = d.getDay() }
  }
  // Array.prototype.sort is stable: sessions on the same day, or on none, keep the plan's order.
  out.sort((a, b) => (a.iso || '9999') < (b.iso || '9999') ? -1 : (a.iso || '9999') > (b.iso || '9999') ? 1 : 0)
  const met = new Set()
  return out.map(({ sigs, ...g }) => {
    const fresh = sigs.filter(sig => !met.has(sig))
    for (const sig of fresh) met.add(sig)
    return { ...g, count: fresh.length }
  }).filter(g => g.count > 0)
}

/** All the questions in that list. */
export const dueTotal = sessions => list(sessions).reduce((n, g) => n + g.count, 0)
