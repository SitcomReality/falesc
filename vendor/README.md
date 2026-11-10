# Vendored dependencies

These files are checked in so the game can be played and tested **offline** with no
build step or package install. `index.html` maps the bare specifiers `pixi.js` and
`lil-gui` to these files.

| Package  | Version | File                    | License | Upstream source                                          |
| -------- | ------- | ----------------------- | ------- | -------------------------------------------------------- |
| pixi.js  | 7.3.3   | `pixi.min.mjs`          | MIT     | <https://www.npmjs.com/package/pixi.js/v/7.3.3>          |
| lil-gui  | 0.19.1  | `lil-gui.esm.min.js`    | MIT     | <https://www.npmjs.com/package/lil-gui/v/0.19.1>         |

License texts are in `LICENSE-pixi.txt` and `LICENSE-lil-gui.txt`.

## Provenance

Downloaded from jsDelivr's npm mirror:

```bash
curl -fsSL https://cdn.jsdelivr.net/npm/pixi.js@7.3.3/dist/pixi.min.mjs \
  -o vendor/pixi.min.mjs
curl -fsSL https://cdn.jsdelivr.net/npm/lil-gui@0.19.1/dist/lil-gui.esm.min.js \
  -o vendor/lil-gui.esm.min.js
```

The only modification is removal of the trailing
`//# sourceMappingURL=pixi.min.mjs.map` comment from `pixi.min.mjs`, because the
source map is not vendored. Replace both files wholesale when upgrading, update
this table, and re-run `npm run check` plus the browser smoke test.

## Why these versions?

`pixi.js` is pinned to the v7 API (`new PIXI.Application(...)` and `app.view` are
synchronous). Pixi v8 changes application startup and canvas access; do not bump
the major version without updating `src/App.js` and `src/Camera.js`.
