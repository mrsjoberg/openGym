// Soreness she reported today, shown where recovery is shown (checkin.js soreMusclesOf, soreHint).
//
// It stays her word beside the app's arithmetic. openGym's recovery map and its Home hint are
// worked out from the log; soreness is something she said in the check-in. So the map keeps its
// training colours and hatches the sore muscles over them, with a line that says whose word the
// hatch is, and Home gets a card that begins "You said". On a day she is sore that card stands
// in for openGym's own hint: one card about recovery, and hers is the one that knows today.
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, useLang } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { effectiveRoutines } from '../lib/history.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import CardHead from '../components/CardHead.jsx'
import RecoveryHint from '../components/RecoveryHint.jsx'
import { dayOverrideSheet } from '../sheets.jsx'
import { overlayOn } from './brand.js'
import { ft } from './strings.js'
import { SORE_AREAS, soreAreasOf, soreMusclesOf, soreHint } from './checkin.js'
import { routineHere } from './place-swaps.js'

// "legs and glutes, chest": the areas in the picker's words, inside a sentence.
const namesOf = areas => areas.map(id => ft(SORE_AREAS.find(a => a.id === id).label).toLowerCase()).join(', ')
// "your chest is sore", "your legs and glutes are sore".
const SINGULAR = new Set(['chest', 'core'])

/** Today's sore muscles for the map's `marks`, or null when there are none or FitKat is off. */
export function soreMarksFor(S) {
  if (!overlayOn()) return null
  const marks = soreMusclesOf(S, todayISO())
  return Object.keys(marks).length ? marks : null
}

/** Under the recovery map's legend: what the hatch means, in words. */
export function SoreMapNote() {
  const S = useStore(s => s.S)
  useLang()
  const today = todayISO()
  if (!overlayOn() || !Object.keys(soreMusclesOf(S, today)).length) return null
  return <div className="fk-sore-note">
    <span className="fk-sore-swatch" aria-hidden="true" />
    <span>{ft('Sore today, you said: {0}.', namesOf(soreAreasOf(S, today)))} {ft('The colours show training only.')}</span>
  </div>
}

/** In the detail of a muscle picked on the map. */
export function SoreMuscleNote({ slug }) {
  const S = useStore(s => s.S)
  useLang()
  if (!overlayOn() || !slug || !soreMusclesOf(S, todayISO())[slug]) return null
  return <div className="small dim" style={{ marginTop: 6 }}>{ft('You said this area is sore today.')}</div>
}

/** Home: her own line on a day she said she is sore, openGym's recovery hint on every other day. */
export default function FitkatRecovery({ S }) {
  useLang()
  const today = todayISO()
  const hint = soreHint(S, { today, routines: effectiveRoutines(S, today).map(r => routineHere(S, r)) })
  if (!hint) return <RecoveryHint S={S} />
  const names = namesOf(hint.areas)
  const title = hint.areas.length > 1 ? ft('You said you are sore today: {0}.', names)
    : SINGULAR.has(hint.areas[0]) ? ft('You said your {0} is sore today.', names) : ft('You said your {0} are sore today.', names)
  const sub = hint.hits > 0 ? ft("Today's session includes exercises for that. Go easier on them when you start, or swap the session.")
    : hint.planned ? ft("Nothing in today's session works that, so it runs as planned.") : ft('No session is planned today.')
  // Put away for today the way openGym's hint is, with the same way back.
  const dismiss = () => {
    useStore.getState().update(s => { s.recoveryHintDay = today })
    useUI.getState().toast(t('Hidden for today. Back tomorrow.'), { action: t('Undo'), onAction: () => useStore.getState().update(s => { s.recoveryHintDay = null }) })
  }
  return <div className="card recovery-hint" data-hint="sore">
    <CardHead icon="figureStrength" tint="var(--rose-deep)" eyebrow={ft('From your check-in')} title={title} sub={sub}
      action={<button type="button" className="iconbtn" onClick={dismiss} aria-label={t('Hide for today')}><Icon name="xmark" /></button>} />
    {hint.hits > 0 && <div className="card-head-indent">
      <Button size="sm" variant="tinted" icon="swap" onClick={() => dayOverrideSheet(today)}>{t('Swap session')}</Button>
    </div>}
  </div>
}
