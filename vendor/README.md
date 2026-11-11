# Vendored dependencies

These files are checked in so the game can be played and tested **offline** with no
build step or package install. `index.html` maps the bare specifier `pixi.js` to
this file.

| Package | Version | File           | License | Upstream source                                 |
| ------- | ------- | -------------- | ------- | ----------------------------------------------- |
| pixi.js | 7.3.3   | `pixi.min.mjs` | MIT     | <https://www.npmjs.com/package/pixi.js/v/7.3.3> |

The license text is in `LICENSE-pixi.txt`.

## Provenance

Downloaded from jsDelivr's npm mirror:

```bash
curl -fsSL https://cdn.jsdelivr.net/npm/pixi.js@7.3.3/dist/pixi.min.mjs \
  -o vendor/pixi.min.mjs
```

The only modification is removal of the trailing
`//# sourceMappingURL=pixi.min.mjs.map` comment from `pixi.min.mjs`, because the
source map is not vendored.

## Fonts

The UI fonts are **not** npm packages and do not live here. They are OFL-licensed
woff2 files bundled under `assets/fonts/` with their license texts. See
`styles/main.css` for the `@font-face` declarations. No CDN is used at runtime.

## Why this version?

`pixi.js` is pinned to the v7 API (`new PIXI.Application(...)` and `app.view` are
synchronous). Pixi v8 changes application startup and canvas access; do not bump
the major version without updating `src/App.js` and `src/Camera.js`.
