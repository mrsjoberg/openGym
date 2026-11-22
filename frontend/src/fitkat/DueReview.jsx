// The questions of the session she is about to start (due.js): the same review as the Review
// swaps screen, for these routines only, in a sheet before the check-in. Asked once: an answered
// exercise is not asked about again, here or in another session that asks the same question, so
// the next start goes straight on. She answers or approves all of them before the session starts;
// closing the sheet starts nothing. The sheet also says where an answer is changed later.
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { useLang } from '../lib/i18n.js'
import { ft } from './strings.js'
import { currentPlace } from './place-swaps.js'
import { SwapReview } from './ReviewSwaps.jsx'

/** How an answer is changed afterwards: said wherever answers are given (owner, 22 Nov). */
export const ChangeLater = () => <p className="fk-change-later">
  <strong>{ft('To change an answer later:')}</strong> {ft('Settings, then "Your swaps". "Undo" beside an exercise asks about it again, in every session it counts for.')}
</p>

export function DueReview({ ids, onStart }) {
  const S = useStore(s => s.S)
  useLang()
  const place = currentPlace(S)
  const name = S.routines.filter(r => ids.includes(r.id)).map(r => r.name).join(' + ')
  if (!place) return null
  return <div className="fk-ci fk-due">
    <h3 className="fk-ci-h">{ft('Before you')} <em>{ft('start')}</em>.</h3>
    <p className="fk-ci-p">{ft('{0} has exercises FitKat would change for you. Each is asked once: your answer also counts where the same exercise comes up in another session at {1}. Nothing changes until you approve.', name, place.name)}</p>
    <SwapReview place={place} only={ids} onDone={onStart} mustFinish doneLabel={ft('Start {0}', name)} />
    <ChangeLater />
  </div>
}

/** Opens the sheet. `onStart` runs once every question of these routines is answered and she taps Start. */
export const dueReviewSheet = (ids, onStart) =>
  useUI.getState().openSheet(close => <DueReview ids={ids} onStart={() => { close(); onStart() }} />)
