// Programmes with a label for how well each fits the place she trains at. The list is openGym's
// built-in plans for now; programmes written for FitKat join it later through the same cards.
// Starting one adds its routines as written: what her kit cannot do is then suggested a
// replacement for, and nothing in the plan changes until she approves it (place-swaps.js).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useLang } from '../lib/i18n.js'
import { PLAN_COPY, loadStarterPlan } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { ft } from './strings.js'
import { placesOf, programmeFits } from './places.js'
import { currentPlace } from './place-swaps.js'

/** The cards themselves, shared with onboarding. `onStart(id)` runs after the plan is loaded. */
export function ProgrammeCards({ place, onStart }) {
  const [only, setOnly] = useState(false)
  const all = programmeFits(place)
  const shown = only ? all.filter(p => p.swaps === 0) : all
  const start = id => { if (loadStarterPlan(id)) onStart?.(id) }
  return <>
    <div className="fk-tabs" role="group" aria-label={ft('Programmes')}>
      <button type="button" className={'fk-tab' + (!only ? ' on' : '')} aria-pressed={!only} onClick={() => setOnly(false)}>{ft('All')}</button>
      <button type="button" className={'fk-tab' + (only ? ' on' : '')} aria-pressed={only} onClick={() => setOnly(true)}>{ft('Fits my kit')}</button>
    </div>
    <div className="fk-list">
      {shown.map(p => {
        const { name, about } = PLAN_COPY[p.id]()
        return <button key={p.id} type="button" className="fk-prog" onClick={() => start(p.id)} aria-label={ft('Start this programme') + ': ' + name}>
          <span className="fk-prog-top"><span className="fk-prog-name">{name}</span><Icon name="chevronRight" /></span>
          <span className="fk-prog-about">{about}</span>
          <span className="fk-prog-meta">
            {place && (p.swaps === 0
              ? <span className="fk-tag fits">{ft('Fits {0}', place.name)}</span>
              : <span className="fk-tag">{ft('{0} swaps for {1}', p.swaps, place.name)}</span>)}
            <span>{ft('{0} days a week', p.days)}</span>
          </span>
        </button>
      })}
      {!shown.length && <p className="fk-note">{ft('Nothing here fits yet. Try All.')}</p>}
    </div>
  </>
}

export default function ProgrammeLibrary() {
  const S = useStore(s => s.S)
  const nav = useNavigate()
  useLang()
  const place = currentPlace(S) || placesOf(S)[0] || null
  return <div className="narrow fk-page">
    <div className="hdr">
      <button className="iconbtn" data-back="/plan" onClick={() => nav('/plan')} aria-label={ft('Plan')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, margin: '0 12px', minWidth: 0 }}>
        <h1>{ft('Programmes that')} <em>{ft('fit')}</em>.</h1>
        {place && <div className="sub">{place.name}</div>}
      </div>
    </div>
    <ProgrammeCards place={place} onStart={() => nav('/plan')} />
  </div>
}
