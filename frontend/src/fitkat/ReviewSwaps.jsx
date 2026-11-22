// Review swaps: every exercise the place's kit cannot do, with a suggested replacement she
// approves or turns down. Two refusals and the question becomes whether to skip it there. Nothing
// in a routine changes until she has approved it; every button here only writes a decision
// (place-swaps.js), and the routines themselves are never rewritten.
//
// An exercise that loads one of her limits (limits.js) is reviewed here too, and says so: the next
// step of its ladder with the reason it asks less of the joint, or "Keep it, easier". Under Go easy
// the skip question also lets her choose her own from the library.
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
  currentPlace, reviewList, undecidedCount, approveAll, fitsPlace, swapKey, FORM_CHECK, questionIndex, rowSig,
  withApproved, withChosen, withDeclined, withSkipped, withCleared, withKept, sessionCount,
} from './place-swaps.js'
import { AREA_LABEL, limitOn, limitsOf } from './limits.js'
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

// A row she has not answered yet: a suggestion, the skip question, or "Keep or skip?". The same
// rows undecidedCount counts (place-swaps.js).
const waits = row => row.state !== 'approved' && row.state !== 'skipped' && row.state !== 'kept'

function Row({ S, place, routine, row, write, open, onOpen, taken, same }) {
  // Asked once: her answer goes to every session at this place whose row shows the same thing
  // (place-swaps.js questionIndex), and so does "Undo". `same` always holds this row's own key.
  const keys = same.length ? same.map(x => x.key) : [swapKey(place.id, routine.id, row.cfg.id)]
  const each = fn => write(m => keys.reduce((acc, key) => fn(acc, key), m))
  const also = same.filter(x => x.routine.id !== routine.id).map(x => x.routine.name)
  const alsoLine = also.length > 0 && <span className="fk-prog-about fk-also">{ft('Also in {0}', also.join(', '))}</span>
  const from = nameOf(row.ex)
  // A row about a limit: its decisions carry the area, and its reasons come from the ladder.
  const lim = row.limit?.area
  const area = lim ? ft(AREA_LABEL[lim]).toLowerCase() : ''
  // "No, let me choose": the whole library, opened on the same muscle and the kit of the place
  // she trains at, with search (openGym's own picker). What she picks has to be something the
  // place can do, that is not in the session already, and that does not load one of her limits:
  // those are left out of the list, and refused if one is reached another way. Under Go easy the
  // same question ends a ladder that has run out (owner, 22 Nov). Avoid does not offer it.
  const canChoose = !lim || row.limit.mode === 'easy'
  const choose = () => {
    const say = text => useUI.getState().toast(text)
    const picker = exercisePicker(ex => {
      if (!ex?.id) return
      if (!EXIDX[ex.id]) return say(ft('Choose one from the library.'))
      if (FORM_CHECK.test(ex.n || '')) return say(ft('That one shows a position, it is not an exercise. Choose another.'))
      if (ex.id === row.cfg.id || routine.ex.some(e => e.id === ex.id) || taken.includes(ex.id)) return say(ft('{0} is already in this session.', nameOf(ex)))
      if (!fitsPlace(ex, place)) return say(ft('{0} has no kit for that one.', place.name))
      const loads = limitOn(S, ex.id)
      if (loads) return say(ft('That one loads your {0}. Choose another.', ft(AREA_LABEL[loads.area]).toLowerCase()))
      each((m, key) => (lim ? withChosen(m, key, ex.id, lim) : withApproved(m, key, ex.id)))
      picker.close()
    }, { title: ft('Instead of {0}', from), like: row.cfg.id, allow: limitsOf(S).length ? e => !FORM_CHECK.test(e.n || '') && !limitOn(S, e.id) : e => !FORM_CHECK.test(e.n || '') })
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
      {also.length > 0 && <p className="fk-swap-why fk-also">{ft('Your answer also counts for {0}.', also.join(', '))}</p>}
      <div className="fk-two">
        <button type="button" className="btn primary" onClick={() => each((m, key) => withKept(m, key, lim))}>{ft('Keep')}</button>
        <button type="button" className="btn fk-outline" onClick={() => each((m, key) => withSkipped(m, key, undefined, lim))}>{ft('Skip')}</button>
      </div>
    </div>
  </div>
  if (row.state === 'kept') return <div className="fk-swap done">
    <div className="fk-swap-names"><span className="fk-tag">{limitTag(row.limit)}</span><span className="fk-swap-to">{from}</span><span className="fk-prog-about">{ft('Kept')}</span>{alsoLine}</div>
    <button type="button" className="fk-link dim" onClick={() => each((m, key) => withCleared(m, key))}>{ft('Change')}</button>
  </div>
  if (row.state === 'approved') return <div className="fk-swap done">
    <div className="fk-swap-names">{lim && <span className="fk-tag">{limitTag(row.limit)}</span>}
      {row.keep ? <><span className="fk-swap-to">{from}</span><span className="fk-prog-about">{ft('Kept, easier')}</span></>
        : <><span className="fk-swap-from">{from}</span><span className="fk-swap-to">{nameOf(row.to)}</span></>}{alsoLine}</div>
    <span className="fk-tag fits"><Icon name="check" /> {ft('Approved')}</span>
    <button type="button" className="fk-link dim" onClick={() => each((m, key) => withCleared(m, key))}>{ft('Undo')}</button>
  </div>
  if (row.state === 'skipped') return <div className="fk-swap done">
    <div className="fk-swap-names">{lim && <span className="fk-tag">{limitTag(row.limit)}</span>}<span className="fk-swap-to">{from}</span>
      <span className="fk-prog-about">{row.rest ? ft('Skipped: you were told to rest your {0}', area) : ft('Skipped at {0}', place.name)}</span>{!row.rest && alsoLine}</div>
    {!row.rest && <button type="button" className="fk-link dim" onClick={() => each((m, key) => withCleared(m, key))}>{ft('Restore')}</button>}
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
      {also.length > 0 && <p className="fk-swap-why fk-also">{ft('Your answer also counts for {0}.', also.join(', '))}</p>}
      <div className="fk-two">
        <button type="button" className="btn primary" onClick={() => each((m, key) => (s.keep ? withKept(m, key, lim) : withApproved(m, key, s.ex.id, undefined, lim)))}>{ft('Approve')}</button>
        <button type="button" className="btn fk-outline" onClick={() => each((m, key) => withDeclined(m, key, s.ex.id, undefined, lim))}>{(lim ? row.more : !row.declined.length) ? ft('Suggest another') : ft('Reject')}</button>
      </div>
    </div>
  }
  // Two refusals, or nothing the place can offer: the skip question, with what she turned down.
  // "Keep it, easier" is refused under the exercise's own id, and is listed by what it offered.
  const said = [...new Set((row.declined || []).map(id => (id === row.cfg.id ? ft('Keep it, easier') : EXIDX[id] ? nameOf(EXIDX[id]) : '')).filter(Boolean))]
  return <div className="fk-swap open" role="group" aria-label={ft('Do you want to skip this exercise?')}>
    <div className="fk-swap-to big">{ft('Do you want to skip this exercise?')}</div>
    {lim && <div className="fk-tag">{limitTag(row.limit)}</div>}
    <p className="fk-swap-why">{lim
      ? ft('{0} has nothing gentler left for your {1}. Skipping takes it out of {2} while you train at {3}.', from, area, routine.name, place.name)
      : ft('{0} has no approved replacement. Skipping takes it out of {1} while you train at {2}. It stays in your plan everywhere else.', from, routine.name, place.name)}</p>
    {also.length > 0 && <p className="fk-swap-why fk-also">{ft('Your answer also counts for {0}.', also.join(', '))}</p>}
    {said.length > 0 && <div className="fk-said-no"><span className="fk-eyebrow">{ft('You said no to')}</span>{said.map(n => <span key={n}>{n}</span>)}</div>}
    <div className="fk-two">
      <button type="button" className="btn primary" onClick={() => each((m, key) => withSkipped(m, key, undefined, lim))}>{ft('Yes, skip it')}</button>
      {canChoose ? <button type="button" className="btn fk-outline" onClick={choose}>{ft('No, let me choose')}</button>
        : <button type="button" className="btn fk-outline" onClick={() => each((m, key) => withKept(m, key, lim))}>{ft('No, keep it')}</button>}
    </div>
    {/* Go easy: keeping it is still open, also after she turned it down a step earlier. */}
    {lim && canChoose && <button type="button" className="fk-link" onClick={() => each((m, key) => withKept(m, key, lim))}>{ft('No, keep it')}</button>}
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
 * The review itself, shared by its own screen, the setup and the start of a session. With `only`
 * (routine ids) it covers those sessions alone, today's when it is opened from Home, and
 * `onWhole` opens the rest of the plan. `mustFinish`: no way on until everything is answered (the
 * start of a session, DueReview.jsx), and then the button reads `doneLabel`.
 */
export function SwapReview({ place, onDone, only, onWhole, mustFinish = false, doneLabel }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const write = fn => update(s => { s.placeSwaps = fn(s.placeSwaps) })
  const writeFills = fn => update(s => { s.placeFills = fn(s.placeFills) })
  const routines = only ? S.routines.filter(r => only.includes(r.id)) : S.routines
  const groups = reviewList(S, routines, place)
  // The same question in other sessions of her plan, also ones this review does not list.
  const index = questionIndex(S, S.routines, place)
  const left = undecidedCount(S, routines, place)
  // The bar counts questions, not rows: the same exercise asked about in two sessions is one.
  const shown = groups.flatMap(g => g.rows.map(row => [rowSig(row), waits(row)]))
  const total = new Set(shown.map(x => x[0])).size
  const open = new Set(shown.filter(x => x[1]).map(x => x[0])).size
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
    {total > 0 && <div className="fk-progress" role="img" aria-label={ft('{0} of {1} reviewed', total - open, total)}>
      <div className="fk-progress-bar"><div style={{ width: (100 * (total - open) / total) + '%' }} /></div>
      <span>{ft('{0} of {1} reviewed', total - open, total)}</span>
    </div>}
    {blocks.map(g => (g.rows ? <div key={g.routine.id} className="fk-swap-group">
      <h4 className="sec">{g.routine.name}</h4>
      <RestLine S={S} routine={g.routine} place={place} writeFills={writeFills} onDrop={lim => update(s => { dropSession(s, g.routine.id, lim) })} />
      {g.rows.map(row => <Row key={row.cfg.id} S={S} place={place} routine={g.routine} row={row} write={write}
        taken={g.rows.filter(r => r !== row && r.state === 'approved' && r.to && !r.keep).map(r => r.to.id)}
        same={index.get(rowSig(row)) || []}
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
      {onDone && !(mustFinish && left > 0) && <button type="button" className="btn primary" onClick={onDone}>{left ? ft('Finish later') : doneLabel || ft('Done')}</button>}
    </div>
  </>
}

export default function ReviewSwaps() {
  const S = useStore(s => s.S)
  const nav = useNavigate()
  useLang()
  // Opened from Home it covers today's session only (/swaps?scope=today); the whole plan is one tap away.
  // From Places it can be about a place she is not at (/swaps?place=id).
  const [params] = useSearchParams()
  const asked = params.get('place')
  const place = (asked && placesOf(S).find(p => String(p.id) === asked)) || currentPlace(S) || placesOf(S)[0] || null
  const [all, setAll] = useState(params.get('scope') !== 'today')
  const todays = effectiveRoutineIds(S, todayISO())
  const only = !all && todays.length ? todays : null
  return <div className="narrow fk-page">
    <div className="hdr">
      <button className="iconbtn" data-back={asked ? '/places' : '/home'} onClick={() => nav(asked ? '/places' : '/home')} aria-label={ft('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, margin: '0 12px', minWidth: 0 }}>
        <h1>{ft('Swaps for')} <em>{place ? place.name : ''}</em>.</h1>
        <div className="sub">{only ? ft('Today\u2019s session. Nothing changes until you approve.') : ft('Nothing changes until you approve.')}</div>
      </div>
    </div>
    {place ? <SwapReview place={place} onDone={() => nav(asked ? '/places' : '/home')} only={only} onWhole={() => setAll(true)} /> : <p className="fk-note">{ft('Add a place first, in Settings.')}</p>}
  </div>
}
