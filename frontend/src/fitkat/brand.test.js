// The FitKat overlay: the name in every string, the two languages, the single theme. openGym's
// own tests run with it off (brand.js); these switch it on.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { branded, isOffered, lightOnly, overlayOn, setOverlay, OFFERED_LANGS, APP_NAME } from './brand.js'
import { t } from '../lib/i18n-core.js'
import { autoLang } from '../lib/default-lang.js'

describe('the FitKat overlay', () => {
  beforeEach(() => setOverlay(true))
  afterEach(() => setOverlay(false))

  it('is off under the test runner until a test asks for it', () => {
    setOverlay(false)
    expect(overlayOn()).toBe(false)
    expect(t('Reload openGym')).toBe('Reload openGym')
    expect(lightOnly()).toBe(false)
    expect(isOffered('de')).toBe(true)
  })

  it('puts the app name where openGym stood as a word', () => {
    expect(APP_NAME).toBe('FitKat')
    expect(branded('Reload openGym', 'Reload openGym')).toBe('Reload FitKat')
    expect(branded('x', 'openGym is on your watch. Open openGym once.')).toBe('FitKat is on your watch. Open FitKat once.')
    expect(t('Reload openGym')).toBe('Reload FitKat')
    expect(t('Update to openGym v{0}', '9.9')).toBe('Update to FitKat v9.9')
  })

  it('leaves paths, identifiers and other names alone', () => {
    expect(branded('x', 'copies go to Documents/openGym again')).toBe('copies go to Documents/openGym again')
    expect(branded('x', 'openGymSheet')).toBe('openGymSheet')
    expect(branded('x', 'In openNutrition: Link openGym.')).toBe('In openNutrition: Link FitKat.')
  })

  it('keeps openGym in what is about openGym itself', () => {
    for (const s of ['Support openGym', 'Rate openGym on the App Store', 'openGym animation or other licensed stuff',
      'openGym is free: no ads, no subscriptions, no tracking. A coffee keeps it that way.']) expect(t(s)).toBe(s)
  })

  it('decides by the English source string, so a translation is renamed or kept the same way', () => {
    expect(branded('Support openGym', 'Поддержать openGym')).toBe('Поддержать openGym')
    expect(branded('Reload openGym', 'Перезагрузить openGym')).toBe('Перезагрузить FitKat')
  })

  it('offers English and Russian, and sends any other browser language to English', () => {
    expect(OFFERED_LANGS).toEqual(['en', 'ru'])
    expect(isOffered('ru')).toBe(true)
    expect(isOffered('de')).toBe(false)
    expect(autoLang({ langAuto: true }, {}, ['ru-RU'])).toBe('ru')
    expect(autoLang({ langAuto: true }, {}, ['de-DE', 'fr'])).toBe('en')
    expect(autoLang({ langAuto: true }, { default_lang: 'de' }, ['ru'])).toBe('ru')
  })

  it('has one theme', () => {
    expect(lightOnly()).toBe(true)
  })
})
