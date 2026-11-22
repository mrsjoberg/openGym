// FitKat's tour: which stops she gets, that each has its words in both languages, and that the
// screens still carry what the stops point at.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import { setOverlay } from './brand.js'
import { FK_STEPS, FK_COPY, fitkatProfile, fitkatOfferLine } from './tour.js'
import { withLimit } from './limits.js'
import { tourSteps, tutorialsShown, STEPS, TUTORIALS } from '../lib/tour.js'

const ids = steps => steps.map(s => s.id)
const src = f => fs.readFileSync(new URL(f, import.meta.url), 'utf8')

describe('under FitKat', () => {
  beforeAll(() => setOverlay(true))
  afterAll(() => setOverlay(null))

  it('runs FitKat\'s own stops in place of openGym\'s tour, in the order of a first day', () => {
    expect(ids(tourSteps({ limits: true }))).toEqual(['fk-today', 'fk-tags', 'fk-place', 'fk-start', 'fk-workout', 'fk-limit', 'fk-progress', 'fk-gear'])
    expect(tourSteps({ limits: true })).toHaveLength(8)
  })
  it('leaves the limit stop out for someone who set no limit', () => {
    expect(ids(tourSteps({}))).not.toContain('fk-limit')
    expect(tourSteps({})).toHaveLength(7)
    expect(fitkatProfile({ bodyLimits: {} })).toEqual({ limits: false })
    expect(fitkatProfile({ bodyLimits: withLimit({}, 'knee', { mode: 'easy' }, '2026-11-22', 1) })).toEqual({ limits: true })
    // A limit she took away again is no limit.
    expect(fitkatProfile({ bodyLimits: { knee: { _ts: 5 } } })).toEqual({ limits: false })
  })
  it('never leaves Home, never starts a workout and never works on a copy of her data', () => {
    for (const s of FK_STEPS) {
      expect(s.route, s.id).toBe('/home')
      for (const k of ['go', 'sandbox', 'intercept', 'tap', 'open', 'free', 'commit']) expect(s[k], s.id + ' ' + k).toBeUndefined()
    }
  })
  it('has a title and a text for every stop, plain, with no em dash', () => {
    for (const s of FK_STEPS) {
      const [title, body] = FK_COPY[s.id]()
      expect(title.length, s.id).toBeGreaterThan(3)
      expect(body.length, s.id).toBeGreaterThan(40)
      expect(title + body, s.id).not.toMatch(/[—–]/)
    }
    expect(fitkatOfferLine()).not.toMatch(/[—–]/)
  })
  it('has every text in Russian too (a draft)', () => {
    const strings = src('./strings.js')
    const file = src('./tour.js')
    const keys = [...file.matchAll(/ft\('((?:[^'\\]|\\.)*)'\)/g)].map(m => m[1])
    expect(keys.length).toBeGreaterThanOrEqual(2 * FK_STEPS.length + 1)
    for (const k of keys) expect(strings.includes("'" + k + "': '"), k).toBe(true)
  })
  it('points only at things the screens still mark', () => {
    const where = { 'fk-today': './Today.jsx', 'fk-tags': './Today.jsx', 'fk-place': './Today.jsx', today: './Today.jsx', 'tab-stats': '../components/TabBar.jsx', 'settings-gear': '../views/Home.jsx' }
    for (const s of FK_STEPS) {
      if (!s.anchor) continue
      expect(where[s.anchor], s.id).toBeTruthy()
      expect(src(where[s.anchor]), s.id + ' -> ' + s.anchor).toMatch(new RegExp('tour=("' + s.anchor + '"|\\{[^}]*\'' + s.anchor + '\')'))
      // Every pointed-at element may be missing on some day, so each of these stops can speak from the middle.
      expect(s.soft, s.id).toBe(true)
    }
  })
  it('leaves out the tutorial that walks through the Stats tab, and keeps the tutorials otherwise', () => {
    expect(tutorialsShown()).toEqual(['plan', 'custom', 'backup'])
    expect(tourSteps({}, 'plan')[0].id).toBe('p-intro')
  })
})

describe('outside FitKat', () => {
  it('leaves openGym\'s tour and tutorials exactly as they are', () => {
    expect(tourSteps({ plannedDays: true, rest: true, swipe: true, balance: true, workouts: true, limits: true })).toEqual(STEPS)
    expect(ids(tourSteps({}))).toContain('go-stats')
    expect(tutorialsShown()).toBe(TUTORIALS)
  })
})
