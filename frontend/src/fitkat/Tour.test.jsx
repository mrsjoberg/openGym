// @vitest-environment happy-dom
/* FitKat's tour in openGym's overlay (components/Tour.jsx): the question without the modules
   choice, the stops in order with FitKat's words, a stop whose element is not on screen today,
   and the end. The screen is a stand-in carrying the anchors. */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../sheets.jsx', () => ({ beginWorkout: vi.fn() }))

import { useStore, DEF } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { openTour, closeTour, tourState, readTour } from '../lib/tour.js'
import Tour, { _setAnchorWait } from '../components/Tour.jsx'
import { setOverlay } from './brand.js'
import { withLimit } from './limits.js'

const clone = o => JSON.parse(JSON.stringify(o))
const ALL = ['fk-today', 'fk-tags', 'fk-place', 'today', 'tab-stats', 'settings-gear']
let root, host, where
function Screen({ missing = [] }) {
  where = useLocation().pathname
  return <div>{ALL.filter(a => !missing.includes(a)).map(a => <button key={a} data-tour={a}>{a}</button>)}</div>
}
const settle = async (ms = 150) => { await act(async () => { await new Promise(r => setTimeout(r, ms)) }) }
const render = async (props = {}, at = '/home') => {
  await act(async () => { root.render(<MemoryRouter initialEntries={[at]}><Screen {...props} /><Tour /></MemoryRouter>) })
  await settle()
}
const card = () => document.querySelector('.tour-card')
const step = () => document.querySelector('.tour')?.getAttribute('data-step')
const btn = label => [...document.querySelectorAll('.tour-card button')].find(b => b.textContent === label)
const click = async el => { await act(async () => { el.click() }); await settle() }

beforeEach(() => {
  setOverlay(true)
  localStorage.clear()
  _setAnchorWait(2000)
  useStore.setState({ S: clone(DEF), user: null, ready: true })
  useUI.getState().closeAll()
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    return this.dataset?.tour ? { top: 200, left: 20, width: 120, height: 40, bottom: 240, right: 140, x: 20, y: 200 } : { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0, x: 0, y: 0 }
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => { closeTour() })
  await act(async () => root.unmount())
  host.remove()
  useUI.getState().closeAll()
  vi.restoreAllMocks()
  localStorage.clear()
  setOverlay(null)
})

describe('the question after setup', () => {
  it('asks about the tour alone: no "How much app do you want?"', async () => {
    await act(async () => { openTour({ kind: 'offer' }) })
    await render()
    expect(card().textContent).toContain('Want a 1-minute tour?')
    expect(card().textContent).toContain('A few short stops on your own screens.')
    expect(card().textContent).not.toContain('How much app do you want?')
    expect(card().querySelectorAll('[role="radio"]')).toHaveLength(0)
    expect(readTour().offered).toBeGreaterThan(0)
    await click(btn('Skip'))
    expect(tourState()).toBe(null)
    // The modules are as they were: nothing was chosen for her.
    expect(useStore.getState().S.modules).toEqual(DEF.modules)
  })
  it('"Show me" opens on today', async () => {
    await act(async () => { openTour({ kind: 'offer' }) })
    await render()
    await click(btn('Show me'))
    expect(step()).toBe('fk-today')
    expect(card().textContent).toContain('Today, first')
    expect(card().textContent).toContain('Step 1 of 7')
  })
})

describe('the stops', () => {
  it('go from today to the gear, seven without a limit, and the last one ends on Home with the tour marked seen', async () => {
    await act(async () => { openTour({ kind: 'run', at: null }) })
    await render({}, '/settings/about')
    const seen = []
    for (let i = 0; i < 12 && step(); i++) {
      seen.push([step(), card().querySelector('h2').textContent])
      const next = btn('Next') || btn('Let’s go')
      expect(next, step()).toBeTruthy()
      await click(next)
    }
    expect(seen).toEqual([
      ['fk-today', 'Today, first'], ['fk-tags', 'The small labels'], ['fk-place', 'Where you train'], ['fk-start', 'Start, and one question'],
      ['fk-workout', 'In a workout'], ['fk-progress', 'Progress'], ['fk-gear', 'The gear'],
    ])
    expect(tourState()).toBe(null)
    expect(where).toBe('/home')
    expect(readTour().done).toBeGreaterThan(0)
    // Her data is as it was: no practice session, no copy.
    expect(useStore.getState().S.active).toBeFalsy()
    expect(useStore.getState().tourSandbox).toBeFalsy()
  })
  it('adds the limit stop for someone with a limit: eight', async () => {
    useStore.setState(st => ({ S: { ...st.S, bodyLimits: withLimit({}, 'knee', { mode: 'easy' }, '2026-11-22', 1) } }))
    await act(async () => { openTour({ kind: 'run', at: 'fk-workout' }) })
    await render()
    expect(card().textContent).toContain('Step 5 of 8')
    await click(btn('Next'))
    expect(step()).toBe('fk-limit')
    expect(card().textContent).toContain('With a limit')
    expect(card().textContent).toContain('Skip it today')
  })
  it('speaks from the middle at once when today has no exercise list (a rest day), without the two-second wait', async () => {
    await act(async () => { openTour({ kind: 'run', at: 'fk-tags' }) })
    await render({ missing: ['fk-tags'] })
    await settle(350)
    expect(step()).toBe('fk-tags')
    expect(card().className).toContain('tour-center')
    expect(card().style.visibility).not.toBe('hidden')
    expect(document.querySelector('[data-testid="tour-hole"]')).toBe(null)
    // And it is not passed over: the words still say what the labels mean.
    expect(card().textContent).toContain('Swapped')
  })
  it('"Skip tour" closes it for good', async () => {
    await act(async () => { openTour({ kind: 'run', at: null }) })
    await render()
    await click([...document.querySelectorAll('.tour-card button')].find(b => b.textContent === 'Skip tour'))
    expect(tourState()).toBe(null)
    expect(readTour().done).toBeGreaterThan(0)
  })
})
