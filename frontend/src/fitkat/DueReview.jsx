// The questions of the session she is about to start (due.js): the same review as the Review
// swaps screen, for these routines only, in a sheet before the check-in. Asked once: an answered
// exercise is not asked about again, so the next start of the same session goes straight on.
// She answers or approves all of them before the session starts; closing the sheet starts nothing.
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { useLang } from '../lib/i18n.js'
import { ft } from './strings.js'
import { currentPlace } from './place-swaps.js'
import { SwapReview } from './ReviewSwaps.jsx'

export function DueReview({ ids, onStart }) {
  const S = useStore(s => s.S)
  useLang()
  const place = currentPlace(S)
  const name = S.routines.filter(r => ids.includes(r.id)).map(r => r.name).join(' + ')
  if (!place) return null
  return <div className="fk-ci fk-due">
    <h3 className="fk-ci-h">{ft('Before you')} <em>{ft('start')}</em>.</h3>
    <p className="fk-ci-p">{ft('{0} has exercises FitKat would change for you. This is asked once for each session, and nothing changes until you approve.', name)}</p>
    <SwapReview place={place} only={ids} onDone={onStart} mustFinish doneLabel={ft('Start {0}', name)} />
  </div>
}

/** Opens the sheet. `onStart` runs once every question of these routines is answered and she taps Start. */
export const dueReviewSheet = (ids, onStart) =>
  useUI.getState().openSheet(close => <DueReview ids={ids} onStart={() => { close(); onStart() }} />)
