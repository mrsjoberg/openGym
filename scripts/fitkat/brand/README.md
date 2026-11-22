# FitKat's wordmark and app icon

The brand chosen on 22 Nov: the wordmark in ivory on forest green ("Fit" upright, "Kat" in italic,
a full stop in orange) and, as the app icon, an ivory F and italic K on forest with the same orange stop.
Set in Cormorant Garamond, the display face the app ships (`frontend/src/fitkat/fonts`).

- `outline.py` outlines the letters from those font files and writes `wordmark.svg`, `icon.svg`,
  `badge.svg` and `wordmark-boot.html` (needs `fonttools`, `brotli`, `uharfbuzz`).
- `png.py` draws `icon-512.png`, `icon-180.png` and `badge-96.png` for `frontend/public` from the SVGs.
- `wordmark-boot.html` is the boot screen's markup: paste it over the `<svg>` inside `#boot` in
  `frontend/index.html`. The inline script there is left alone (the web image allows it by hash).

In the app the wordmark is live text (`frontend/src/fitkat/Wordmark.jsx`, `.fk-wordmark` in
`screens.css`); share images draw it with `frontend/src/fitkat/brand-draw.js`.

Not done: the Android and iPhone launch screens and store icons (`frontend/android`, `frontend/ios`,
`frontend/public/app-icons`) are still openGym's. Colours: ivory `#f8f6f0`, forest `#405849`,
orange `#b5713a` (the theme's `--orange`; the stop, on forest and on ivory alike).
