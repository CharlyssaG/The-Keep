# public/

Static assets served at the root of the site.

## favicon.svg

The roost favicon: a bird perched on a peaked roof with a chimney. Designed by Charlyssa.

This SVG works in **all modern browsers**, including:
- Chrome, Firefox, Edge, Safari (macOS + iOS 17+)
- Android Chrome

## Optional: PNG variants for older iOS

Older iOS Safari (pre-iOS 17) and some Android home-screens don't pick up SVG favicons reliably. If you want full coverage, generate PNG fallbacks at three sizes:

- `apple-touch-icon.png` — 180×180 (iOS home screen)
- `icon-192.png` — 192×192 (Android Chrome)
- `icon-512.png` — 512×512 (Android Chrome large)

### How to generate them

The easiest way: open the SVG in any vector tool (Figma, Inkscape, even Mac Preview) and export at the three sizes.

Or, on a Mac with Inkscape installed:
```bash
inkscape favicon.svg -w 180 -h 180 -o apple-touch-icon.png
inkscape favicon.svg -w 192 -h 192 -o icon-192.png
inkscape favicon.svg -w 512 -h 512 -o icon-512.png
```

Or use an online converter — search "svg to png" and upload the file three times at different output sizes. Drop the resulting PNGs into this directory and commit.

If you skip this step, browsers that need a PNG will simply not show a favicon — not a broken state, just a small visual gap on home screens for those users.
