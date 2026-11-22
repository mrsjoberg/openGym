// Changing where she trains: from Home's place menu, from Places, and from the question at the
// start of a session. When the session would need swaps at the new place she is told first, and
// chooses between reviewing them and staying where she is. When nothing needs deciding, the place
// simply changes.
import { useStore } from '../store/useStore.js'
import { effectiveRoutines } from '../lib/history.js'
import { switchGym } from '../lib/gym-inventory.js'
import { todayISO } from '../lib/format.js'
import { confirmSheet, menuSheet } from '../sheets.jsx'
import { ft } from './strings.js'
import { kitSummary, placesOf } from './places.js'
import { currentPlace, switchCost } from './place-swaps.js'

/**
 * Move to `place`. `routines` are the session it is about (today's when left out). `onSwitched`
 * runs once she is there with nothing to decide, or was there already; `onStay` when she chooses
 * to stay. Choosing to review takes her to the review and runs neither, unless `onReview` is
 * given: at the start of a session the review is the start's own next step (sheets.jsx startFlow).
 */
export function switchPlace(place, { routines, onStay, onSwitched, onReview } = {}) {
  const store = useStore.getState()
  const S = store.S
  const here = currentPlace(S)
  if (!place || place.id === here?.id) { if (onSwitched) onSwitched(); return }
  const todays = effectiveRoutines(S, todayISO())
  const rs = routines || todays
  const { need, fits } = switchCost(S, rs, place)
  const move = () => store.update(s => { switchGym(s, place.id) })
  if (!need) { move(); if (onSwitched) onSwitched(); return }
  const name = rs.map(r => r.name).join(' + ')
  // The review opens on today's session when that is the one in question, else on the whole plan.
  const scoped = rs.every(r => todays.some(x => x.id === r.id))
  confirmSheet({
    title: need === 1 ? ft('1 exercise in {0} needs a swap for {1}.', name, place.name) : ft('{0} exercises in {1} need a swap for {2}.', need, name, place.name),
    message: (fits > 0 ? ft('{0} already fit.', fits) + ' ' : '') + ft('You approve each swap before it changes.'),
    confirmText: need === 1 ? ft('Review 1 swap') : ft('Review {0} swaps', need),
    cancelText: here ? ft('Stay at {0}', here.name) : undefined,
    onConfirm: () => { move(); if (onReview) onReview(); else window.location.hash = scoped ? '#/swaps?scope=today' : '#/swaps' },
    onCancel: onStay,
  })
}

/** The sheet that lists her places. `onSame` runs when she picks the one she is at. */
export function placeMenu({ routines, onSame, onStay, onSwitched, onReview } = {}) {
  const S = useStore.getState().S
  const here = currentPlace(S)
  menuSheet({
    title: ft('Where are you training today?'),
    items: placesOf(S).map(p => ({
      icon: p.id === here?.id ? 'check' : undefined, label: p.name, sub: kitSummary(p, ft),
      onClick: () => (p.id === here?.id ? onSame && onSame() : switchPlace(p, { routines, onStay, onSwitched, onReview })),
    })),
  })
}

/** "Ask where I am training when I start a session": on until she switches it off, and only with a choice to make. */
export const asksPlace = S => !!S && S.fitkatAskPlace !== false && !S.active && placesOf(S).length > 1
/** "Switch by itself when I arrive at a saved gym": off until she switches it on. */
export const autoPlace = S => !!S && S.fitkatAutoPlace === true
