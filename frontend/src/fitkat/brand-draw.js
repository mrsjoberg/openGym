// FitKat's wordmark on a share image: ivory letters and an orange full stop on a forest block,
// whatever the paper. Called by lib/card-draw.js drawBrand in place of openGym's lockup; `y` is the
// text's baseline, as there. The site address openGym prints at the other end has no FitKat
// counterpart, so nothing is drawn there.
const FOREST = '#405849', IVORY = '#f8f6f0', ORANGE = '#e06a00'   // the challenge bar's orange (--streak-ink)
const FAMILY = "'Cormorant Garamond', Georgia, 'Times New Roman', serif"

// A canvas does not wait for a web font, so both faces are asked for ahead of the first drawing.
try {
  if (typeof document !== 'undefined' && document.fonts?.load) {
    document.fonts.load(`500 40px ${FAMILY}`, 'Fit').catch(() => {})
    document.fonts.load(`italic 500 40px ${FAMILY}`, 'Kat').catch(() => {})
  }
} catch { /* no font loading here: the fallback serif is drawn */ }

/** The block the wordmark covers for a baseline at `y`: { x, y, w, h }. `w` needs a canvas to measure. */
export function wordmarkBox(ctx, x, y, size = 40) {
  const px = Math.round(size * 1.3)
  const padX = px * 0.42, padY = px * 0.28, cap = px * 0.63
  ctx.save()
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${(-px * 0.02).toFixed(2)}px`
  ctx.font = `500 ${px}px ${FAMILY}`
  const fit = ctx.measureText('Fit').width, dot = ctx.measureText('.').width
  ctx.font = `italic 500 ${px}px ${FAMILY}`
  const kat = ctx.measureText('Kat').width
  ctx.restore()
  return { x, y: y - cap - padY, w: fit + kat + dot + padX * 2, h: cap + padY * 2, px, padX, fit, kat }
}

export function drawWordmark(ctx, { x, y, size = 40 }) {
  const box = wordmarkBox(ctx, x, y, size)
  ctx.save()
  ctx.direction = 'ltr'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = FOREST
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, box.px * 0.14); ctx.fill() } else ctx.fillRect(box.x, box.y, box.w, box.h)
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${(-box.px * 0.02).toFixed(2)}px`
  let tx = x + box.padX
  ctx.fillStyle = IVORY
  ctx.font = `500 ${box.px}px ${FAMILY}`
  ctx.fillText('Fit', tx, y)
  tx += box.fit
  ctx.font = `italic 500 ${box.px}px ${FAMILY}`
  ctx.fillText('Kat', tx, y)
  tx += box.kat
  ctx.font = `500 ${box.px}px ${FAMILY}`
  ctx.fillStyle = ORANGE
  ctx.fillText('.', tx, y)
  ctx.restore()
}

// The papers a share image comes on under FitKat: ivory or forest green, never black. Each takes
// openGym's palette for that card (lib/card-draw.js cardPalette, lib/share-card.js sharePalette)
// and puts FitKat's paper, panels and ink on it; everything else the card knows stays.
const INK = '#303c35', SOFT = '#686e63', SAGE = '#e5e8dd', LINE = '#d7d9ce'
const onForest = a => `rgba(248, 246, 240, ${a})`

/** A light card: ivory paper, sage tiles, the app's ink. */
export const ivoryCard = base => ({ ...base, bg: IVORY, surface: IVORY, tile: SAGE, label: INK, label2: SOFT, sep: LINE, light: true })

/** A dark card: forest green paper with ivory type, where openGym's is black. */
export const forestCard = base => ({
  ...base, bg: FOREST, surface: '#496252', tile: onForest(0.12), label: IVORY, label2: onForest(0.74), sep: onForest(0.2),
  acc: IVORY, accText: IVORY, light: false,
})
