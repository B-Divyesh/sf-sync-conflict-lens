# Sync Conflict Lens

Turn two-device operation logs into a causal, reproducible conflict narrative—
without uploading customer data. Sync Conflict Lens is a vendor-neutral
TypeScript library and local browser viewer for developers shipping local-first
applications. It diagnoses the supplied log; it does not implement a sync
engine or claim to model every database's merge semantics.

The hosted viewer lives at <https://sync-conflict-lens.sociobot.in>. Analysis,
redaction, and bundle generation all run in the browser. No log is transmitted.

## Install

```sh
npm install sync-conflict-lens
```

## Usage

```ts
import { analyze, exportBugBundle, parseLog } from 'sync-conflict-lens';

const log = parseLog({
  version: 1,
  operations: [
    {
      id: 'phone-1', replica: 'phone', entity: 'task:42',
      timestamp: '2026-01-18T09:00:00.000Z', parents: [],
      changes: { title: 'Book train' }
    },
    {
      id: 'laptop-1', replica: 'laptop', entity: 'task:42',
      timestamp: '2026-01-18T09:00:02.000Z', parents: [],
      changes: { title: 'Book sleeper train' }
    }
  ]
});

const analysis = analyze(log);
console.log(analysis.conflicts[0].field); // "title"

const safeBundle = exportBugBundle(log, {
  redact: { paths: ['email', 'profile.name'], replacement: '[REDACTED]' },
  notes: 'Observed after both devices came back online.'
});
```

The documented log format is deliberately small:

- `version` must be `1`.
- `operations` contains 1–2 replicas. Each operation has a unique `id`, a
  `replica`, an `entity`, an ISO `timestamp`, zero or more `parents` by ID, and
  a `changes` object. Set `deleted: true` for a tombstone.
- Parent links establish causal order. Two operations are concurrent when
  neither descends from the other. Concurrent writes from different replicas
  to the same entity field with different JSON values are reported as a
  conflict.
- The replay state is a deterministic diagnostic projection ordered by causal
  topology, timestamp, replica, and ID. It is not a replacement for your
  engine's merge function.

Public API: `parseLog`, `validateLog`, `analyze`, `redactLog`,
`exportBugBundle`, `stringifyBugBundle`, and `SAMPLE_LOG`, plus their TypeScript
types. ESM, CommonJS, and declarations are included.

## Viewer workflow

Open or paste a JSON log, review validation issues, run the lens, move through
the causal timeline with the keyboard, tune redaction paths, preview the
scrubbed payload, and download a reproducible `.json` bug bundle. The app works
offline after the first visit and has a built-in sample.

The free tier includes the complete analyzer and safe export. A one-time Team
Kit unlock adds reusable adapter recipes and team presets; checkout and license
verification are handled by Sociobot, never a payment provider embedded here.

## Develop, test, and package

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
npm test
npm run build       # library -> dist/, site -> dist/site/
npm pack --dry-run  # inspect the publishable npm artifact
```

`npm run build:site` produces the deployable static site at `dist/site`, with
`index.html` at that root. Serve that directory for local verification:

```sh
npm run preview
```

## Privacy and security

There is no telemetry. Logs stay in memory unless you explicitly ask the
viewer to remember a redaction preset; licenses and daily verification verdicts
use local storage. Review a scrub preview before exporting. See the in-product
Privacy and Terms pages for details.

## License

MIT © 2026 Sociobot (Param Factory). See [LICENSE](LICENSE).
