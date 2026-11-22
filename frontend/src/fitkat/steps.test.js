// Steps corrected where the catalogue's contradict the exercise.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { instrFor, instrTranslated } from '../lib/i18n-core.js'
import { setOverlay } from './brand.js'
import { POOL } from './limits-data.js'
import { STEPS, correctedSteps } from './steps.js'

beforeAll(() => setOverlay(true))
afterAll(() => setOverlay(null))

describe('corrected steps', () => {
  it('are for exercises that exist, in plain sentences with no em dash', () => {
    for (const [id, steps] of Object.entries(STEPS)) {
      expect(EXIDX[id], id).toBeTruthy()
      expect(steps.length, id).toBeGreaterThanOrEqual(4)
      for (const s of steps) { expect(s, id).toMatch(/^[A-Z].*\.$/); expect(s).not.toContain('—') }
    }
  })
  it('say what the owner saw in each animation', () => {
    expect(STEPS['0151'].join(' ')).toMatch(/Lie back on the bench/)
    expect(STEPS['0169'].join(' ')).toMatch(/facing away from the machine/)
    expect(STEPS['0313'].join(' ')).toMatch(/palms still facing each other/)
    expect(STEPS['0313'].join(' ')).not.toMatch(/facing forward/)
    expect(STEPS['1274'].join(' ')).toMatch(/dumbbells/)
    expect(STEPS['3288'].join(' ')).toMatch(/single bar with the bar behind your body/)
    expect(STEPS['1297'].join(' ')).toMatch(/palms together in front of your chest/)
    expect(STEPS['1623'].join(' ')).toMatch(/palms facing each other/)
  })
  it('are what the app shows, and count as untranslated', () => {
    const ex = EXIDX['0313']
    expect(instrFor(ex)).toBe(STEPS['0313'])
    expect(instrTranslated(ex)).toBe(false)
  })
  it('leave the catalogue alone outside FitKat', () => {
    setOverlay(false)
    try {
      expect(correctedSteps('0313')).toBe(null)
      expect(instrFor({ id: '0313', st: ['own'] })).not.toBe(STEPS['0313'])
    } finally { setOverlay(true) }
  })
  it('let the five back into the fill-in pool', () => {
    for (const id of ['0151', '0169', '0313', '1274', '3288']) expect(POOL, id).toContain(id)
  })
})
