# Looky
Static web app (dormakaba Belgium, owner Joachim) to search files in the OneDrive-synced shares **ESC_Share** and **ESA_Share**.
Target: https://sealink68.github.io/looky/ · Same style/architecture as ESC_tool (separate html/css/js, offline service worker, manifest, NL/FR).

## Files
- `index.html`, `css/app.css`
- `js/config.js` – settings, all NL/FR texts + help, file-type groups, multilingual glossary (NL/FR/EN/DE)
- `js/families.js` – product families + sub-models: ESC_tool `js/models.js` families (ids unchanged) + all dormakaba door systems verified on dormakaba.com (sources in the file header), grouped in `LK.GROUPS` / `LK.FAMILY_GROUP` (Schuifdeuren, Draaideuren, Carrouseldeuren, Vouwdeuren, Toegangscontrole, Deurdrangers, Vloerveren, Overig; NL/FR labels)
- `js/store.js` – IndexedDB (indexes, directory handles), localStorage prefs
- `js/core.js` – normalising, glossary, path parsing, share scan, index write, search
- `js/combo.js` – combobox (list + free input, iOS-friendly), `js/app.js` – UI
- `sw.js` + `tools/gen_precache.py` – offline precache (run after changing any file; `--check` in tests)
- `manifest.webmanifest`, `icons/`
- `tools/pwtest/` – Playwright tests (`/workspace/pwenv/bin/python tools/pwtest/test.py`)

## Index format (`looky-index.json` in the share root)
`{app:"looky", version:1, share, generated (ISO), count, entries:[{path, name, ext, size, lastModified, family?, submodel?, dossier?}]}`
family/dossier derived generically: folder under the first "projecten"-like folder (projecten/projects/projets/projekte/dossiers), else under the top-level folder (only when the file sits inside a dossier folder). ESC_tool names `<Family>_<SubModel>_<Dossier>_<stamp>.<ext>` add the sub-model. Family/sub-model comboboxes = ESC_tool list + values learned from the active indexes (ESA).

## Logo / icons
`icons/dormakaba-logo.svg` (standard blue/red) and `icons/dormakaba-logo-black.svg` are the official wordmark taken unchanged from https://www.dormakaba.com/be-nl/icons/sprite-logos.svg. PNG icons (192/512, maskable 192/512 with 72% safe zone, apple-touch 180) and `favicon.ico` are rendered from it on white.
