// FitKat's wordmark, set in the app's own display face: "Fit" upright, "Kat" in
// italic, a full stop in rose. Brand colours, not the accent.
// The same letters as outlines (boot screen, app icon) come from scripts/fitkat/brand/outline.py.

/** The wordmark at the size of the text around it. `tone` 'forest' is for a forest ground. */
export function Wordmark({ as: Tag = 'span', size, tone, className = '', style }) {
  return (
    <Tag className={('fk-wordmark ' + (tone === 'forest' ? 'on-forest ' : '') + className).trim()} dir="ltr" aria-label="FitKat"
      style={{ ...(size ? { fontSize: size } : {}), ...style }}>
      <span aria-hidden="true">Fit<em>Kat</em><i>.</i></span>
    </Tag>
  )
}
