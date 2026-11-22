// @vitest-environment happy-dom
/* The start of a session under FitKat: a session with open questions asks them first, in a sheet,
   and starts only once they are answered; a session without any goes straight on. */
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore, DEF } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { EXIDX } from '../lib/exercises.js'
import { startFlow } from '../sheets.jsx'
import { setOverlay } from './brand.js'
import { withLimit } from './limits.js'
import { dueCount } from './due.js'

const byName = n => Object.values(EXIDX).find(e => e && e.n === n)?.id
const SQUAT = byName('barbell full squat'), PRESS = byName('sled 45° leg press'), BENCH = byName('barbell bench press')
const gym = { id: 'gym', name: 'My gym', equipment: ['barbell', 'dumbbell', 'cable', 'leverage machine', 'sled machine', 'bench', 'adjustable bench'], accV: 3 }
const legs = { id: 'legs', name: 'Leg Day', ex: [{ id: SQUAT, sets: 4, reps: 8 }, { id: PRESS, sets: 3, reps: 12 }] }
const push = { id: 'push', name: 'Push Day', ex: [{ id: BENCH, sets: 4, reps: 8 }] }
// The squat again, in a session of its own: the same question as Leg Day's.
const spare = { id: 'spare', name: 'Spare', ex: [{ id: SQUAT, sets: 3, reps: 8 }] }
const clone = o => JSON.parse(JSON.stringify(o))
const mounted = []
function renderTop() {
  const sheet = useUI.getState().sheets.at(-1)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push([root, host])
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
  return host
}
const button = (host, label) => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === label)
const S = () => useStore.getState().S

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  setOverlay(true)
  useUI.setState({ sheets: [], toastMsg: '' })
  // No check-in and no weigh-in, so a start with nothing to ask begins the session at once.
  useStore.setState({ S: { ...clone(DEF), routines: [legs, push, spare], equipProfiles: [gym], activeEquipId: 'gym', equipFilterOn: true, dailyForm: false, weighIn: false,
    bodyLimits: withLimit({}, 'knee', { mode: 'easy' }, '2026-11-22', 1) }, user: null, ready: true })
})
afterEach(() => {
  for (const [root, host] of mounted.splice(0)) { act(() => root.unmount()); host.remove() }
  useUI.setState({ sheets: [] })
  setOverlay(null)
})

describe('starting a session with open questions', () => {
  it('asks them first and starts nothing until they are answered', () => {
    expect(dueCount(S(), ['legs'])).toBe(2)
    act(() => startFlow(['legs']))
    expect(S().active).toBeFalsy()
    expect(useUI.getState().sheets).toHaveLength(1)
    const host = renderTop()
    expect(host.textContent).toContain('Before you start.')
    expect(host.textContent).toContain('Leg Day has exercises FitKat would change for you.')
    // Asked once, and said so: where else the answer counts, and how to change it later.
    expect(host.querySelector('.fk-swap.open').textContent).toContain('Your answer also counts for Spare.')
    expect(host.textContent).toContain('To change an answer later:')
    expect(host.textContent).toContain('Settings, then "Your swaps".')
    expect(host.textContent).toContain('0 of 2 reviewed')
    // No way on yet: neither "Start Leg Day" nor "Finish later".
    expect(button(host, 'Start Leg Day')).toBeUndefined()
    expect(button(host, 'Finish later')).toBeUndefined()
    // One open card, the other waits.
    expect(host.querySelectorAll('.fk-swap.open')).toHaveLength(1)
    expect(host.querySelectorAll('.fk-swap-wait')).toHaveLength(1)
  })
  it('starts once she has answered: "Approve all suggestions", then "Start Leg Day"', () => {
    act(() => startFlow(['legs']))
    const host = renderTop()
    act(() => button(host, 'Approve all suggestions').click())
    expect(dueCount(S(), ['legs'])).toBe(0)
    expect(host.textContent).toContain('2 of 2 reviewed')
    // The squat in Spare is answered with it, and the answered row says so.
    expect(dueCount(S(), ['spare'])).toBe(0)
    expect(host.textContent).toContain('Also in Spare')
    act(() => button(host, 'Start Leg Day').click())
    expect(useUI.getState().sheets).toHaveLength(0)
    expect(S().active).toBeTruthy()
    // The session runs what she approved, with the limit's label.
    expect(S().active.entries.filter(e => e.limit === 'knee').length).toBeGreaterThanOrEqual(2)
  })
  it('closing the sheet starts nothing, and the questions are still there next time', () => {
    act(() => startFlow(['legs']))
    act(() => useUI.getState().closeAll())
    expect(S().active).toBeFalsy()
    expect(dueCount(S(), ['legs'])).toBe(2)
  })
})

describe('starting a session with nothing to ask', () => {
  it('goes straight on', () => {
    expect(dueCount(S(), ['push'])).toBe(0)
    act(() => startFlow(['push']))
    expect(useUI.getState().sheets).toHaveLength(0)
    expect(S().active).toBeTruthy()
  })
  it('does not ask twice: an answered session starts directly the next time', () => {
    act(() => startFlow(['legs']))
    const host = renderTop()
    act(() => button(host, 'Approve all suggestions').click())
    act(() => button(host, 'Start Leg Day').click())
    act(() => useStore.getState().update(s => { s.active = null }))
    act(() => startFlow(['legs']))
    expect(useUI.getState().sheets).toHaveLength(0)
    expect(S().active).toBeTruthy()
  })
  it('leaves openGym alone: outside FitKat nothing is asked', () => {
    setOverlay(null)
    act(() => startFlow(['legs']))
    expect(useUI.getState().sheets).toHaveLength(0)
    expect(S().active).toBeTruthy()
  })
})

describe('one answer for the same exercise in several sessions', () => {
  it('a single "Approve" in Leg Day answers Spare too, and "Undo" asks about both again', () => {
    act(() => startFlow(['legs']))
    const host = renderTop()
    expect(dueCount(S(), ['spare'])).toBe(1)
    act(() => button(host.querySelector('.fk-swap.open'), 'Approve').click())
    expect(dueCount(S(), ['spare'])).toBe(0)
    expect(dueCount(S(), ['legs'])).toBe(1)
    act(() => button(host, 'Undo').click())
    expect(dueCount(S(), ['spare'])).toBe(1)
    expect(dueCount(S(), ['legs'])).toBe(2)
  })
  it('Spare then starts without being asked', () => {
    act(() => startFlow(['legs']))
    const host = renderTop()
    act(() => button(host, 'Approve all suggestions').click())
    act(() => useUI.getState().closeAll())
    act(() => startFlow(['spare']))
    expect(useUI.getState().sheets).toHaveLength(0)
    expect(S().active).toBeTruthy()
    expect(S().active.entries.some(e => e.limit === 'knee' && e.swappedFrom === SQUAT)).toBe(true)
  })
})
