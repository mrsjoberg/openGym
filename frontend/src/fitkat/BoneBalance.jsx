// Bone and balance: this week's four counts, the walking tick, the finishers she can add, and
// her goals. The logic is in bone.js; this file only draws it.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useLang } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import Icon from '../components/Icon.jsx'
import { overlayOn } from './brand.js'
import { ft } from './strings.js'
import { AREA_LABEL } from './limits.js'
import { MEASURES, GOAL_MAX, UNLOCK_DAYS, boneWeek, goalsMet, withBone, withGoal, walkingOn, walkedOn, finisherOn, finisherPlan, impactState } from './bone.js'

export const MEASURE_LABEL = { strength: 'Strength', impact: 'Impact', balance: 'Balance', posture: 'Posture' }
const MEASURE_ABOUT = {
  strength: 'Sessions with three or more loaded lifts',
  impact: 'Short bursts of hops or jumps, about 50 landings',
  balance: 'Single-leg work and balance holds',
  posture: 'Back-strengthening work, lying or standing',
}
export const FINISHER_LABEL = { balance: 'Balance finisher', posture: 'Posture finisher', impact: 'Starter impact set' }
const FINISHER_ABOUT = {
  balance: 'Single leg stand and heel to toe walk. About 5 minutes.',
  posture: 'Bird dog and a lying W raise. About 5 minutes.',
  impact: 'Jumping jacks and small jumps, 50 landings. About 3 minutes.',
}
const SAFETY = 'Your goals, yours to change. This counts the work you log and is not medical advice: with osteoporosis or a past fracture, ask your clinician first.'

export const FINISHER_HINT = {
  balance: 'Each leg in turn. Stand near a wall or a chair in case you need it.',
  posture: 'Slow and controlled. Lift only as far as is comfortable.',
  impact: 'Land softly, on the balls of your feet. Stop if anything hurts.',
}

/** On Home and Stats: where the week stands, one tap from the screen. Nothing outside FitKat. */
export const BoneLine = () => (overlayOn() ? <BoneLineOn /> : null)
function BoneLineOn() {
  useLang()
  const nav = useNavigate()
  const met = useStore(s => goalsMet(s.S, todayISO()))
  return <button type="button" className="fk-place-note quiet" onClick={() => nav('/bone')}>
    <span>{ft('Bone and balance: {0} of {1} goals met this week.', met, MEASURES.length)}</span>
    <span className="fk-link dim">{ft('Open')}</span>
  </button>
}

function Dots({ done, goal }) {
  return <span className="fk-dots" aria-hidden="true">
    {Array.from({ length: Math.max(goal, done) }, (_, k) => <i key={k} className={k < done ? 'on' : ''} />)}
  </span>
}

export default function BoneBalance() {
  useLang()
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [goals, setGoals] = useState(false)
  const today = todayISO()
  const week = boneWeek(S, today)
  const impact = impactState(S, today)
  const walking = walkingOn(S)
  const walked = walkedOn(S, today)
  const set = (key, value) => update(s => { s.bone = withBone(s.bone, key, value) })
  const goal = (m, n) => update(s => { s.bone = withGoal(s.bone, m, n) })

  const finisher = kind => {
    const on = finisherOn(S, kind)
    const plan = finisherPlan(S, kind)
    // The impact set waits for the strength days, and stays away from a knee, hip or ankle limit.
    const blocked = kind !== 'impact' || impact.state === 'open' ? null
      : impact.state === 'limit' ? ft('Not offered while you have a {0} limit. Brisk walking counts instead.', ft(AREA_LABEL[impact.area]).toLowerCase())
        : ft('Opens after {0} strength days within four weeks. {1} to go.', UNLOCK_DAYS, impact.left)
    return <div key={kind} className="fk-limit">
      <div className="fk-limit-top">
        <span className="fk-limit-name">{ft(FINISHER_LABEL[kind])}</span>
        {on && <span className="fk-tag fits">{ft('Added')}</span>}
        {!blocked && plan.days > 0 && <button type="button" className="fk-link" onClick={() => set('add:' + kind, { on: !on })}>{on ? ft('Remove') : ft('Add')}</button>}
      </div>
      <span className="fk-prog-about">{ft(FINISHER_ABOUT[kind])}</span>
      <span className="fk-prog-about">{blocked || (plan.days > 0
        ? ft('At the end of {0} of your sessions a week.', plan.days)
        : ft('Choose a programme first: it goes at the end of your sessions.'))}</span>
    </div>
  }

  return <div className="narrow fk-page">
    <div className="hdr">
      <button className="iconbtn" data-back="/home" onClick={() => nav(-1)} aria-label={ft('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, margin: '0 12px', minWidth: 0 }}>
        <h1>{ft('Bone and')} <em>{ft('balance')}</em>.</h1>
        <div className="sub">{ft('This week')}</div>
      </div>
    </div>

    <div className="fk-list">
      {MEASURES.map(m => {
        const { done, goal: g } = week[m]
        return <div key={m} className="fk-limit fk-bone">
          <div className="fk-limit-top">
            <span className="fk-limit-name">{ft(MEASURE_LABEL[m])}</span>
            <span className="fk-bone-count">{ft('{0} of {1} days', done, g)}</span>
          </div>
          <Dots done={done} goal={g} />
          <span className="fk-prog-about">{ft(MEASURE_ABOUT[m])}</span>
          {goals && <div className="fk-limit-row">
            <span>{ft('Goal: {0} days a week', g)}</span>
            <span className="fk-bone-step">
              <button type="button" className="iconbtn" disabled={g <= 1} onClick={() => goal(m, g - 1)} aria-label={ft('One day fewer')}><Icon name="minus" /></button>
              <button type="button" className="iconbtn" disabled={g >= GOAL_MAX} onClick={() => goal(m, g + 1)} aria-label={ft('One day more')}><Icon name="plus" /></button>
            </span>
          </div>}
        </div>
      })}
    </div>
    <button type="button" className="fk-link" onClick={() => setGoals(!goals)}>{goals ? ft('Done') : ft('Change goals')}</button>

    <div className="fk-limit-row fk-bone-walk">
      <span>{ft('Prefer low impact? Count brisk walking')}</span>
      <button type="button" className="fk-link" role="switch" aria-checked={walking} onClick={() => set('pref:walking', { on: !walking })}>{walking ? ft('On') : ft('Off')}</button>
    </div>
    {walking && <button type="button" className={'btn fk-bone-btn' + (walked ? '' : ' primary')} aria-pressed={walked} onClick={() => set('walk:' + today, { on: !walked })}>
      {walked ? ft('Walked today. Undo') : ft('I walked briskly today, 20 minutes or more')}
    </button>}

    <h4 className="sec fk-bone-sec">{ft('Add to your plan')}</h4>
    <div className="fk-list">
      {['balance', 'posture', 'impact'].map(finisher)}
    </div>
    <p className="fk-note">{ft(SAFETY)}</p>
  </div>
}
