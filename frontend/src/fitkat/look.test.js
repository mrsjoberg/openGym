// One look under FitKat: no black share images, no seasonal themes.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { cardPalette } from '../lib/card-draw.js'
import { sharePalette } from '../lib/share-card.js'
import { isOn, moduleBuilt } from '../lib/modules.js'
import { activeSeason } from '../lib/seasonal.js'
import { setOverlay } from './brand.js'

const FOREST = '#405849', IVORY = '#f8f6f0'
beforeAll(() => setOverlay(true))
afterAll(() => setOverlay(null))

describe('share images under FitKat', () => {
  it('come on ivory or forest green, never black', () => {
    for (const template of ['classic', 'lifts']) {
      expect(sharePalette(template, 'light', FOREST).bg).toBe(IVORY)
      expect(sharePalette(template, 'dark', FOREST).bg).toBe(IVORY)     // a saved "Dark" reads as ivory
      expect(sharePalette(template, 'accent', FOREST).bg).toBe(FOREST)
    }
    expect(cardPalette('light', FOREST).bg).toBe(IVORY)
    expect(cardPalette('dark', FOREST).bg).toBe(FOREST)
  })
  it('keep type readable on both papers', () => {
    const ivory = sharePalette('classic', 'light', FOREST), forest = cardPalette('dark', FOREST)
    expect(ivory.label).toBe('#303c35')
    expect(ivory.light).toBe(true)
    expect(forest.label).toBe(IVORY)
    expect(forest.acc).toBe(IVORY)      // forest highlights on forest paper would not show
    expect(forest.light).toBe(false)
  })
  it('leave the sticker and the photo card as they are', () => {
    expect(sharePalette('sticker', 'dark', FOREST).bg).toBe(null)
    expect(sharePalette('photo', 'dark', FOREST).label).toBe('#ffffff')
  })
  it('are openGym\'s own outside FitKat', () => {
    setOverlay(false)
    try {
      expect(sharePalette('classic', 'dark', FOREST).bg).toBe('#000000')
      expect(cardPalette('light', FOREST).bg).toBe('#f2f2f7')
    } finally { setOverlay(true) }
  })
})

describe('seasonal themes under FitKat', () => {
  it('are left out, whatever the profile says', () => {
    const S = { modules: { seasonal: true } }
    expect(isOn(S, 'seasonal')).toBe(false)
    expect(moduleBuilt('seasonal')).toBe(false)
    expect(activeSeason(S, new Date(2026, 9, 31))).toBe(null)
  })
  it('leave the other modules alone, and come back outside FitKat', () => {
    expect(isOn({}, 'health')).toBe(true)
    setOverlay(false)
    try { expect(moduleBuilt('seasonal')).toBe(true); expect(isOn({}, 'seasonal')).toBe(true) } finally { setOverlay(true) }
  })
})
