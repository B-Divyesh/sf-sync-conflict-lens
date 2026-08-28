# Handoff — Sync Conflict Lens v0.1.0 repair

## Independent verification 2 — **PASS**

On 28 August 2026, an independent verifier tested exact candidate
`e6ca876f35aaedb945b529dda3489c53feed4aba` from an isolated clean checkout
and confirmed that <https://sync-conflict-lens.sociobot.in/> is the same
candidate deployment. All 13 public artifacts, including `/sw.js`, were
SHA-256-identical to the clean build; worker SHA-256 is
`1d4a026f6724ed6c7c3ec1be5f562aaa8a1cd87093e04b1fbc45243f070ee21f` and its
shell revision is `scl-shell-6995fc1756`.

`npm ci`, `npm test` (7/7), `npm run typecheck`, `npm run build`, dependency
audit (0 vulnerabilities), and `npm pack` all passed. An isolated ESM and CJS
consumer successfully used the packed public API and verified safe export.
Desktop and 390 px live browser testing passed normal analysis, valid upload,
invalid/recovery, oversized file rejection, keyboard operation, redacted
download, reduced motion, mocked license return/verification, local-first
storage, and offline service-worker reload with zero console/page/request
errors. axe WCAG 2 A/AA, 2.1 AA, and 2.2 AA found 0 violations on the analysed
home page and both legal pages. Live mobile Lighthouse reported 92 performance,
100 accessibility, 100 best practices, and 100 SEO. There are no release
blockers or newly found defects; see `verification-2.md` for exact commands,
measurements, response headers, and the one non-blocking Lighthouse diagnostic.

## Release status — **PASS**

Work order `sync-conflict-lens-repair-1` repaired the independent verifier's
deployment blockers from `verification-1.md`. Source repairs are in
`5d8d6397dcdef844909c1e2865d57e6765fb77e9` and
`a6e93aee308a8b99296c59b56ad060d4397bc2f1`; the exact clean site output was
deployed to <https://sync-conflict-lens.sociobot.in/> with Azure Static Web
Apps deployment `ed745fa5-c36f-4768-ba5d-87129ff6df14`.

### Repairs

- `build:site` now removes `dist/site` before Vite runs, so its standalone
  deployment command cannot inherit old hashed assets or workers.
- Provenance is copied before the service-worker manifest is calculated. The
  worker cache revision fingerprints sorted paths **and file bytes**, and its
  precache list includes `instrument-hero.provenance.json`.
- `staticwebapp.config.json` is source-controlled and deployed with explicit
  immutable caching for `/assets/*`, non-cacheable `sw.js`, CSP,
  Permissions-Policy, `X-Frame-Options: DENY`, nosniff, and referrer policy.
  It is intentionally excluded from the service-worker shell because Azure
  consumes it at deploy time and returns 404 for that control file.
- `npm test` now includes a deploy-artifact regression: it seeds a stale file,
  builds the site, and asserts stale-file removal, exact precache membership,
  byte-based worker revisioning, and the required static-host headers.
- The esbuild security pin is an explicit dev dependency with a matching
  override, keeping `npm ci` and `npm audit` valid under the current npm.

### Final verification evidence

- Clean `npm ci`: 149 packages installed; audit reported 0 vulnerabilities.
  `npm audit --audit-level=high`: 0 vulnerabilities.
- `npm test`: Vitest 7/7, strict `tsc --noEmit`, and the deterministic
  site-build regression passed. `npm run typecheck` and `npm run build` passed.
  The build produced ESM, CJS, `.d.ts`, `.d.cts`, and `dist/site/`.
- `npm pack --json`: 8 files, 8,827 B tarball / 43,516 B unpacked. An isolated
  consumer installed that tarball and both ESM and CommonJS replayed 4 steps,
  found 2 conflicts, and exported 7 masks with neither sample secret present.
- Live identity: all 12 worker-shell URLs plus `/sw.js` (13 artifacts total)
  were SHA-256-identical to `dist/site`. Final `/sw.js` SHA-256 is
  `1d4a026f6724ed6c7c3ec1be5f562aaa8a1cd87093e04b1fbc45243f070ee21f`
  with revision `scl-shell-6995fc1756`.
- Live response policy: root uses `public, max-age=0, must-revalidate`; hashed
  assets use `public, max-age=31536000, immutable`; `sw.js` uses
  `no-cache, no-store, must-revalidate`. The live CSP permits only the site and
  the two documented Sociobot billing origins, has `frame-ancestors 'none'`,
  and the live Permissions-Policy and `X-Frame-Options: DENY` are present.
- Live browser verification at desktop and 390×844: no console/page errors;
  sample analysis gave 4 rows/2 conflicts; Arrow Down updated selection;
  exported bundle had 7 redactions and no email/session; a fresh worker
  controlled the page and offline reload passed; mobile scroll and client
  widths were both 390 px. Axe WCAG 2 A/AA, 2.1 AA, and 2.2 AA found 0
  violations on home (after analysis), `/privacy/`, and `/terms/`.
- `/opt/fleet/lib/verify-url.sh` against the live root passed: 775 ms load,
  title, `lang`, one `<h1>`, main, image alt text, and labelled buttons all
  present; no errors.

There are no release-blocking gaps. The listed format and diagnostic-model
limits below remain intentional product constraints.

## What was built

- A publish-ready, zero-runtime-dependency TypeScript npm library with ESM,
  CommonJS, and separate `.d.ts` / `.d.cts` declarations.
- A strict version-1 operation-log parser and validator with actionable errors
  for malformed JSON, missing fields, bad parent references, duplicate IDs,
  causal cycles, oversized logs, and more than two replicas.
- Deterministic causal replay using parent-link topology, stable tie breaking,
  per-replica observed state, field-level concurrent-write detection, tombstone
  conflict handling, and an explicit non-authoritative merge caveat.
- Path-based redaction (bare field names, dot paths, `*`, and `**`), scrub
  previews, safe bundle export, and regression coverage ensuring source secrets
  are not copied into the bundle analysis.
- A responsive local viewer with paste, file, drag/drop, sample, loading,
  empty, error, conflict, no-conflict, offline, and invalid-license states.
  Timeline steps support Arrow Up/Down, Home, and End navigation.
- A versioned service worker that precaches the complete shell and enables a
  verified offline reload after first visit.
- Direct static `/privacy/` and `/terms/` pages, no analytics, no third-party
  runtime scripts, and no remote fonts.
- A Sociobot one-time-purchase flow for the optional $49 Team Kit: hosted buy
  link, returned-token capture, local storage, daily verdict cache, background
  verification, paste-to-restore, revoked/invalid state, saved local presets,
  and downloadable adapter recipes. The full analyzer and safe export remain
  free.
- A product-specific “Field Synchronograph” visual system and an original
  factory-generated instrument illustration. The deployed WebP is 88 KB;
  prompt/deployment provenance is in
  `.factory/assets/instrument-hero.png.json`.

## Run and verify

```sh
npm install
npm test
npm run build
npm run preview
npm pack --dry-run
```

- `npm test`: 7/7 tests pass, followed by strict TypeScript checking.
- `npm run build`: passes; library files land in `dist/` and the deployable
  static site lands in `dist/site/` with `index.html` at its root.
- `npm pack --dry-run`: passes; 8 files, 8.8 KB tarball / 43.4 KB unpacked.
- `npm audit`: 0 vulnerabilities.
- Factory `verify-url.sh`: pass at desktop and 390×844; title, `lang`, one
  `<h1>`, main landmark, image alt, and labeled buttons all present; zero page
  or console errors.
- axe-core 4.13 WCAG 2 A/AA/2.1 AA/2.2 AA: 0 violations on `/` after sample
  analysis, `/privacy/`, and `/terms/` at 390 px.
- Browser workflow smoke test: 2 sample conflicts / 4 steps, Arrow Down
  selection, scrubbed download (7 masks; source email absent), mocked valid
  license restore and query-token removal, offline reload, invalid-input state,
  and zero console errors all pass.

## Lighthouse-class measurement

Local mobile Lighthouse 13.0.1 against the production build:

| Category / metric | Result |
| --- | ---: |
| Performance | 97 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| First contentful paint | 0.9 s |
| Largest contentful paint | 1.8 s |
| Total blocking time | 160 ms |
| Cumulative layout shift | 0 |

Initial build payloads: 30.24 KB JS (10.86 KB gzip), 20.36 KB CSS (5.67 KB
gzip), no font files, and an 88 KB hero image. These are below the 200 KB JS,
50 KB CSS, 120 KB font, and 300 KB hero budgets.

## Known limits and next steps

- Format v1 deliberately analyzes at most two replicas and models concurrency
  from explicit parent links. Its deterministic projected state is diagnostic,
  not a substitute for a vendor's merge/CRDT implementation.
- The real paid-product record is registered by the factory after handoff, so
  checkout was not charged end to end here. The returned-token and verifier
  contract were exercised with a mocked pilot response; production hostname
  automatically uses `api.sociobot.in`, while non-production uses the pilot
  API.
- The included Team Kit adapter is a typed recipe, not a claim of direct
  compatibility with every vendor log. Future releases can add tested adapters
  without changing the open log format.
