// "Anything off today?": FitKat's check-in before a workout (checkin.js). Opened by sheets.jsx
// startFlow in place of openGym's four scales, with the same contract: onDone starts the workout
// with what she answered, onSkip starts it as planned and stores nothing.
//
// Three small steps in one sheet. The tiles; then, only if she tapped Sore, where; then, only
// when there is something to ease (a sore area trained today, or a rough day), whether to.
import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { exerciseNameText } from '../lib/format.js'
import { exOr } from '../lib/exercises.js'
import { ft } from './strings.js'
import { TILES, SORE_AREAS, formFromTiles, easierOffer, soreEntries } from './checkin.js'

const NONE = { sleep: null, energy: null, sore: null, stress: null }

/**
 * `preview`: the session as it would start ({ entries }), to see what a sore area touches.
 * `onDone({ form, lighter, areas, soreOnly })`: `lighter` is 'load', 'sets' or null; `soreOnly`
 * says to ease just the exercises that work `areas`.
 */
export default function Checkin({ preview, onDone, onSkip }) {
  const [tiles, setTiles] = useState(NONE)
  const [areas, setAreas] = useState([])
  const [step, setStep] = useState('tiles')
  const [pick, setPick] = useState('planned')
  const [kind, setKind] = useState('load')
  const form = formFromTiles(tiles)
  const soreAreas = tiles.sore ? areas : []
  const offer = easierOffer(preview, form, soreAreas)
  const useKind = offer.kinds.includes(kind) ? kind : offer.kinds[0]
  const off = TILES.filter(t => tiles[t.key]).length

  const tap = key => {
    if (key === 'sore' && !tiles.sore) { setTiles(t => ({ ...t, sore: 'bit' })); setStep('sore'); return }
    setTiles(t => ({ ...t, [key]: t[key] ? null : 'bit' }))
    if (key === 'sore') setAreas([])
  }
  const start = () => {
    if (step !== 'easier' && (offer.sore > 0 || offer.rough)) { setStep('easier'); return }
    const eased = step === 'easier' && pick !== 'planned'
    onDone({ form, lighter: eased ? useKind : null, areas: soreAreas, soreOnly: eased && pick === 'sore' })
  }

  if (step === 'sore') return <div className="fk-ci">
    <h3 className="fk-ci-h">{ft('Where are you')} <em>{ft('sore')}</em>?</h3>
    <p className="fk-ci-p">{ft('Roughly is fine. Pick more than one if you need to.')}</p>
    <div className="fk-kit-grid" role="group" aria-label={ft('Where are you') + ' ' + ft('sore') + '?'}>
      {SORE_AREAS.map(a => {
        const on = areas.includes(a.id)
        return <button key={a.id} type="button" className={'fk-kit-chip' + (on ? ' on' : '')} aria-pressed={on}
          onClick={() => setAreas(x => (on ? x.filter(i => i !== a.id) : [...x, a.id]))}>{on && <Icon name="check" />}<span>{ft(a.label)}</span></button>
      })}
    </div>
    <div className="fk-eyebrow" id="fk-how">{ft('How sore?')}</div>
    <div className="fk-two" role="group" aria-labelledby="fk-how">
      {['bit', 'lot'].map(l => <button key={l} type="button" className={'btn fk-outline' + (tiles.sore === l ? ' on' : '')} aria-pressed={tiles.sore === l}
        onClick={() => setTiles(t => ({ ...t, sore: l }))}>{ft(l === 'bit' ? 'A bit' : 'A lot')}</button>)}
    </div>
    {areas.length > 0 && <p className="fk-ci-note">{(() => {
      const n = soreEntries(preview, areas).length
      return n ? ft('That touches {0} of today\'s {1} exercises. You can go easier on just those.', n, (preview?.entries || []).length)
        : ft('Nothing in today\'s session works that, so it runs as planned.')
    })()}</p>}
    <button type="button" className="btn primary" onClick={() => setStep('tiles')}>{ft('Done')}</button>
  </div>

  if (step === 'easier') {
    const hit = soreEntries(preview, soreAreas)
    const names = hit.slice(0, 3).map(i => exerciseNameText(exOr(preview.entries[i].id))).join(', ')
    const options = [
      { id: 'planned', title: ft('As planned'), sub: ft('Nothing changes') },
      ...(offer.sore > 0 && offer.sore < offer.all ? [{ id: 'sore', title: ft('Easier where you\'re sore'), sub: (useKind === 'sets' ? ft('One set fewer on {0} exercises', offer.sore) : ft('10% off {0} exercises', offer.sore)) + (names ? ': ' + names : '') }] : []),
      { id: 'all', title: ft('Easier all round'), sub: useKind === 'sets' ? ft('One set fewer per exercise') : ft('10% off everything today') },
    ]
    return <div className="fk-ci">
      <h3 className="fk-ci-h">{ft('Go')} <em>{ft('easier')}</em> {ft('today?')}</h3>
      <p className="fk-ci-p">{ft('Your call. An easier day never counts against your progress.')}</p>
      <div className="fk-ci-opts" role="radiogroup" aria-label={ft('Go') + ' ' + ft('easier') + ' ' + ft('today?')}>
        {options.map(o => <button key={o.id} type="button" role="radio" aria-checked={pick === o.id} className={'fk-ci-opt' + (pick === o.id ? ' on' : '')} onClick={() => setPick(o.id)}>
          <span className={'fk-radio' + (pick === o.id ? ' on' : '')} aria-hidden="true" />
          <span className="fk-opt-text"><span className="fk-swap-to">{o.title}</span><span className="fk-prog-about">{o.sub}</span></span>
        </button>)}
      </div>
      {offer.kinds.length > 1 && pick !== 'planned' && <button type="button" className="fk-link" style={{ alignSelf: 'flex-start' }}
        onClick={() => setKind(useKind === 'load' ? 'sets' : 'load')}>{useKind === 'load' ? ft('Or drop a set instead') : ft('Or take 10% off instead')}</button>}
      <button type="button" className="btn primary" onClick={start}>{ft('Start workout')}</button>
      <button type="button" className="fk-link dim" style={{ alignSelf: 'center' }} onClick={() => setStep('tiles')}>{ft('Back')}</button>
    </div>
  }

  return <div className="fk-ci">
    <h3 className="fk-ci-h">{ft('Anything')} <em>{ft('off')}</em> {ft('today?')}</h3>
    <p className="fk-ci-p">{ft('Tap what applies. Nothing off? Just start.')}</p>
    <div className="fk-ci-tiles">
      {TILES.map(t => {
        const level = tiles[t.key]
        if (!level) return <button key={t.key} type="button" className="fk-ci-tile" aria-pressed="false" onClick={() => tap(t.key)}>
          <span className="fk-prog-name">{ft(t.label)}</span><span className="fk-prog-about">{ft(t.hint)}</span>
        </button>
        return <div key={t.key} className="fk-ci-tile on">
          <button type="button" className="fk-ci-tile-top" aria-pressed="true" onClick={() => tap(t.key)}><span className="fk-prog-name">{ft(t.label)}</span><Icon name="check" /></button>
          {t.key === 'sore' && <button type="button" className="fk-ci-where" onClick={() => setStep('sore')}>
            <span>{areas.length ? areas.map(id => ft(SORE_AREAS.find(a => a.id === id).label)).join(', ') : ft('Say where')}</span><span className="u">{ft('Change')}</span></button>}
          <div className="fk-two" role="group" aria-label={ft(t.label)}>
            {['bit', 'lot'].map(l => <button key={l} type="button" className={'fk-ci-level' + (level === l ? ' on' : '')} aria-pressed={level === l}
              onClick={() => setTiles(x => ({ ...x, [t.key]: l }))}>{ft(l === 'bit' ? 'A bit' : 'A lot')}</button>)}
          </div>
        </div>
      })}
    </div>
    <button type="button" className="btn primary" onClick={start}>{ft('Start workout')}</button>
    <p className="fk-ci-p" style={{ textAlign: 'center' }}>{off ? ft('{0} things noted. Asked once a day.', off) : ft('Asked once a day.')}</p>
    <button type="button" className="fk-link dim" style={{ alignSelf: 'center' }} onClick={onSkip}>{ft('Skip check-in')}</button>
  </div>
}
