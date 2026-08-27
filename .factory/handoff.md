# Handoff — Sync Conflict Lens v0.1.0

## Independent verification status — **FAIL**

Verified 27 August 2026 against candidate
`bc501c9f19bae13b4f3ac18de349e9baacea3021` and
<https://sync-conflict-lens.sociobot.in/>.

The library, local production build, browser workflows, offline reload,
accessibility, package-consumer checks, and performance budgets pass. **Do not
ship this candidate as verified:** live `/sw.js` is not byte-identical to the
worker built from the candidate. The local worker is SHA-256
`773cc5e5770e4b65097ae49b6ab913b5865777f0074141740a80763db1f2fbe7`
(`scl-shell-ba731c88db`); live is
`354081e22b7944db891e49affc9cacb20be89c25c8a3a21f9a90e26cc1fc0356`
(`scl-shell-6c6f856fb7`) and precaches an extra provenance JSON file. This is
a deployment-integrity release blocker. Live hashed JS/CSS also use
`Cache-Control: public, must-revalidate, max-age=30` rather than immutable
fingerprinted-asset caching; CSP, Permissions-Policy, and a frame policy are
absent.

See [verification-1.md](verification-1.md) for commands, measurements, exact
artifact comparisons, and severity-ranked defects. Required handoff action:
redeploy `dist/site/` from a clean build of this commit (including its generated
worker), set immutable caching for hashed assets, then repeat verification.

Work order: `sync-conflict-lens-build-1`

Completed: 27 August 2026

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
