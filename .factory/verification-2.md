# Independent verification — PASS

Verified 28 August 2026 against candidate commit
`e6ca876f35aaedb945b529dda3489c53feed4aba`.

Target URL: <https://sync-conflict-lens.sociobot.in/>

## Decision

**PASS — accept this candidate.** A fresh clean build is healthy, the npm
package works when installed by an isolated consumer, the local and deployed
viewers complete the required two-replica diagnostic workflow, and every
public deployed artifact matches the clean candidate output byte-for-byte.
The deployment-integrity, immutable-cache, and response-policy failures in
`verification-1.md` are resolved.

## Clean-checkout quality gates

I created an isolated detached clone of the supplied SHA, installed with
`npm ci`, then ran the repository's available gates and production build.

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 148 packages installed; `npm audit --audit-level=high` found 0 vulnerabilities |
| `npm test` | PASS — Vitest 1 file / 7 tests, strict `tsc --noEmit`, and deterministic site-build regression |
| `npm run typecheck` | PASS |
| Lint | Not applicable: no lint script or lint configuration is supplied |
| `npm run build` | PASS — produced ESM, CJS, `.d.ts`, `.d.cts`, and `dist/site/` |
| `npm pack --json` | PASS — 8 files, 8,827 B tarball, 43,516 B unpacked |

An isolated npm consumer installed that packed tarball. Both documented ESM
and CommonJS imports replayed the supplied sample to 4 steps and 2 conflicts;
the exported bundle reported 7 redactions and contained neither
`mina@example.test` nor `session-private`.

## Product, accessibility, and privacy QA

Fresh Chromium 146 / Playwright 1.58.2 tests ran against the exact local
production build and the live URL at desktop (1440 px) and mobile (390 × 844).
There were **0 console errors, 0 page errors, 0 failed requests**, and no
initial external runtime requests in either case.

- Normal flow: paste/sample log → 4 causal timeline operations → 2 field
  conflicts → 7-value scrub preview → downloaded bundle. The export contains
  neither test email nor session identifier.
- File flow: a valid two-replica JSON upload analysed to 2 operations / 1
  conflict. A 2,000,001-byte file was rejected before loading.
- Invalid/recovery: malformed JSON showed an actionable parse error and
  **Replace with a valid sample** recovered. A three-replica log was rejected
  with the documented two-replica limit.
- Keyboard: timeline rows operated with Arrow Down and updated
  `aria-pressed`; the focused row had a visible non-`none` outline. The page
  includes a skip link, one `h1`, one `main`, `lang="en"`, meaningful image alt
  text, labelled controls, and semantic legal routes.
- Mobile/reduced motion: document `innerWidth`, client width, and scroll width
  were all 390 px; primary target height was at least 44 px; reduced-motion
  transition duration was 0.00001 s (the declared 0.01 ms override).
- axe-core WCAG 2 A/AA, 2.1 AA, and 2.2 AA: 0 violations, including 0
  serious/critical findings, on home after analysis, `/privacy/`, and `/terms/`.
- PWA: the service worker controlled a fresh page; an offline reload after
  first load retained the application title and shell.
- License recovery: a mocked successful Sociobot verification stored the
  returned `?license=` token, removed it from the address bar, and unlocked
  the Team Kit control. Without that explicit flow, completed analysis left
  both `localStorage` and `sessionStorage` empty.

Source review and the request trace confirm the local-first promise: logs,
analysis, notes, and bundles do not leave the tab; there is no analytics,
remote font, or third-party runtime script. The only designed outbound path
is optional, user-supplied Sociobot license verification. The privacy and
terms pages are present and render correctly.

## Deployment identity and response policy

All 13 public build artifacts were SHA-256-identical to production: root,
privacy and terms HTML; JavaScript, CSS, source map; favicon; hero; manifest;
robots; sitemap; provenance; and worker. Azure correctly consumes rather than
serves `staticwebapp.config.json` (live result: 404).

| Artifact | SHA-256 / result |
| --- | --- |
| `/assets/index-DmsxhzHO.js` | `399136fbf000769eea730bb8467252f4988f4b94529e747f375c7b1023d13e6a` — match |
| `/assets/index-CtgdqOcw.css` | `03ce4c50abd896c269ff8561e6828cde19c67c1fe92f805b30466a772457711f` — match |
| `/sw.js` | `1d4a026f6724ed6c7c3ec1be5f562aaa8a1cd87093e04b1fbc45243f070ee21f` — match; cache `scl-shell-6995fc1756` |
| remaining 10 public artifacts | match |

Live root HTML uses `public, max-age=0, must-revalidate`; fingerprinted JS/CSS
uses `public, max-age=31536000, immutable`; and `/sw.js` uses
`no-cache, no-store, must-revalidate`. Responses provide HTTPS/HSTS,
`Referrer-Policy: strict-origin-when-cross-origin`, `nosniff`, CSP with only
the site plus documented Sociobot billing origins, `frame-ancestors 'none'`,
`Permissions-Policy`, and `X-Frame-Options: DENY`.

## Performance

The built initial assets are 30,242 B JavaScript (10,861 B gzip), 20,363 B CSS
(5,670 B gzip), no font files, and an 89,244 B hero WebP—within the 200 KB JS,
50 KB CSS, 120 KB font, and 300 KB image budgets.

Fresh live mobile Lighthouse 13 report: Performance **92**, Accessibility
**100**, Best Practices **100**, SEO **100**; FCP 0.9 s, LCP 1.4 s, TBT 350 ms,
CLS 0. Lighthouse emitted a post-report browser-tab-crash diagnostic, but it
successfully wrote the complete report and category/audit results above; the
independent Playwright browser runs completed without crashes.

## Defects

None found. The existing product limits are intentional and documented: v1
accepts at most two replicas and supplies a deterministic diagnostic projection
rather than claiming arbitrary sync/CRDT merge correctness. A real paid
checkout was not charged during QA; its return-token and verification contract
was exercised with a mocked Sociobot response.
