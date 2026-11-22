// Home under FitKat opens on today's session, as its mockup draws it: where she trains, the
// session as the title, each exercise as she will run it there with what changed about it, and
// one button. openGym's Home (views/Home.jsx) works the day out and hands it over as `day`; this
// only draws it. Rotation plans and days with two separate sessions keep openGym's own rows in
// the week card, so here they get the header and the notes alone (`day.plain` is false).
import { useStore } from '../store/useStore.js'
import { t, useLang } from '../lib/i18n.js'
import { exerciseNameText, todayISO } from '../lib/format.js'
import Icon from '../components/Icon.jsx'
import { FINISHER_LABEL } from './BoneBalance.jsx'
import { limitTag } from './Limits.jsx'
import { usePlacePick, PlaceNotes } from './PlaceBar.jsx'
import { routineHere } from './place-swaps.js'
import { ft } from './strings.js'
import { amountOf, todayMinutes, todayRows } from './today.js'
import { Wordmark } from './Wordmark.jsx'

// A title with its italic word: the part between asterisks is set in italic, and the names go in
// after the split, so a session called "5*5" stays as she wrote it.
const fill = (s, args) => args.reduce((v, a, i) => v.split('{' + i + '}').join(String(a)), s)
const titled = (template, ...args) => ft(template).split('*').map((part, i) => (i % 2 ? <em key={i}>{fill(part, args)}</em> : fill(part, args)))

const tagText = tag => (
  tag.kind === 'mobility' ? ft('Mobility')
    : tag.kind === 'finisher' ? ft(FINISHER_LABEL[tag.which] || 'Added')
      : tag.kind === 'added' ? ft('Added')
        : tag.kind === 'limit' ? limitTag(tag)
          : tag.kind === 'swapped' ? ft('Swapped')
            : ft('Sore area'))

export default function Today({ day, gear }) {
  const S = useStore(s => s.S)
  useLang()
  const { places, place, pick } = usePlacePick()
  const training = day.plain && !day.active && !day.done && day.routines.length > 0
  const rows = training ? todayRows(S, day.routines.map(r => routineHere(S, r) || r), todayISO()) : []
  let title, sub = ''
  if (day.active) title = titled(day.editing ? '{0}, *being edited*.' : '{0}, *in progress*.', day.active.name || ft('Workout'))
  else if (!day.plain) title = titled('Today.')
  else if (day.done) { title = titled('*Done* for today.'); sub = day.done.name || '' }
  else if (!day.routines.length) { title = titled('*Rest* day.'); sub = day.nextLabel }
  else {
    title = place ? titled('{0}, *at {1}*.', day.name, place.name) : titled('{0}.', day.name)
    sub = (rows.length === 1 ? ft('1 exercise · about {0} minutes', todayMinutes(rows)) : ft('{0} exercises · about {1} minutes', rows.length, todayMinutes(rows)))
      + (day.rescheduled ? ' · ' + t('rescheduled') : '')
  }
  return <div className="fk-today">
    <div className="fk-today-top">
      <Wordmark size={24} />
      <span className="fk-today-tools">
        {places.length > 0 && <button type="button" className="fk-place-menu" onClick={pick} aria-label={ft('Training at {0}, change place', place ? place.name : '')}>
          <span>{place ? place.name : ft('Choose a place')}</span><Icon name="chevronDown" />
        </button>}
        {gear}
      </span>
    </div>
    <div className="fk-eyebrow">{day.date}</div>
    <h1 className="fk-today-title">{title}</h1>
    {sub && <p className="fk-today-sub">{sub}</p>}
    <PlaceNotes />
    {rows.length > 0 && <ul className="fk-today-list">
      {rows.map((row, i) => <li key={row.id + '-' + i}>
        <div className="fk-today-ex">
          <span className="fk-today-name">{exerciseNameText(row.ex)}</span>
          {row.tags.length > 0 && <span className="fk-today-tags">{row.tags.map(tag => <span key={tag.kind} className="fk-tag">{tagText(tag)}</span>)}</span>}
        </div>
        <span className="fk-today-amount">{amountOf(row.cfg)}</span>
      </li>)}
    </ul>}
    {day.plain && (training || day.active) && <button type="button" className="btn primary fk-today-start" data-tour="today" onClick={day.onStart}>
      {day.active ? (day.editing ? t('Edit') : t('Resume')) : ft('Start {0}', day.name)}
    </button>}
    {day.plain && !day.active && <button type="button" className="fk-link fk-today-other" data-tour={training ? undefined : 'today'} onClick={day.onOther}>{t('Choose a different workout')}</button>}
  </div>
}
