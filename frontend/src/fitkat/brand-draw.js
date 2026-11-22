// FitKat's wordmark on a share image: ivory letters and a rose full stop on a forest block,
// whatever the paper. Called by lib/card-draw.js drawBrand in place of openGym's lockup; `y` is the
// text's baseline, as there. The site address openGym prints at the other end has no FitKat
// counterpart, so nothing is drawn there.
const FOREST = '#405849', IVORY = '#f8f6f0', ROSE = '#b48276'
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
  ctx.fillStyle = ROSE
  ctx.fillText('.', tx, y)
  ctx.restore()
}
