// Review swaps: every exercise the place's kit cannot do, with a suggested replacement she
// approves or turns down. Two refusals and the question becomes whether to skip it there. Nothing
// in a routine changes until she has approved it; every button here only writes a decision
// (place-swaps.js), and the routines themselves are never rewritten.
//
// An exercise that loads one of her limits (limits.js) is reviewed here too, and says so: the next
// step of its ladder with the reason it asks less of the joint, or "Keep it, easier".
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { useLang } from '../lib/i18n.js'
import { exerciseNameText, todayISO } from '../lib/format.js'
import { EXIDX } from '../lib/exercises.js'
import { effectiveRoutineIds } from '../lib/history.js'
import { exercisePicker } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Thumb } from '../components/Media.jsx'
import { ft } from './strings.js'
import { placesOf } from './places.js'
import {
  currentPlace, reviewList, undecidedCount, approveAll, fitsPlace, swapKey,
  withApproved, withDeclined, withSkipped, withCleared, withKept, sessionCount,
} from './place-swaps.js'
import { AREA_LABEL, limitOn } from './limits.js'
import { limitTag } from './Limits.jsx'
import { fillKey, fillEntries, fillSuggestions, withFillAdded, withFillRemoved } from './fills.js'
import { canDrop, droppedList, dropSession, bringBack } from './drops.js'

const nameOf = ex => (ex ? exerciseNameText(ex) : '')
// Why this one: what it shares with the exercise it stands in for, and what it uses.
const reason = (row, s) => [
  s.loose ? ft('Works nearby muscles') : ft('Same muscle'),
  s.sameMovement ? ft('same movement') : ft('similar movement'),
  ft('{0} sets kept', row.cfg.sets || 0),
].join(', ') + '.'

// A row she has not answered yet: a suggestion, the skip question, or "Keep or skip?".
const waits = row => row.state === 'pending' || row.state === 'ask-rest'

function Row({ S, place, routine, row, write, open, onOpen }) {
  const key = swapKey(place.id, routine.id, row.cfg.id)
  const from = nameOf(row.ex)
  // A row about a limit: its decisions carry the area, and its reasons come from the ladder.
  const lim = row.limit?.area
  const area = lim ? ft(AREA_LABEL[lim]).toLowerCase() : ''
  // "No, let me choose": the whole library, opened on the same muscle and the kit of the place
  // she trains at, with search (openGym's own picker). What she picks has to be something the
  // place can do, that is not in the session already, and that does not load one of her limits.
  const choose = () => {
    const say = text => useUI.getState().toast(text)
    const picker = exercisePicker(ex => {
      if (!ex?.id) return
      if (!EXIDX[ex.id]) return say(ft('Choose one from the library.'))
      if (ex.id === row.cfg.id || routine.ex.some(e => e.id === ex.id)) return say(ft('{0} is already in this session.', nameOf(ex)))
      if (!fitsPlace(ex, place)) return say(ft('{0} has no kit for that one.', place.name))
      const loads = limitOn(S, ex.id)
      if (loads) return say(ft('That one loads your {0}. Choose another.', ft(AREA_LABEL[loads.area]).toLowerCase()))
      write(m => withApproved(m, key, ex.id))
      picker.close()
    }, { title: ft('Instead of {0}', from), like: row.cfg.id })
  }
  // One question at a time: the others wait as a line each, and a tap opens one.
  if (waits(row) && !open) return <button type="button" className="fk-swap done fk-swap-wait" onClick={onOpen}>
    <span className="fk-swap-names">{lim && <span className="fk-tag">{limitTag(row.limit)}</span>}<span className="fk-swap-to">{from}</span></span>
    <span className="fk-prog-about">{ft('Waiting')}</span>
  </button>
  // It only involves an area she was told to rest: kept unless she says otherwise.
  if (row.state === 'ask-rest') return <div className="fk-swap open">
    <div className="fk-swap-names"><span className="fk-swap-to">{from}</span></div>
    <div className="fk-swap-card">
      <div className="fk-tag">{limitTag(row.limit)}</div>
      <p className="fk-swap-why">{ft('This involves your {0} without training it. Keep it, or skip it while you rest?', area)}</p>
      <div className="fk-two">
        <button type="button" className="btn primary" onClick={() => write(m => withKept(m, key, lim))}>{ft('Keep')}</button>
        <button type="button" className="btn fk-outline" onClick={() => write(m => withSkipped(m, key, undefined, lim))}>{ft('Skip')}</button>
      </div>
    </div>
  </div>
  if (row.state === 'kept') return <div className="fk-swap done">
    <div className="fk-swap-names"><span className="fk-tag">{limitTag(row.limit)}</span><span className="fk-swap-to">{from}</span><span className="fk-prog-about">{ft('Kept')}</span></div>
    <button type="button" className="fk-link dim" onClick={() => write(m => withCleared(m, key))}>{ft('Change')}</button>
  </div>
  if (row.state === 'approved') return <div className="fk-swap done">
    <div className="fk-swap-names">{lim && <span className="fk-tag">{limitTag(row.limit)}</span>}
      {row.keep ? <><span className="fk-swap-to">{from}</span><span className="fk-prog-about">{ft('Kept, easier')}</span></>
        : <><span className="fk-swap-from">{from}</span><span className="fk-swap-to">{nameOf(row.to)}</span></>}</div>
    <span className="fk-tag fits"><Icon name="check" /> {ft('Approved')}</span>
    <button type="button" className="fk-link dim" onClick={() => write(m => withCleared(m, key))}>{ft('Undo')}</button>
  </div>
  if (row.state === 'skipped') return <div className="fk-swap done">
    <div className="fk-swap-names">{lim && <span className="fk-tag">{limitTag(row.limit)}</span>}<span className="fk-swap-to">{from}</span>
      <span className="fk-prog-about">{row.rest ? ft('Skipped: you were told to rest your {0}', area) : ft('Skipped at {0}', place.name)}</span></div>
    {!row.rest && <button type="button" className="fk-link dim" onClick={() => write(m => withCleared(m, key))}>{ft('Restore')}</button>}
  </div>
  if (row.state === 'pending') {
    const s = row.suggestion
    return <div className="fk-swap open">
      <div className="fk-swap-ex"><Thumb ex={row.ex} /><div><div className="fk-eyebrow">{ft('Instead of')}</div><div className="fk-swap-from big">{from}</div></div></div>
      <div className="fk-swap-ex"><Thumb ex={s.ex} /><div><div className="fk-tag">{lim ? limitTag(row.limit) : row.declined.length ? ft('Second suggestion') : ft('Suggested')}</div>
        <div className="fk-swap-to big">{s.keep ? ft('Keep it, easier') : nameOf(s.ex)}{s.hold ? ' · ' + ft('hold') : ''}</div></div></div>
      <p className="fk-swap-why">{lim ? ft(s.why) : reason(row, s)}</p>
      {/* A stand-in for the kit that involves an area she rests: said, so that approving it is her call. */}
      {row.involves && <p className="fk-swap-why">{ft('This involves your {0} without training it.', ft(AREA_LABEL[row.involves]).toLowerCase())}</p>}
      <div className="fk-two">
        <button type="button" className="btn primary" onClick={() => write(m => (s.keep ? withKept(m, key, lim) : withApproved(m, key, s.ex.id, undefined, lim)))}>{ft('Approve')}</button>
        <button type="button" className="btn fk-outline" onClick={() => write(m => withDeclined(m, key, s.ex.id, undefined, lim))}>{row.declined.length ? ft('Reject') : ft('Suggest another')}</button>
      </div>
    </div>
  }
  // Two refusals, or nothing the place can offer: the skip question.
  return <div className="fk-swap open" role="group" aria-label={ft('Do you want to skip this exercise?')}>
    <div className="fk-swap-to big">{ft('Do you want to skip this exercise?')}</div>
    {lim && <div className="fk-tag">{limitTag(row.limit)}</div>}
    <p className="fk-swap-why">{lim
      ? ft('{0} has nothing gentler left for your {1}. Skipping takes it out of {2} while you train at {3}.', from, area, routine.name, place.name)
      : ft('{0} has no approved replacement. Skipping takes it out of {1} while you train at {2}. It stays in your plan everywhere else.', from, routine.name, place.name)}</p>
    <div className="fk-two">
      <button type="button" className="btn primary" onClick={() => write(m => withSkipped(m, key, undefined, lim))}>{ft('Yes, skip it')}</button>
      {lim ? <button type="button" className="btn fk-outline" onClick={() => write(m => withKept(m, key, lim))}>{ft('No, keep it')}</button>
        : <button type="button" className="btn fk-outline" onClick={choose}>{ft('No, let me choose')}</button>}
    </div>
  </div>
}

// Under a routine's name, when resting an area has taken exercises out of it: how much is left.
// With "Build your own": exercises she adds in place of the ones resting took out (fills.js).
// And "Drop it for now" for a short session: off her week until the area is better (drops.js).
// With one exercise left, or none, dropping is the main button.
function RestLine({ S, routine, place, writeFills, onDrop }) {
  const [open, setOpen] = useState(false)
  const c = sessionCount(S, routine, place)
  if (!c.resting.length) return null
  const areas = c.resting.map(a => ft(AREA_LABEL[a]).toLowerCase()).join(' ' + ft('and') + ' ')
  const key = fillKey(place.id, routine.id)
  const added = fillEntries(S, routine, place).map(e => EXIDX[e.id])
  const more = open ? fillSuggestions(S, routine, place) : []
  const droppable = c.short && !added.length && !open && canDrop(S, routine.id)
  const lone = c.kept <= 1
  return <div className="fk-fill">
    <p className={'fk-rest-line' + (c.short ? ' short' : '')}>
      {c.short && !added.length && <span className="fk-tag">{ft('Short session')}</span>}
      <span>{ft('{0} of {1} exercises while you rest your {2}.', c.kept, c.total, areas)}{added.length ? ' ' + ft('{0} added.', added.length) : ''}</span>
    </p>
    {added.map(ex => <div key={ex.id} className="fk-swap done">
      <div className="fk-swap-names"><span className="fk-tag fits">{ft('Added')}</span><span className="fk-swap-to">{nameOf(ex)}</span></div>
      <button type="button" className="fk-link dim" onClick={() => writeFills(m => withFillRemoved(m, key, ex.id))}>{ft('Remove')}</button>
    </div>)}
    {open && <p className="fk-swap-why">{ft('These leave your {0} alone and use what {1} has. Nothing you said is sore today.', areas, place.name)}</p>}
    {more.map(s => <div key={s.ex.id} className="fk-swap done">
      <div className="fk-swap-names"><span className="fk-swap-to">{nameOf(s.ex)}</span><span className="fk-prog-about">{ft(s.why)}</span></div>
      <button type="button" className="fk-link" onClick={() => writeFills(m => withFillAdded(m, key, s.ex.id))}>{ft('Add')}</button>
    </div>)}
    {open && !more.length && <p className="fk-swap-why">{ft('Nothing more to suggest here.')}</p>}
    {droppable && lone && <>
      <p className="fk-swap-why">{ft('Dropping takes it off your week until your {0} is better.', areas)}</p>
      <button type="button" className="btn primary" onClick={() => onDrop(c.resting[0])}>{ft('Drop it for now')}</button>
    </>}
    <button type="button" className="fk-link" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? ft('Done adding') : added.length ? ft('Add more') : ft('Build your own')}</button>
    {droppable && !lone && <button type="button" className="fk-link" onClick={() => onDrop(c.resting[0])}>{ft('Drop it for now')}</button>}
  </div>
}

/**
 * The review itself, shared by its own screen and the last step of onboarding. With `only`
 * (routine ids) it covers those sessions alone, today's when it is opened from Home, and
 * `onWhole` opens the rest of the plan.
 */
export function SwapReview({ place, onDone, only, onWhole }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const write = fn => update(s => { s.placeSwaps = fn(s.placeSwaps) })
  const writeFills = fn => update(s => { s.placeFills = fn(s.placeFills) })
  const routines = only ? S.routines.filter(r => only.includes(r.id)) : S.routines
  const groups = reviewList(S, routines, place)
  const total = groups.reduce((n, g) => n + g.rows.length, 0)
  const left = undecidedCount(S, routines, place)
  // Sessions she has dropped for now keep their place in the list, with the way back.
  // The first unanswered row is open; she can open another by tapping it.
  const [picked, setPicked] = useState(null)
  const idOf = (g, row) => g.routine.id + '/' + row.cfg.id
  const waiting = groups.flatMap(g => g.rows.filter(waits).map(row => idOf(g, row)))
  const openId = waiting.includes(picked) ? picked : waiting[0]
  const dropped = droppedList(S)
  const blocks = routines.map(r => groups.find(g => g.routine.id === r.id) || dropped.find(d => d.routine.id === r.id)).filter(Boolean)
  const more = only ? undecidedCount(S, S.routines, place) - left : 0
  const whole = only && onWhole && <button type="button" className="fk-link" onClick={onWhole}>{more > 0 ? ft('Review the whole plan ({0} more)', more) : ft('Review the whole plan')}</button>
  if (!blocks.length) return <>
    <p className="fk-note">{only ? ft('Today\u2019s session fits {0}. Nothing to swap.', place.name) : ft('Everything in your plan fits {0}. Nothing to swap.', place.name)}</p>
    {whole}
    {onDone && <button type="button" className="btn primary" onClick={onDone}>{ft('Done')}</button>}
  </>
  return <>
    {total > 0 && <div className="fk-progress" role="img" aria-label={ft('{0} of {1} reviewed', total - left, total)}>
      <div className="fk-progress-bar"><div style={{ width: (100 * (total - left) / total) + '%' }} /></div>
      <span>{ft('{0} of {1} reviewed', total - left, total)}</span>
    </div>}
    {blocks.map(g => (g.rows ? <div key={g.routine.id} className="fk-swap-group">
      <h4 className="sec">{g.routine.name}</h4>
      <RestLine S={S} routine={g.routine} place={place} writeFills={writeFills} onDrop={lim => update(s => { dropSession(s, g.routine.id, lim) })} />
      {g.rows.map(row => <Row key={row.cfg.id} S={S} place={place} routine={g.routine} row={row} write={write}
        open={idOf(g, row) === openId} onOpen={() => setPicked(idOf(g, row))} />)}
    </div> : <div key={g.routine.id} className="fk-swap-group">
      <h4 className="sec">{g.routine.name}</h4>
      <div className="fk-fill">
        <p className="fk-rest-line short">
          <span className="fk-tag">{ft('Dropped')}</span>
          <span>{ft('Off your week while you rest your {0}. It comes back when you say it is better.', ft(AREA_LABEL[g.lim]).toLowerCase())}</span>
        </p>
        <button type="button" className="fk-link" onClick={() => update(s => { bringBack(s, g.routine.id) })}>{ft('Bring it back')}</button>
      </div>
    </div>))}
    <div className="fk-onb-foot">
      {left > 0 && <button type="button" className="fk-link" onClick={() => write(m => approveAll(m, S, routines, place))}>{ft('Approve all suggestions')}</button>}
      {whole}
      {onDone && <button type="button" className="btn primary" onClick={onDone}>{left ? ft('Finish later') : ft('Done')}</button>}
    </div>
  </>
}

export default function ReviewSwaps() {
  const S = useStore(s => s.S)
  const nav = useNavigate()
  useLang()
  const place = currentPlace(S) || placesOf(S)[0] || null
  // Opened from Home it covers today's session only (/swaps?scope=today); the whole plan is one tap away.
  const [params] = useSearchParams()
  const [all, setAll] = useState(params.get('scope') !== 'today')
  const todays = effectiveRoutineIds(S, todayISO())
  const only = !all && todays.length ? todays : null
  return <div className="narrow fk-page">
    <div className="hdr">
      <button className="iconbtn" data-back="/home" onClick={() => nav('/home')} aria-label={ft('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, margin: '0 12px', minWidth: 0 }}>
        <h1>{ft('Swaps for')} <em>{place ? place.name : ''}</em>.</h1>
        <div className="sub">{only ? ft('Today\u2019s session. Nothing changes until you approve.') : ft('Nothing changes until you approve.')}</div>
      </div>
    </div>
    {place ? <SwapReview place={place} onDone={() => nav('/home')} only={only} onWhole={() => setAll(true)} /> : <p className="fk-note">{ft('Add a place first, in Settings.')}</p>}
  </div>
}
