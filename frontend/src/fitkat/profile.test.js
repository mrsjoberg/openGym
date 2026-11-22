// The defaults FitKat's setup leaves behind.
import { describe, it, expect } from 'vitest'
import { figureOf } from '../lib/exercises.js'
import { sexOf, STANDARDS, thresholdsFor } from '../lib/strength-level.js'
import { womenDefaults } from './profile.js'

describe('womenDefaults', () => {
  it('sets the female figure and strength table on a profile that has not said', () => {
    const s = womenDefaults({ body: 'male' })
    expect(s.body).toBe('female')
    expect(figureOf(s)).toBe('female')
    expect(sexOf(s)).toBe('female')
  })
  it('leaves a profile alone once she has said, either way', () => {
    expect(womenDefaults({ body: 'male', sex: 'male' })).toEqual({ body: 'male', sex: 'male' })
    expect(womenDefaults({ body: 'male', sex: 'female' })).toEqual({ body: 'male', sex: 'female' })
  })
  it('keeps a drawing she chose herself', () => {
    expect(figureOf(womenDefaults({ body: 'male', exFigure: 'male' }))).toBe('male')
  })
  it('grades lifts against the women\'s table afterwards', () => {
    const s = womenDefaults({ body: 'male' })
    expect(thresholdsFor('squat', { sex: sexOf(s) })).toEqual(STANDARDS.squat.f)
    expect(thresholdsFor('squat', { sex: sexOf({ body: 'male' }) })).toEqual(STANDARDS.squat.m)
  })
})
