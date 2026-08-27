# Independent verification — FAIL

Verified 27 August 2026 against candidate commit
`bc501c9f19bae13b4f3ac18de349e9baacea3021`.

Target URL: <https://sync-conflict-lens.sociobot.in/>

## Decision

**FAIL — do not accept this candidate as deployed.** The deployed service
worker is not the one produced by a clean production build of the candidate.
All user-facing HTML, JavaScript, CSS, image, legal pages, manifest, favicon,
robots file, sitemap, and provenance file match; the service worker does not.
This is a deployment-integrity release blocker even though the currently live
viewer functions correctly.

## Reproducible local evidence

An isolated detached clone at the exact commit was installed with `npm ci`.

| Check | Result |
| --- | --- |
| `npm test` | PASS — Vitest: 1 file / 7 tests; then `tsc --noEmit` |
| `npm run typecheck` | PASS |
| Lint | No lint script or lint configuration exists in the repository |
| `npm run build` | PASS — ESM, CJS, `.d.ts`, `.d.cts`, and `dist/site/` produced |
| `npm pack --json` | PASS — 8 files; 8,803 B tarball / 43,414 B unpacked |
| Clean consumer | PASS — installed tarball; documented ESM and CommonJS APIs both replayed the sample (4 steps, 2 conflicts); exported bundle omitted `mina@example.test` and `session-private` |
| Baseline dependency audit after clean install | PASS — 0 vulnerabilities |

There are no repository-provided integration, lint, or CLI checks beyond the
commands above.

## Product and browser QA

Chrome browser testing against the exact local production build (1440 px and
390 x 844 px) passed with no page errors or console errors.

- Semantic baseline: title, `lang="en"`, one `h1`, `main`, skip link, image
  alt text, labelled controls, and visible 3 px focus outline all present.
- Keyboard: Arrow Down moved the causal-timeline selection from step 0 to 1
  and updated `aria-pressed`.
- Normal flow: built-in sample produced 4 causal steps, 2 conflict markers,
  and the expected 7-value scrub preview.
- Safe export: downloaded `sync-conflict-2026-08-27.json` had redaction count
  7 and contained neither sample email nor session identifier.
- Error/recovery: malformed JSON gave an actionable parse error; “Replace with
  a valid sample” restored input. A three-replica log was rejected with the
  documented two-replica limit. A valid uploaded two-replica JSON produced two
  conflicts; a 2,000,001-byte file was rejected before loading.
- Mobile: 390 px document width was exactly 390 px (no horizontal overflow).
  Visible controls are 48 px high. Reduced-motion media changed animation and
  transition duration to `0.01ms`.
- Accessibility: axe-core WCAG 2 A/AA, 2.1 AA, and 2.2 AA had 0 violations
  (including 0 serious/critical) on the home after analysis, `/privacy/`, and
  `/terms/`.
- PWA: after installation the worker controlled the page; offline reload
  succeeded locally and on the live URL with no errors.
- Privacy/network: initial load made no external runtime requests. Source and
  browser behavior keep logs in memory; only an optional, user-supplied license
  can call the Sociobot billing API. No analytics, remote fonts, or third-party
  runtime scripts were found.

## Performance

Local mobile Lighthouse against the production build:

| Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 95 | 100 | 100 | 100 | 1.5 s | 1.8 s | 250 ms | 0 |

Built payloads: JavaScript 30,242 B (10,811 B gzip), CSS 20,363 B (5,638 B
gzip), no font files, and 89,244 B WebP hero. These meet the stated 200 KB JS,
50 KB CSS, 120 KB font, and 300 KB hero budgets.

## Deployment comparison and response policy

The live root HTML and hashed assets exactly match the candidate build:

| Artifact | Result |
| --- | --- |
| `/`, `/privacy/`, `/terms/` | byte-identical |
| `/assets/index-DmsxhzHO.js` | byte-identical; SHA-256 `399136fbf000769eea730bb8467252f4988f4b94529e747f375c7b1023d13e6a` |
| `/assets/index-CtgdqOcw.css` | byte-identical; SHA-256 `03ce4c50abd896c269ff8561e6828cde19c67c1fe92f805b30466a772457711f` |
| hero, favicon, manifest, robots, sitemap, provenance | byte-identical |
| `/sw.js` | **MISMATCH — see High defect 1** |

Live responses supply HTTPS, HSTS, `Referrer-Policy:
strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`.
The worker controls the live page and its offline reload worked. However, all
assets (including hashed JS/CSS and the worker) use `Cache-Control: public,
must-revalidate, max-age=30`; no CSP, Permissions-Policy, or frame-ancestor
policy was supplied.

## Defects

### High — deployment identity mismatch (release blocker)

`npm run build` at the candidate produces `/sw.js` SHA-256
`773cc5e5770e4b65097ae49b6ab913b5865777f0074141740a80763db1f2fbe7` with
cache revision `scl-shell-ba731c88db`. Live `/sw.js` is SHA-256
`354081e22b7944db891e49affc9cacb20be89c25c8a3a21f9a90e26cc1fc0356`, revision
`scl-shell-6c6f856fb7`, and additionally precaches
`/instrument-hero.provenance.json`. This candidate therefore cannot be
confirmed as the live deployment, contrary to the work order. Redeploy the
clean `dist/site/` built from this commit, then rerun the artifact comparison.

### Medium — deployment cache policy misses the immutable-asset requirement

Hashed `/assets/index-*.js` and `/assets/index-*.css` are served with only
`max-age=30` and `must-revalidate`, not a long-lived immutable policy. Configure
the static host to serve fingerprinted assets with, for example,
`Cache-Control: public, max-age=31536000, immutable`; keep HTML and `sw.js`
short-lived so updates remain discoverable.

### Low — missing defense-in-depth response policies

The live site has no `Content-Security-Policy`, `Permissions-Policy`, or
frame-embedding restriction. Add a CSP suited to the static local-first app
(including the optional Sociobot API/checkout origins) and explicit frame and
permissions controls at the deployment layer.

## Required next step

Deploy the exact clean candidate output, especially its generated `sw.js`, and
correct immutable caching. Re-run this verification after deployment; product
source code was not changed during this QA pass.
