// The first run: where she trains, what each place has, and a programme that fits. Nothing is
// written until a step is finished, and every step can be skipped: the app works without a single
// place, exactly as openGym does, and all of this is in Settings afterwards.
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t, useLang } from '../lib/i18n.js'
import { DAYN, todayISO } from '../lib/format.js'
import Icon from '../components/Icon.jsx'
import { ft } from './strings.js'
import KitPicker from './KitPicker.jsx'
import { ProgrammeCards } from './ProgrammeLibrary.jsx'
import { PLACE_KINDS, addPlaces, chipCount, makePlace } from './places.js'
import { SwapReview } from './ReviewSwaps.jsx'
import { LimitsStep } from './Limits.jsx'
import { womenDefaults } from './profile.js'
import { dueBySession, dueTotal } from './due.js'
import { ChangeLater } from './DueReview.jsx'

const STEPS = 5

export default function Onboarding() {
  const update = useStore(s => s.update)
  const S = useStore(s => s.S)
  useLang()
  // Step 5: answer each session when it comes up, or everything now.
  const [how, setHow] = useState('due')
  const [step, setStep] = useState('places')
  const [picked, setPicked] = useState(['gym', 'home'])
  const [places, setPlaces] = useState([])
  const [at, setAt] = useState(0)
  const finish = () => update(s => { s.fitkatSetup = true; womenDefaults(s) })
  // Each step starts at its top, wherever the last one was left.
  useEffect(() => { window.scrollTo(0, 0) }, [step, at])
  const toggle = kind => setPicked(p => (p.includes(kind) ? p.filter(k => k !== kind) : PLACE_KINDS.map(k => k.kind).filter(k => k === kind || p.includes(k))))

  if (step === 'places') return <div className="fk-onb">
    <div className="fk-onb-head">
      <div className="fk-eyebrow">{ft('Step {0} of {1}', 1, STEPS)}</div>
      <h1>{ft('Where do you')} <em>{ft('train')}</em>?</h1>
      <p>{ft('Pick every place you train. Each keeps its own equipment, and your plan adapts when you switch.')}</p>
    </div>
    <div className="fk-list">
      {PLACE_KINDS.map(k => {
        const on = picked.includes(k.kind)
        return <button key={k.kind} type="button" className="fk-opt" aria-pressed={on} onClick={() => toggle(k.kind)}>
          <span className={'fk-box' + (on ? ' on' : '')} aria-hidden="true">{on && <Icon name="check" />}</span>
          <span className="fk-opt-text"><span className="fk-prog-name">{ft(k.label)}</span>
            <span className="fk-prog-about">{k.hint ? ft(k.hint) : ft('Saved as {0}', ft(k.name))}</span></span>
        </button>
      })}
    </div>
    <div className="fk-onb-foot">
      <p>{ft('You can add or change places later in Settings.')}</p>
      <button type="button" className="btn primary" disabled={!picked.length}
        onClick={() => { setPlaces(picked.map(k => makePlace(k, ft(PLACE_KINDS.find(x => x.kind === k).name)))); setAt(0); setStep('kit') }}>
        {ft('Continue')}</button>
      <button type="button" className="fk-link dim" onClick={finish}>{ft('Skip for now')}</button>
    </div>
  </div>

  if (step === 'kit') {
    const place = places[at]
    const next = places[at + 1]
    const setEq = equipment => setPlaces(ps => ps.map((p, i) => (i === at ? { ...p, equipment } : p)))
    const go = () => {
      if (next) return setAt(at + 1)
      update(s => { addPlaces(s, places) })
      setStep('limits')
    }
    return <div className="fk-onb">
      <div className="fk-onb-head">
        <div className="fk-eyebrow">{ft('Step {0} of {1}', 2, STEPS)} · {place.name}</div>
        <h1>{ft('What do you have at')} <em>{place.name}</em>?</h1>
        <p>{ft('Start from a preset, then tick anything else you have.')}</p>
      </div>
      <KitPicker equipment={place.equipment} onChange={setEq} />
      <div className="fk-onb-foot">
        <p><strong>{ft('{0} selected for {1}.', chipCount(place.equipment), place.name)}</strong> {ft('No kit is fine too. Your plan adapts to what you have.')}</p>
        <button type="button" className="btn primary" onClick={go}>{next ? ft('Next: {0}', next.name) : ft('Continue')}</button>
        <button type="button" className="fk-link dim" onClick={() => (at ? setAt(at - 1) : setStep('places'))}>{ft('Back')}</button>
      </div>
    </div>
  }

  // Anything to work around: asked once, here, and changed afterwards only in Settings.
  if (step === 'limits') return <LimitsStep eyebrow={ft('Step {0} of {1}', 3, STEPS)} onDone={() => setStep('programme')} onBack={() => setStep('kit')} />

  // The whole list at once: her choice in step 5, and what the step is when nothing waits.
  const sessions = step === 'review' ? dueBySession(S, places[0]) : []
  if (step === 'review-all' || (step === 'review' && !sessions.length)) return <div className="fk-onb">
    <div className="fk-onb-head">
      <div className="fk-eyebrow">{ft('Step {0} of {1}', 5, STEPS)} · {places[0]?.name}</div>
      <h1>{ft('Review your')} <em>{ft('plan')}</em>.</h1>
      <p>{ft('Nothing changes until you approve.')}</p>
    </div>
    <SwapReview place={places[0]} onDone={finish} />
  </div>

  // Step 5 (owner, 22 Nov): the list of every exercise at once was the heavy part of the setup. She
  // chooses: each session's questions the first time she starts it (due.js), or all of them now.
  if (step === 'review') {
    const total = dueTotal(sessions)
    const today = todayISO()
    const count = n => (n === 1 ? ft('1 exercise') : ft('{0} exercises', n))
    const options = [
      { id: 'due', title: ft('As each session comes up'), sub: ft('You answer the questions for a session the first time you start it.') },
      { id: 'all', title: ft('Everything now'), sub: ft('All of them in one list, before you finish the setup.') },
    ]
    return <div className="fk-onb">
      <div className="fk-onb-head">
        <div className="fk-eyebrow">{ft('Step {0} of {1}', 5, STEPS)} · {places[0]?.name}</div>
        <h1>{ft('Review your')} <em>{ft('plan')}</em>.</h1>
        <p>{ft('To decide: {0} in {1}.', count(total), sessions.length === 1 ? ft('1 session') : ft('{0} sessions', sessions.length))} {ft('Each is a gentler version for a limit, or a swap for equipment {0} does not have. Each is asked once, and nothing changes until you approve.', places[0].name)}</p>
      </div>
      <div className="fk-ci-opts" role="radiogroup" aria-label={ft('Review your') + ' ' + ft('plan')}>
        {options.map(o => <button key={o.id} type="button" role="radio" aria-checked={how === o.id} className={'fk-ci-opt' + (how === o.id ? ' on' : '')} onClick={() => setHow(o.id)}>
          <span className={'fk-radio' + (how === o.id ? ' on' : '')} aria-hidden="true" />
          <span className="fk-opt-text"><span className="fk-swap-to">{o.title}</span><span className="fk-prog-about">{o.sub}</span></span>
        </button>)}
      </div>
      <div className="fk-due-list">
        <div className="fk-eyebrow">{ft('When each comes up')}</div>
        <ul>
          {sessions.map(g => <li key={g.routine.id}>
            <span className="fk-due-day">{!g.iso ? ft('Not on a day yet') : g.iso === today ? ft('Today') : t(DAYN[g.weekday])}</span>
            <span className="fk-due-name">{g.routine.name}</span>
            <span className="fk-due-count">{count(g.count)}</span>
          </li>)}
        </ul>
      </div>
      <ChangeLater />
      <div className="fk-onb-foot">
        <button type="button" className="btn primary" onClick={how === 'due' ? finish : () => setStep('review-all')}>
          {how === 'due' ? ft('Done') : total === 1 ? ft('Review 1 now') : ft('Review {0} now', total)}</button>
      </div>
    </div>
  }

  return <div className="fk-onb">
    <div className="fk-onb-head">
      <div className="fk-eyebrow">{ft('Step {0} of {1}', 4, STEPS)} · {places[0]?.name}</div>
      <h1>{ft('Programmes that')} <em>{ft('fit')}</em>.</h1>
    </div>
    <ProgrammeCards place={places[0] || null} onStart={() => (places[0] ? setStep('review') : finish())} />
    <div className="fk-onb-foot">
      <button type="button" className="fk-link dim" onClick={finish}>{ft('No programme for now')}</button>
    </div>
  </div>
}
