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
import { menuSheet, fitkatCheckinSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { limitsOf, AREA_LABEL } from './limits.js'
import { limitTag } from './Limits.jsx'
import { ft } from './strings.js'
import { kitSummary, placesOf } from './places.js'
import { currentPlace, undecidedCount, swappedCount } from './place-swaps.js'
import { saidOf, checkinOf } from './checkin.js'
import { todayISO } from '../lib/format.js'

export default function PlaceBar() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const nav = useNavigate()
  useLang()
  const places = placesOf(S)
  const place = currentPlace(S)
  const today = todayISO()
  const said = saidOf(S, today, ft)
  // The check-in can be answered here, before any workout, and changed until one starts.
  const checked = !!checkinOf(S, today)
  const open = !S.active && !(S.workouts || []).some(w => w?.d === today)
  const ask = open && !checked && S.dailyForm !== false
  if (!places.length && !said.length && !ask && !(open && checked)) return null
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
    {places.length > 0 && <button type="button" className="fk-place-pick" onClick={pick} aria-label={ft('Training at {0}, change place', place ? place.name : '')}>
      <span className="fk-eyebrow">{ft('Training at')}</span>
      <span className="fk-place-pick-name">{place ? place.name : ft('Choose a place')}</span>
      <Icon name="chevronDown" />
    </button>}
    {ask && <button type="button" className="fk-place-note quiet" onClick={fitkatCheckinSheet}>
      <span>{ft('How are you today?')}</span>
      <span className="fk-link">{ft('Check in')}</span>
    </button>}
    {checked && open && <button type="button" className="fk-place-note quiet" onClick={fitkatCheckinSheet}>
      <span>{said.length ? ft('Today: {0}.', said.join(', ')) : ft('Today: nothing off.')}</span>
      <span className="fk-link dim">{ft('Change')}</span>
    </button>}
    {checked && !open && said.length > 0 && <div className="fk-place-note quiet"><span>{ft('Today: {0}.', said.join(', '))}</span></div>}
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
  // Here because of a limit (limits.js): say which, and to take it slowly.
  // The mode alone is read from the store: a selector must hand back the same value while nothing changed.
  const mode = useStore(s => (entry?.limit && limitsOf(s.S).find(l => l.area === entry.limit)?.mode) || null)
  const limit = mode ? { area: entry.limit, mode } : null
  const eased = entry?.eased === 'load' ? ft('Eased 10%') : entry?.eased === 'sets' ? ft('One set fewer') : null
  // A move of the mobility block (mobility.js): the catalogue's steps rarely say how many or how far.
  if (entry?.mobility) return <div className="fk-swapped-note">
    <span className="fk-tag">{ft('Mobility')} · {ft(AREA_LABEL[entry.mobility])}</span>
    <span>{ft('Ten slow reps, on each side where there are two. Only as far as is comfortable.')}</span>
  </div>
  // Slower progress under a limit (go-easy.js): a lighter target the first time, or once more as last time.
  const easy = limit ? entry?.plan?.easy : null
  if (!from && !eased && !limit) return null
  return <div className="fk-swapped-note">
    {limit ? <span className="fk-tag">{limitTag(limit)}</span>
      : from && <span className="fk-tag">{place ? ft('Swapped for {0}', place.name) : ft('Swapped')}</span>}
    {from && <span>{ft('was {0}', exerciseNameText(from))}</span>}
    {limit && <span>{from ? ft('Slow, and start light.') : ft('Lighter and slower.')}</span>}
    {easy?.kind === 'aim' && <span>{ft('Aim for about {0} {1}, 10% less than last time. Choose the closest weight you have.', easy.weight, easy.unit)}</span>}
    {easy?.kind === 'again' && <span>{ft('Same as last time. It goes up when you complete every set twice in a row.')}</span>}
    {eased && <span className="fk-tag fits">{eased}</span>}
  </div>
}
