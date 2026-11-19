// On Home: where she is training, one tap to say otherwise, and a line when the plan holds
// exercises that place cannot do and she has not decided about yet. Switching place asks only
// about those; what she approved there before simply applies. Also the small note in a running
// workout that names what an exercise stands in for.
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useLang } from '../lib/i18n.js'
import { exerciseNameText } from '../lib/format.js'
import { EXIDX } from '../lib/exercises.js'
import { switchGym } from '../lib/gym-inventory.js'
import { menuSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { ft } from './strings.js'
import { kitSummary, placesOf } from './places.js'
import { currentPlace, undecidedCount, swappedCount } from './place-swaps.js'

export default function PlaceBar() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const nav = useNavigate()
  useLang()
  const places = placesOf(S)
  const place = currentPlace(S)
  if (!places.length) return null
  const pick = () => menuSheet({
    title: ft('Where are you training today?'),
    items: places.map(p => ({
      icon: p.id === place?.id ? 'check' : undefined, label: p.name, sub: kitSummary(p, ft),
      onClick: () => {
        if (p.id === place?.id) return
        update(s => { switchGym(s, p.id) })
        if (undecidedCount(S, S.routines, p) > 0) nav('/swaps')
      },
    })),
  })
  const left = place ? undecidedCount(S, S.routines, place) : 0
  const swapped = place ? swappedCount(S, S.routines, place) : 0
  return <div className="fk-placebar">
    <button type="button" className="fk-place-pick" onClick={pick} aria-label={ft('Training at {0}, change place', place ? place.name : '')}>
      <span className="fk-eyebrow">{ft('Training at')}</span>
      <span className="fk-place-pick-name">{place ? place.name : ft('Choose a place')}</span>
      <Icon name="chevronDown" />
    </button>
    {left > 0 && <button type="button" className="fk-place-note" onClick={() => nav('/swaps')}>
      <span>{ft('{0} exercises in your plan need a swap for {1}.', left, place.name)}</span>
      <span className="fk-link">{ft('Review')}</span>
    </button>}
    {!left && swapped > 0 && <button type="button" className="fk-place-note quiet" onClick={() => nav('/swaps')}>
      <span>{ft('{0} exercises swapped for {1}.', swapped, place.name)}</span>
      <span className="fk-link dim">{ft('Change')}</span>
    </button>}
  </div>
}

/** In a running workout, under the exercise: what it replaced. */
export function SwappedNote({ entry }) {
  const place = useStore(s => currentPlace(s.S))
  const from = EXIDX[entry?.swappedFrom]
  if (!from) return null
  return <div className="fk-swapped-note">
    <span className="fk-tag">{place ? ft('Swapped for {0}', place.name) : ft('Swapped')}</span>
    <span>{ft('was {0}', exerciseNameText(from))}</span>
  </div>
}
