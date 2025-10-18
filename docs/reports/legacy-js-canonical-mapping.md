## Canonical → Actual JS path mapping (high-priority subset)

Generated: 2025-10-18T (automated scan)

This file records the canonical entries from `legacy/.cache/html_referenced_js.txt` that were reported as missing or ambiguous during the scan, and the actual path(s) found in the repo. The goal is to make a small, authoritative mapping so the two main reports can reference concrete files (or mark entries as archived/not-found).

Notes:
- Paths shown as `public/...` are relative to the repository root `legacy/` directory.
- "NOT FOUND" means no local file matched the canonical path; nearby backups/archives are noted where present.

---

1) assets/js/generated/orval-api-commonjs.js
   → FOUND: `public/assets/js/generated/orval-api-commonjs.js` ✅
   → BACKUPS: `public/assets/js/generated/backup-2025-10-12T21-17-48-849Z/orval-api-commonjs.js`, `.../backup-2025-10-12T21-24-49-599Z/orval-api-commonjs.js`, etc.
   Migration note: prefer regenerating via `legacy/scripts/bundle-orval.js` and commit a single canonical bundle under `public/assets/js/generated/` or switch to importing the TS `src/generated/orval-api.ts` in the new app.

2) public/assets/js/orval-api-commonjs.js
   → Alias of: `public/assets/js/generated/orval-api-commonjs.js` (same bundle) ✅

3) assets/js/generated/orval-api.js
   → FOUND: `public/assets/js/generated/orval-api.js` (ESM build / map file exists) ✅

4) assets/js/ocr-engine.js
   → FOUND: `public/assets/js/ocr-engine.js` ✅
   Migration note: heavy CPU/I/O; plan to move OCR processing to backend worker or a dedicated web-worker + WASM Tesseract. See `legacy/reports/*` OCR notes.

5) assets/js/ocr-integration.js
   → RESTORED (shim): `public/assets/js/ocr-integration.js` (placeholder shim added) ⚠️
   → Evidence: referenced by `public/patient-details-backup.html` and docs; original full implementation was not found in working tree but is referenced in `LEGACY_CLEANUP_REPORT.md` as backup-only and in migration notes.
   Action taken: added a minimal shim at `public/assets/js/ocr-integration.js` that prevents 404s, exposes `window.OCRIntegration` with a no-op `processDocument()` that rejects, and points to archive/migration advice.
   Recommendation: recovery options:
     - Restore the original `ocr-integration.js` from archive snapshots (search earlier suggests some OCR-related modules are archived under `legacy/archive/orphan-js/2025-10-14T14-52-51-532Z/` but a direct `ocr-integration.js` was not present) OR
     - Re-implement the integration as a server-side OCR endpoint and update frontend pages to call the new API. The shim should be removed once a real integration is restored.

6) demo/auto-loader.js
   → FOUND: `public/demo/auto-loader.js` ✅
   Migration note: demo-only loader; keep in `public/demo/` and mark as dev/demo artifact. Replace with environment-guarded loader in React app.

7) demo/demo-bootstrap.js
   → FOUND: `public/demo/demo-bootstrap.js` ✅
   Migration note: demo UI, banner, simulated writes; keep as dev/demo artifact or convert to a small utility module inside docs/demo/ if needed.

8) utils/storage-helper.js
   → FOUND: `public/utils/storage-helper.js` ✅
   Migration note: portable helper; extract to shared `packages/shared-utils` or to `src/utils/storageHelper.ts` in the new app.

9) public/assets/js/sgk/vendor/ocr-engine-wrapper.js
   → FOUND: `public/assets/js/sgk/vendor/ocr-engine-wrapper.js` ✅ (this wrapper loads `/assets/js/ocr-engine.js`)
   Migration note: wrapper should be annotated and replaced with a safe loader that verifies worker availability.

10) assets/js/generated/orval-api-commonjs.js (backup variants)
   → FOUND: multiple backup copies under `public/assets/js/generated/backup-*` — consider keeping one canonical bundle and archiving the backups to `archive/` folder with a short README.

---

Summary of next actions (recommended):
- For "NOT FOUND" entries (notably `assets/js/ocr-integration.js`): search the archive snapshots (e.g., `archive/orphan-js/...`) and either restore to `public/assets/js/` or add a short placeholder file that logs "archived" and points to the archive path.
- Regenerate Orval bundle if you prefer a fresh build: run `node legacy/scripts/bundle-orval.js` from the repo root (I can run it if you want). This will produce canonical outputs under `public/assets/js/generated/`.
- Update the main MDs to reference the resolved `public/...` paths (I can update pointers in `legacy/reports/legacy-features-and-file-map.md` and `legacy/reports/legacy-ui-elements-per-page.md` once you confirm this mapping).

If you'd like, I can now:
- (A) Try to recover `assets/js/ocr-integration.js` from archives and, if found, restore it under `public/assets/js/` with a short note; OR
- (B) Mark `ocr-integration.js` as archived and add a small shim that warns at runtime; OR
- (C) Run `legacy/scripts/bundle-orval.js` to regenerate Orval bundles and then update mappings and tests.
