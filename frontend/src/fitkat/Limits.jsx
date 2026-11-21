// Injuries and limits: a joint or tendon the plan works around. Set in onboarding (LimitsStep),
// changed only here in Settings (the default export). Nothing on Home or in the check-in adds one.
// The rules are in limits.js; this file only reads and writes S.bodyLimits.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useLang } from '../lib/i18n.js'
import { getLang } from '../lib/i18n-core.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Row, Section } from '../components/ui.jsx'
import { ft } from './strings.js'
import { placesOf } from './places.js'
import { currentPlace, reviewList } from './place-swaps.js'
import { AREAS, AREA_LABEL, AREA_HINT, limitsOf, withLimit, withoutLimit } from './limits.js'

export const SAFETY = 'FitKat works around what you tell it. It cannot assess an injury. After surgery, or with pain that is sharp, getting worse or not settling, see a physio or doctor first.'
const EASY_TEXT = 'Exercises that load it get an easier version, done slowly. No jumping or running.'
const AVOID_TEXT = 'Exercises that load it get the gentlest version there is, or a hold, or are skipped.'

const pad = n => String(n).padStart(2, '0')
const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }
const dayText = iso => {
  const d = new Date(iso + 'T12:00:00')
  return iso && !isNaN(d) ? d.toLocaleDateString(getLang() === 'ru' ? 'ru' : 'en-GB', { day: 'numeric', month: 'long' }) : ''
}
export const limitTag = l => ft(l.mode === 'avoid' ? 'Avoid' : 'Go easy') + ' · ' + ft(AREA_LABEL[l.area])

/** The row in Settings that leads here. */
export function LimitsLink() {
  const nav = useNavigate()
  return <Section>
    <Row icon="heart" iconTint="var(--acc)" title={ft('Injuries and limits')} subtitle={ft('What your plan works around.')}
      accessory="chevron" onClick={() => nav('/limits')} />
  </Section>
}

/** The eight areas, two to a row. `picked` is the ones that are on. */
export function AreaGrid({ picked, onToggle, hide = [] }) {
  return <div className="fk-area-grid" role="group" aria-label={ft('Areas to work around')}>
    {AREAS.filter(a => !hide.includes(a)).map(a => {
      const on = picked.includes(a)
      return <button key={a} type="button" className={'fk-area' + (on ? ' on' : '')} aria-pressed={on} onClick={() => onToggle(a)}>
        <span className="fk-area-name"><span>{ft(AREA_LABEL[a])}</span>{on && <Icon name="check" />}</span>
        <span className="fk-area-hint">{ft(AREA_HINT[a])}</span>
      </button>
    })}
  </div>
}

const Choice = ({ on, onClick, children }) => (
  <button type="button" className={'btn ' + (on ? 'primary' : 'fk-outline')} aria-pressed={on} onClick={onClick}>
    {on && <Icon name="check" />} {children}
  </button>
)

/** Go easy or Avoid for one area, and under Avoid whether she was told to rest it. */
export function Treat({ area, value, onChange }) {
  const name = ft(AREA_LABEL[area])
  const avoid = value.mode === 'avoid'
  return <div className="fk-treat">
    <h2>{name}</h2>
    <div className="fk-two" role="group" aria-label={ft('{0}: how to treat it', name)}>
      <Choice on={!avoid} onClick={() => onChange({ mode: 'easy', rest: false })}>{ft('Go easy')}</Choice>
      <Choice on={avoid} onClick={() => onChange({ mode: 'avoid', rest: !!value.rest })}>{ft('Avoid')}</Choice>
    </div>
    <p className="fk-swap-why">{ft(avoid ? AVOID_TEXT : EASY_TEXT)}</p>
    {avoid && <div className="fk-rest">
      <p className="fk-rest-q">{ft('Has a doctor, physio or surgeon told you to rest it?')}</p>
      <div className="fk-two" role="group" aria-label={ft('Told to rest it')}>
        <Choice on={!value.rest} onClick={() => onChange({ mode: 'avoid', rest: false })}>{ft('No')}</Choice>
        <Choice on={!!value.rest} onClick={() => onChange({ mode: 'avoid', rest: true })}>{ft('Yes')}</Choice>
      </div>
      <p>{ft('If yes, every exercise that loads it is skipped.')}</p>
    </div>}
  </div>
}

/** Onboarding: which areas, then how to treat each. Writes only when she continues. */
export function LimitsStep({ eyebrow, onDone, onBack }) {
  const update = useStore(s => s.update)
  const [picked, setPicked] = useState([])
  const [treat, setTreat] = useState({})
  const [stage, setStage] = useState('pick')
  const toggle = a => setPicked(p => (p.includes(a) ? p.filter(x => x !== a) : AREAS.filter(x => x === a || p.includes(x))))
  const valueOf = a => treat[a] || { mode: 'easy', rest: false }
  const save = () => {
    const today = todayISO()
    update(s => { for (const a of picked) s.bodyLimits = withLimit(s.bodyLimits, a, valueOf(a), today) })
    onDone()
  }
  if (stage === 'treat') return <div className="fk-onb">
    <div className="fk-onb-head">
      <div className="fk-eyebrow">{eyebrow}</div>
      <h1>{ft('Go easy, or')} <em>{ft('avoid')}</em>?</h1>
      <p>{ft('Choose for each area. You can change it later.')}</p>
    </div>
    <div className="fk-list">
      {picked.map(a => <Treat key={a} area={a} value={valueOf(a)} onChange={v => setTreat(t => ({ ...t, [a]: v }))} />)}
    </div>
    <div className="fk-onb-foot">
      <p>{ft(SAFETY)}</p>
      <button type="button" className="btn primary" onClick={save}>{ft('Choose a programme')}</button>
      <button type="button" className="fk-link dim" onClick={() => setStage('pick')}>{ft('Back')}</button>
    </div>
  </div>
  return <div className="fk-onb">
    <div className="fk-onb-head">
      <div className="fk-eyebrow">{eyebrow}</div>
      <h1>{ft('Anything to work')} <em>{ft('around')}</em>?</h1>
      <p>{ft('A joint or tendon that complains, or an old injury. Your plan adapts around it. Nothing? Just continue.')}</p>
    </div>
    <AreaGrid picked={picked} onToggle={toggle} />
    <p className="fk-note">{ft('Sore muscles after training are different: the daily check-in asks about those.')}</p>
    <div className="fk-onb-foot">
      <p>{picked.length ? ft('{0} chosen. You can change this later in Settings.', picked.length) : ft('You can add one later in Settings.')}</p>
      <button type="button" className="btn primary" onClick={() => (picked.length ? setStage('treat') : onDone())}>
        {picked.length ? ft('Next: go easy or avoid') : ft('Nothing right now')}</button>
      <button type="button" className="fk-link dim" onClick={onBack}>{ft('Back')}</button>
    </div>
  </div>
}

// What a limit has changed at the place she is at: exercises decided, skipped, and still to review.
function tally(S, place, area) {
  const out = { changed: 0, skipped: 0, open: 0 }
  for (const g of reviewList(S, S.routines, place)) for (const r of g.rows) {
    if (r.limit?.area !== area) continue
    if (r.state === 'approved') out.changed++
    else if (r.state === 'skipped') out.skipped++
    else out.open++
  }
  return out
}

export default function Limits() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const nav = useNavigate()
  useLang()
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const limits = limitsOf(S)
  const place = currentPlace(S) || placesOf(S)[0] || null
  const set = (area, v) => update(s => { s.bodyLimits = withLimit(s.bodyLimits, area, v, todayISO()) })
  const remove = l => confirmSheet({
    title: ft('Is your {0} better?', ft(AREA_LABEL[l.area]).toLowerCase()),
    message: ft('Your plan goes back to the original exercises.'),
    confirmText: ft('Yes, remove it'),
    onConfirm: () => update(s => { s.bodyLimits = withoutLimit(s.bodyLimits, l.area) }),
  })
  return <div className="narrow fk-page">
    <div className="hdr">
      <button className="iconbtn" data-back="/settings" onClick={() => nav(-1)} aria-label={ft('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, margin: '0 12px', minWidth: 0 }}>
        <h1>{ft('Injuries and')} <em>{ft('limits')}</em>.</h1>
        <div className="sub">{ft('What your plan works around, at every place.')}</div>
      </div>
    </div>
    {!limits.length && <p className="fk-note">{ft('Nothing to work around. Add a joint or tendon and your plan adapts.')}</p>}
    <div className="fk-list">
      {limits.map(l => {
        const t = place ? tally(S, place, l.area) : null
        return <div key={l.area} className="fk-limit">
          <div className="fk-limit-top">
            <span className="fk-limit-name">{ft(AREA_LABEL[l.area])}</span>
            <span className="fk-tag">{ft(l.mode === 'avoid' ? 'Avoid' : 'Go easy')}</span>
            <button type="button" className="fk-link" onClick={() => setEditing(editing === l.area ? null : l.area)}>{editing === l.area ? ft('Done') : ft('Change')}</button>
          </div>
          {l.since && <span className="fk-prog-about">{ft('Since {0}', dayText(l.since))}</span>}
          {editing === l.area
            ? <Treat area={l.area} value={l} onChange={v => set(l.area, v)} />
            : <>
              {l.mode === 'avoid' && <div className="fk-limit-row"><span>{l.rest ? ft('Told to rest it: yes') : ft('Told to rest it: no')}</span>
                <button type="button" className="fk-link" onClick={() => setEditing(l.area)}>{ft('Change')}</button></div>}
              {t && <div className="fk-limit-row"><span>{l.rest ? ft('{0} skipped', t.skipped) : ft('{0} changed, {1} skipped, {2} to review', t.changed, t.skipped, t.open)}</span>
                <button type="button" className="fk-link" onClick={() => nav('/swaps')}>{ft('Review')}</button></div>}
              <div className="fk-limit-row"><span>{ft('It is better now')}</span>
                <button type="button" className="fk-link" onClick={() => remove(l)}>{ft('Remove')}</button></div>
            </>}
        </div>
      })}
    </div>
    {adding
      ? <AreaGrid picked={[]} hide={limits.map(l => l.area)} onToggle={a => { set(a, { mode: 'easy', rest: false }); setAdding(false); setEditing(a) }} />
      : limits.length < AREAS.length && <button type="button" className="fk-link" onClick={() => setAdding(true)}>{limits.length ? ft('Add another') : ft('Add one')}</button>}
    <p className="fk-note">{ft(SAFETY)}</p>
  </div>
}
