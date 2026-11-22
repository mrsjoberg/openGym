// What stands in for an exercise her kit cannot do never loads one of her limits.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EXIDX } from '../lib/exercises.js'
import { setOverlay } from './brand.js'
import { STARTER_PLANS } from '../../../api/coach/core/starter-plans.js'
import { PRESETS } from './places.js'
import { AREAS, withLimit, limitOn, restInvolved } from './limits.js'
import { suggestSwaps, routineAtPlace, swapKey, withApproved, withDeclined, undecidedCount } from './place-swaps.js'

beforeAll(() => setOverlay(true))
afterAll(() => setOverlay(null))

const home = { id: 'home', name: 'Home', equipment: PRESETS.home(), accV: 3 }
const routines = Object.values(STARTER_PLANS).flatMap(p => p.routines.map(([id, name, , rows]) => ({ id, name, ex: rows.map(([x, sets, n, kind]) => (kind === 'time' ? { id: x, sets, mode: 'time', sec: n } : { id: x, sets, reps: n })) })))
const lim = (area, mode, rest) => withLimit({}, area, { mode, rest }, '2026-11-22', 1)
const kitRows = (S, routine) => routineAtPlace(S, routine, home).filter(r => !r.limit || r.involved)

describe('suggestSwaps', () => {
  const ex = EXIDX['0025']
  it('leaves out what `allow` refuses, and puts first what `prefer` likes', () => {
    const [top, second] = suggestSwaps(ex, home, { n: 2 })
    expect(top && second).toBeTruthy()
    expect(suggestSwaps(ex, home, { n: 1, allow: c => c.id !== top.ex.id })[0].ex.id).toBe(second.ex.id)
    expect(suggestSwaps(ex, home, { n: 1, prefer: c => c.id === second.ex.id })[0].ex.id).toBe(second.ex.id)
    // Without either it is what it always was.
    expect(suggestSwaps(ex, home, { n: 2 }).map(s => s.ex.id)).toEqual([top.ex.id, second.ex.id])
    expect(Object.keys(top)).not.toContain('first')
  })
})

describe('a kit swap under a limit', () => {
  it('never offers something that loads a limit of hers, whatever the limit and however she set it', () => {
    let offered = 0
    for (const area of AREAS) for (const [mode, rest] of [['easy', false], ['avoid', false], ['avoid', true]]) {
      const S = { bodyLimits: lim(area, mode, rest) }
      for (const routine of routines) for (const row of kitRows(S, routine)) {
        if (row.state !== 'pending') continue
        offered++
        expect(limitOn(S, row.suggestion.ex.id), `${EXIDX[row.cfg.id].n} -> ${row.suggestion.ex.n} with ${area} ${mode}`).toBe(null)
      }
    }
    expect(offered).toBeGreaterThan(0)
  })
  it('changes what is offered where the plain suggestion would have loaded the limit', () => {
    // Somewhere in the built-in programmes the best stand-in at home loads a joint the original does not.
    const cases = []
    for (const area of AREAS) {
      const S = { bodyLimits: lim(area, 'avoid') }
      for (const routine of routines) for (const cfg of routine.ex) {
        const ex = EXIDX[cfg.id]
        if (!ex || limitOn(S, cfg.id)) continue
        const [plain] = suggestSwaps(ex, home, { exclude: routine.ex.map(e => e.id), n: 1 })
        if (plain && limitOn(S, plain.ex.id)) cases.push([routine, cfg, area, plain.ex.id])
      }
    }
    expect(cases.length).toBeGreaterThan(0)
    for (const [routine, cfg, area, plain] of cases) {
      const row = routineAtPlace({ bodyLimits: lim(area, 'avoid') }, routine, home).find(r => r.cfg.id === cfg.id)
      if (row.state === 'pending') expect(row.suggestion.ex.id).not.toBe(plain)
    }
  })
  it('says so when the stand-in involves an area she rests, and prefers one that does not', () => {
    let noted = 0
    for (const area of AREAS) {
      const S = { bodyLimits: lim(area, 'avoid', true) }
      for (const routine of routines) for (const row of kitRows(S, routine)) {
        if (row.state !== 'pending') continue
        const touches = restInvolved(S, row.suggestion.ex.id)?.area || null
        expect(row.involves || null).toBe(touches)
        if (touches) {
          noted++
          // Nothing the kit could do instead leaves the area alone: otherwise that would have come first.
          const held = routine.ex.map(e => e.id)
          const clear = suggestSwaps(row.ex, home, { exclude: held, n: 1, allow: c => !limitOn(S, c.id) && !restInvolved(S, c.id) })
          const same = suggestSwaps(row.ex, home, { exclude: held, n: 1, allow: c => !limitOn(S, c.id) })[0]
          if (clear.length) expect(clear[0].loose && !same.loose).toBe(true)
        }
      }
    }
    expect(noted).toBeGreaterThan(0)
  })
  it('asks again when a limit set later makes an approved stand-in one that loads it', () => {
    const cases = []
    for (const area of AREAS) for (const routine of routines) for (const cfg of routine.ex) {
      const ex = EXIDX[cfg.id]
      const S = { bodyLimits: lim(area, 'avoid') }
      if (!ex || limitOn(S, cfg.id)) continue
      const [plain] = suggestSwaps(ex, home, { exclude: routine.ex.map(e => e.id), n: 1 })
      if (plain && limitOn(S, plain.ex.id)) { cases.push([routine, cfg, area, plain.ex.id]); break }
    }
    const [routine, cfg, area, plain] = cases[0]
    const placeSwaps = withApproved({}, swapKey('home', routine.id, cfg.id), plain, 1)
    const before = routineAtPlace({ placeSwaps }, routine, home).find(r => r.cfg.id === cfg.id)
    expect(before).toMatchObject({ state: 'approved' })
    const after = routineAtPlace({ placeSwaps, bodyLimits: lim(area, 'avoid') }, routine, home).find(r => r.cfg.id === cfg.id)
    expect(after.state).not.toBe('approved')
  })
})

describe('the review for today', () => {
  it('counts only the sessions it is given', () => {
    const S = {}
    const all = undecidedCount(S, routines, home)
    const one = undecidedCount(S, [routines[0]], home)
    expect(one).toBeGreaterThan(0)
    expect(one).toBeLessThan(all)
    // Declining one suggestion still leaves it to answer.
    const row = routineAtPlace(S, routines[0], home).find(r => r.state === 'pending')
    const declined = { placeSwaps: withDeclined({}, swapKey('home', routines[0].id, row.cfg.id), row.suggestion.ex.id, 1) }
    expect(undecidedCount(declined, [routines[0]], home)).toBe(one)
  })
})
