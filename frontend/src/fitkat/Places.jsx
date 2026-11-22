// Places and equipment: every place she trains at, what each has, and which one she is at now.
// The places are openGym's equipment profiles, so switching here switches the plates, dumbbells
// and bars with it (lib/gym-inventory.js switchGym), as Settings → Equipment always did.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useLang } from '../lib/i18n.js'
import { ACC_V, profileEquipment } from '../lib/equipment.js'
import { applyAutoGym } from '../lib/gym-auto.js'
import { MOBILE } from '../lib/mobile.js'
import { confirmSheet, menuSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Row, Section, Switch } from '../components/ui.jsx'
import { ft } from './strings.js'
import KitPicker from './KitPicker.jsx'
import { PLACE_KINDS, addPlaces, kitDetail, makePlace, placesOf, removePlace } from './places.js'
import { skippedKeys, swappedCount, withRestored } from './place-swaps.js'
import { switchPlace } from './place-switch.jsx'

/** The row in Settings → Equipment that leads here. */
export function PlacesLink() {
  const nav = useNavigate()
  return <Section>
    <Row icon="house" iconTint="var(--acc)" title={ft('Places and equipment')} subtitle={ft('Your places, and what each one has.')}
      accessory="chevron" onClick={() => nav('/places')} />
  </Section>
}

// A name no other place has: "Home", then "Home 2".
function freeName(S, base) {
  const taken = new Set(placesOf(S).map(p => p.name))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(base + ' ' + n)) n++
  return base + ' ' + n
}

export default function Places() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const nav = useNavigate()
  useLang()
  const [editing, setEditing] = useState(null)
  const places = placesOf(S)
  const setKit = (id, equipment) => update(s => {
    const p = placesOf(s).find(x => x.id === id)
    if (p) { p.equipment = equipment; p.accV = ACC_V; p._ts = Date.now() }
  })
  const add = () => menuSheet({
    title: ft('Add a place'),
    items: PLACE_KINDS.map(k => ({
      label: ft(k.label), sub: k.hint ? ft(k.hint) : undefined,
      onClick: () => {
        const place = makePlace(k.kind, freeName(S, ft(k.name)))
        update(s => { addPlaces(s, [place]) })
        setEditing(place.id)
      },
    })),
  })
  const remove = p => confirmSheet({
    title: ft('Remove {0}?', p.name), message: ft('Its equipment list and approved swaps go with it.'),
    confirmText: ft('Remove'), danger: true,
    onConfirm: () => update(s => { removePlace(s, p.id) }),
  })
  return <div className="narrow fk-page">
    <div className="hdr">
      <button className="iconbtn" data-back="/settings" onClick={() => nav('/settings/equipment')} aria-label={ft('Settings')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, margin: '0 12px', minWidth: 0 }}><h1>{ft('Places and')} <em>{ft('equipment')}</em>.</h1></div>
    </div>
    <div className="fk-list">
      {places.map(p => {
        const here = p.id === S.activeEquipId
        const open = editing === p.id
        const swapped = swappedCount(S, S.routines, p)
        const skipped = skippedKeys(S, S.routines, p)
        return <div key={p.id} className="fk-place">
          <div className="fk-place-top">
            <span className="fk-place-name">{p.name}</span>
            {here && <span className="fk-tag">{ft('Here now')}</span>}
            <span style={{ flex: 1 }} />
            <button type="button" className="fk-link" onClick={() => setEditing(open ? null : p.id)}>{open ? ft('Done') : ft('Edit kit')}</button>
          </div>
          <div className="fk-prog-about">{kitDetail(p, ft)}</div>
          {swapped > 0 && <div className="fk-limit-row">
            <span>{swapped === 1 ? ft('1 approved swap') : ft('{0} approved swaps', swapped)}</span>
            <button type="button" className="fk-link" onClick={() => nav('/swaps?place=' + encodeURIComponent(p.id))}>{ft('Review')}</button>
          </div>}
          {skipped.length > 0 && <div className="fk-limit-row">
            <span>{skipped.length === 1 ? ft('1 skipped exercise') : ft('{0} skipped exercises', skipped.length)}</span>
            <button type="button" className="fk-link" onClick={() => update(s => { s.placeSwaps = withRestored(s.placeSwaps, skipped) })}>{ft('Restore')}</button>
          </div>}
          {open && <>
            <input className="input" defaultValue={p.name} aria-label={ft('Name')} maxLength={40}
              onChange={e => { const v = e.target.value.trim(); if (v) update(s => { const x = placesOf(s).find(y => y.id === p.id); if (x) { x.name = v; x._ts = Date.now() } }) }} />
            <KitPicker equipment={profileEquipment(p)} onChange={eq => setKit(p.id, eq)} />
          </>}
          <div className="fk-place-actions">
            {!here && <button type="button" className="fk-link" onClick={() => switchPlace(p)}>{ft('Train here')}</button>}
            {places.length > 1 && <button type="button" className="fk-link dim" onClick={() => remove(p)}>{ft('Remove')}</button>}
          </div>
        </div>
      })}
      <button type="button" className="fk-link" style={{ alignSelf: 'flex-start', marginTop: 8 }} onClick={add}>{ft('Add a place')}</button>
    </div>
    <h4 className="sec fk-places-sec">{ft('Switching')}</h4>
    <div className="fk-limit-row">
      <span id="fk-ask-place">{ft('Ask where I am training when I start a session')}</span>
      <Switch checked={S.fitkatAskPlace !== false} onChange={v => update(s => { s.fitkatAskPlace = v })} aria-labelledby="fk-ask-place" />
    </div>
    <div className="fk-limit-row">
      <span id="fk-auto-place">{ft('Switch by itself when I arrive at a saved gym')}</span>
      <Switch checked={S.fitkatAutoPlace === true} onChange={v => update(s => { s.fitkatAutoPlace = v })} aria-labelledby="fk-auto-place" />
    </div>
    {/* Arriving is the phone's to notice (lib/gym-auto.js, through the gym reminder's places). A browser
        has no such thing, so there the arrival is pretended, through the same code a real one runs. */}
    {S.fitkatAutoPlace === true && (MOBILE
      ? <p className="fk-swap-why">{ft('It follows the places you save under Settings, Gym reminder.')}</p>
      : <div className="fk-pretend">
        <p className="fk-swap-why">{ft('A browser cannot tell where you are, so arriving is pretended here. In the phone app it follows the places saved under Gym reminder.')}</p>
        {places.filter(p => p.id !== S.activeEquipId).map(p => <button key={p.id} type="button" className="btn fk-outline" onClick={() => applyAutoGym(p.id)}>{ft('Pretend I arrived at {0}', p.name)}</button>)}
      </div>)}
  </div>
}
