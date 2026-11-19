// Places and equipment: every place she trains at, what each has, and which one she is at now.
// The places are openGym's equipment profiles, so switching here switches the plates, dumbbells
// and bars with it (lib/gym-inventory.js switchGym), as Settings → Equipment always did.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useLang } from '../lib/i18n.js'
import { ACC_V, profileEquipment } from '../lib/equipment.js'
import { switchGym } from '../lib/gym-inventory.js'
import { confirmSheet, menuSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Row, Section } from '../components/ui.jsx'
import { ft } from './strings.js'
import KitPicker from './KitPicker.jsx'
import { PLACE_KINDS, addPlaces, kitSummary, makePlace, placesOf, removePlace } from './places.js'

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
        return <div key={p.id} className="fk-place">
          <div className="fk-place-top">
            <span className="fk-place-name">{p.name}</span>
            {here && <span className="fk-tag">{ft('Here now')}</span>}
            <span style={{ flex: 1 }} />
            <button type="button" className="fk-link" onClick={() => setEditing(open ? null : p.id)}>{open ? ft('Done') : ft('Edit kit')}</button>
          </div>
          <div className="fk-prog-about">{kitSummary(p, ft)}</div>
          {open && <>
            <input className="input" defaultValue={p.name} aria-label={ft('Name')} maxLength={40}
              onChange={e => { const v = e.target.value.trim(); if (v) update(s => { const x = placesOf(s).find(y => y.id === p.id); if (x) { x.name = v; x._ts = Date.now() } }) }} />
            <KitPicker equipment={profileEquipment(p)} onChange={eq => setKit(p.id, eq)} />
          </>}
          <div className="fk-place-actions">
            {!here && <button type="button" className="fk-link" onClick={() => update(s => { switchGym(s, p.id) })}>{ft('Train here')}</button>}
            {places.length > 1 && <button type="button" className="fk-link dim" onClick={() => remove(p)}>{ft('Remove')}</button>}
          </div>
        </div>
      })}
      <button type="button" className="fk-link" style={{ alignSelf: 'flex-start', marginTop: 8 }} onClick={add}>{ft('Add a place')}</button>
    </div>
  </div>
}
