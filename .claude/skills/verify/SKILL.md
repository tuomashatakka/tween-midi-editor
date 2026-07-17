---
name: verify
description: Build, launch, and drive the piano roll app to verify changes end-to-end (dev server + Playwright with the preinstalled Chromium).
---

# Verifying changes in tween-midi-editor

## Build & launch

```bash
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci   # plain `npm ci` fails in sandboxes that block the Electron binary CDN
npm run dev -- --port 5199 --strictPort  # Vite dev server
```

## Drive it (Playwright)

Use the preinstalled Chromium — do NOT run `playwright install`:

```js
import { chromium } from '@playwright/test'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
```

Run scripts from a directory that can resolve `@playwright/test` (the repo root,
or symlink `node_modules` next to the script).

Flows worth driving:
- The whole UI is one `<canvas>` (`canvas.piano-roll__canvas`); assert via
  screenshots, not DOM. Toolbar buttons have `aria-label`s (e.g. "Save MIDI file").
- Draw notes: press `b`, click the grid; `Escape` returns to select.
- Marquee: with select tool, mouse-drag on empty grid space.
- Wheel zoom: `page.mouse.wheel(0, -120)` over the canvas (plain wheel = zoom X).
- Ruler (top 28px of the canvas): lower half click = seek; upper half = loop
  brace / clip-end marker drags.
- Touch/pinch: Playwright has no multi-touch API — use a CDP session and
  `Input.dispatchTouchEvent` with two `touchPoints`.
- Export: click "Save MIDI file", await the `download` event.
- Import: click "Open MIDI file", await the `filechooser` event, `setFiles(...)`.

## Gotchas

- A `/favicon.ico` 404 console error is pre-existing noise, not a regression.
- Audio (`AudioContext`) is silent headless; playback state still updates the
  playhead, which is visible in screenshots.
