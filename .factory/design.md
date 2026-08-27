# Visual thesis — Field Synchronograph

## Direction and rationale

Sync Conflict Lens is a **mid-century instrument panel**, not a generic SaaS
dashboard. A developer is reconstructing a past event from two imperfect
signals, so the product borrows the calm legibility of a 1960s bench
oscilloscope: enamel casing, dark bezels, labeled channels, stamped metadata,
and small status lamps. Decoration always explains a diagnostic concept. The
two signal traces converge in the hero; the same channel language identifies
replicas throughout the viewer.

This is intentionally a single light treatment. The warm enamel ground is the
product's physical metaphor and keeps amber, teal, and red states stable while
reading logs under pressure. Dark trace panels create local depth without
turning the whole experience into a default dark developer tool.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#f1ead7` | enamel page background |
| `--paper-deep` | `#ded3b8` | recessed controls and table bands |
| `--ink` | `#202824` | primary text; 12.4:1 on paper |
| `--muted` | `#535e57` | secondary text; 5.6:1 on paper |
| `--panel` | `#17211e` | trace display / footer |
| `--panel-ink` | `#f6efd9` | text on panel |
| `--teal` | `#087b75` | replica A and primary action |
| `--teal-dark` | `#075f5b` | interactive contrast |
| `--amber` | `#b76508` | replica B and warnings |
| `--red` | `#a6322b` | confirmed conflict/fault |
| `--green` | `#2e6f46` | valid, scrubbed, offline-ready |

Color never carries state alone: channel labels, patterns, shapes, and explicit
text accompany every color.

## Typography

- Headings and display labels: **Arial Rounded MT Bold**, falling back to
  `Avenir Next`, `Trebuchet MS`, and system sans. Its engineered curves evoke
  stamped instrument lettering without an external font payload.
- Body and long-form help: **Georgia**, falling back to `Times New Roman`, for
  readable technical narrative and a field-manual tone.
- Data, JSON, times, and badges: **ui-monospace** system stack with tabular
  figures. No third-party fonts are loaded.
- Scale: 14 / 16 / 20 / 28 / clamp(40–72) px; body is never below 16 px.

## Spacing and layout

An 8 px base rhythm with 4 px only for optical nudges. Controls are at least
44 px. The desktop uses an asymmetric 5/7 split like a control desk; at 760 px
the desk stacks and nonessential hero calibration marks disappear. Text measure
stays within 72 characters. Corners are modest (4–14 px), with keyed/chamfered
corners on important panels instead of universal rounded cards.

## Interaction grammar

- Primary actions look like teal hardware keys and depress by 2 px.
- Segmented controls resemble labeled channel selectors.
- Replica A is a solid teal trace; replica B is a dashed amber trace.
- Conflicts appear as red diamond fault markers with a text label.
- Focus uses a 3 px amber outer ring plus ink offset, visible on every surface.
- Analysis updates announce through a polite live region. Timeline rows are
  keyboard-selectable buttons and preserve DOM order as causal order.

## Motion policy

Transitions last 160–240 ms and affect only opacity and transform. On analysis,
timeline rows settle once from their causal origin; the selected row gets a
single lamp-like emphasis. Nothing loops. With `prefers-reduced-motion: reduce`,
all translation and smooth scrolling are removed and state changes are instant.

## Original asset plan and provenance

`site/public/instrument-hero.webp` is an original AI-assisted editorial
illustration generated for this product with the factory image tool
(`/opt/fleet/lib/gen-image.sh`, deployment recorded by its JSON sidecar), then
locally optimized to WebP. Prompt: “mid-century scientific instrument panel,
two causal signal traces approaching a red conflict diamond, warm cream enamel,
deep graphite screen, teal and amber ink, tactile knobs and punched paper grid,
flat editorial gouache with subtle print texture, wide landing-page crop, no
letters, logos, people, gradients, or watermark.” Its role is explanatory: it
establishes the two-replica model before the viewer. UI icons and trace marks
are hand-authored CSS/SVG primitives in the repository under the MIT project
license.
