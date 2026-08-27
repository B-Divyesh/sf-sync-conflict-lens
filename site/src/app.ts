import '../styles.css';
import {
  LensValidationError, SAMPLE_LOG, analyze, exportBugBundle, redactLog,
  stringifyBugBundle, type Analysis, type OperationLog
} from '../../src/index.js';
import {
  cachedLicenseState, captureReturnedLicense, checkoutUrl, restoreLicense, verifyLicense
} from './license.js';

const app = document.querySelector<HTMLDivElement>('#app')!;
const DEFAULT_RULES = 'ownerEmail, note, device, sessionId';
let currentLog: OperationLog | null = null;
let currentAnalysis: Analysis | null = null;

function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
}

function safeStorageGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function header(): string {
  return `<header class="site-header">
    <a class="wordmark" href="/" aria-label="Sync Conflict Lens home"><span class="mark" aria-hidden="true"><i></i></span><span>Sync Conflict Lens</span></a>
    <nav aria-label="Primary navigation"><a href="/#workbench">Workbench</a><a href="/#format">Log format</a><a href="/#team">Team kit</a><span id="network-status" class="network"><span aria-hidden="true"></span> Checking</span></nav>
  </header>`;
}

function footer(): string {
  return `<footer><div><a class="wordmark inverse" href="/"><span class="mark" aria-hidden="true"><i></i></span><span>Sync Conflict Lens</span></a><p>Vendor-neutral conflict evidence. Your log stays on your device.</p></div><nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="https://github.com/B-Divyesh/sf-sync-conflict-lens">Source</a></nav></footer>`;
}

function renderLegal(kind: 'privacy' | 'terms'): void {
  const privacy = kind === 'privacy';
  document.title = `${privacy ? 'Privacy' : 'Terms'} — Sync Conflict Lens`;
  app.innerHTML = `${header()}<main id="main" class="legal"><p class="eyebrow">Field manual · revised 27 August 2026</p><h1>${privacy ? 'Privacy, by construction.' : 'Plain terms for a diagnostic tool.'}</h1>
    ${privacy ? `<p class="lede">Your operation log is processed in this browser. Sync Conflict Lens has no log ingestion endpoint and no analytics.</p>
      <h2>What stays local</h2><p>Imported and pasted logs, analysis results, conflict values, notes, and exported bundles remain in browser memory until you close or reload the page. Exports are downloads you initiate. The service worker caches only application code and artwork.</p>
      <h2>What is stored</h2><p>If you save a Team Kit preset, that preset is stored in local storage. A pasted or returned purchase license and its last verification verdict are also stored locally. Clear site data to remove them.</p>
      <h2>What leaves the browser</h2><p>Only Team Kit license verification sends the opaque license token to the Sociobot billing API. It does not include your operation log or redaction rules. Checkout is hosted by Sociobot/Dodo, the merchant of record, under their payment privacy terms.</p>
      <h2>Your safety check</h2><p>Redaction is rule-based. Always inspect the scrub preview before sharing a bundle; the tool cannot know every field that contains personal data.</p>`
      : `<p class="lede">Use the analyzer to investigate supplied logs, not as a promise about the correctness of a sync engine.</p>
      <h2>License</h2><p>The open-source library and viewer are provided under the MIT License, without warranty. You remain responsible for validating findings against your application and merge semantics.</p>
      <h2>Team Kit purchase</h2><p>Team Kit is a US $49 one-time purchase for the adapter recipes and reusable preset tools described at checkout. Sociobot/Dodo is the merchant of record. Refunds are handled there; a refund automatically revokes the associated license.</p>
      <h2>Responsible use</h2><p>Only inspect data you are permitted to access. Do not assume redaction rules catch every identifier. Sync Conflict Lens is a diagnostic aid, not a sync transport, CRDT, compliance service, or data recovery guarantee.</p>
      <h2>Availability</h2><p>The free local analyzer remains usable without a license. Hosted availability and future adapters may change; downloaded open-source releases remain governed by their license.</p>`}
    <p><a class="text-link" href="/">← Return to the lens</a></p></main>${footer()}`;
  updateNetworkStatus();
}

function homeMarkup(): string {
  return `${header()}<main id="main">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy"><p class="eyebrow"><span class="lamp green"></span>Local instrument · no upload</p><h1 id="hero-title">Find where two replicas <em>lost the plot.</em></h1><p class="lede">Turn a real operation log into a causal conflict narrative in minutes. Replay both sides, inspect field collisions, and export a scrubbed bug bundle—all on this device.</p><div class="hero-actions"><a class="button primary" href="#workbench">Open the workbench</a><button class="button secondary" id="hero-sample" type="button">Try the sample log</button></div><p class="microcopy">Vendor-neutral · two replicas · deterministic diagnostic replay</p></div>
      <figure class="hero-instrument"><img src="/instrument-hero.webp" width="768" height="512" alt="Illustrated mid-century synchronograph where teal and amber replica traces meet at a red conflict marker" fetchpriority="high"><figcaption><span>Channel A</span><b>causal traces</b><span>Channel B</span></figcaption></figure>
    </section>
    <section class="workbench-section" id="workbench" aria-labelledby="workbench-title">
      <div class="section-heading"><div><p class="eyebrow">Workbench 01</p><h2 id="workbench-title">Load a two-replica log</h2></div><p>Nothing leaves this tab. Parent IDs establish causality; timestamp breaks ties only in the diagnostic projection.</p></div>
      <div class="workbench">
        <div class="input-panel">
          <div class="panel-label"><span>Input tape</span><span>JSON · v1</span></div>
          <label for="log-input">Operation log</label>
          <textarea id="log-input" spellcheck="false" aria-describedby="log-help" placeholder='{ "version": 1, "operations": […] }'></textarea>
          <p id="log-help" class="field-help">Paste JSON, drop a file here, or open one from your device. Maximum 2 MB / 10,000 operations.</p>
          <div class="input-actions"><label class="button file-button" for="file-input">Open JSON file</label><input id="file-input" type="file" accept=".json,application/json"><button class="button secondary" id="sample-button" type="button">Load sample</button><button class="button primary analyze-button" id="analyze-button" type="button">Run the lens <span aria-hidden="true">→</span></button></div>
          <div id="input-status" class="status-box empty" role="status" aria-live="polite"><span class="status-symbol" aria-hidden="true">○</span><div><strong>No log loaded</strong><p>Use the supplied sample to see the complete workflow.</p></div></div>
        </div>
        <div class="output-panel" aria-labelledby="output-title">
          <div class="panel-label"><span id="output-title">Lens display</span><span id="operation-count">Standby</span></div>
          <div id="analysis-output" class="analysis-empty"><div class="reticle" aria-hidden="true"><i></i></div><h3>Waiting for a signal</h3><p>Valid operations will appear here in causal order. Conflicting field writes get a fault marker and an explanation.</p></div>
        </div>
      </div>
    </section>
    <section class="method" aria-labelledby="method-title"><p class="eyebrow">Signal path</p><h2 id="method-title">From opaque log to shareable evidence</h2><ol><li><span>01</span><h3>Load locally</h3><p>Parse a small, documented operation format without sending it to a server.</p></li><li><span>02</span><h3>Follow causality</h3><p>Topologically replay parent links and mark concurrent writes field by field.</p></li><li><span>03</span><h3>Scrub and export</h3><p>Apply explicit redaction paths, inspect the preview, then download the bundle.</p></li></ol></section>
    <section class="format-section" id="format" aria-labelledby="format-title"><div><p class="eyebrow">Open format · 0.1</p><h2 id="format-title">Five fields. No vendor lock-in.</h2><p>Adapt your engine’s debug output once. The lens needs identity, replica, entity, time, and causal parents; <code>changes</code> holds JSON field values.</p><a class="text-link" href="https://www.npmjs.com/package/sync-conflict-lens">Read the package docs <span aria-hidden="true">↗</span></a></div><pre aria-label="Example operation log"><code>{
  "version": 1,
  "operations": [{
    "id": "phone-2",
    "replica": "phone",
    "entity": "note:departure",
    "timestamp": "2026-08-24T08:04:10Z",
    "parents": ["base-1"],
    "changes": { "status": "ready" }
  }]
}</code></pre></section>
    <section class="team-section" id="team" aria-labelledby="team-title"><div><p class="eyebrow">Optional team kit</p><h2 id="team-title">Standardize the handoff, not the data.</h2><p>Save team redaction presets and download adapter recipes for common logger shapes. The full analyzer and safe export stay free.</p><ul><li>Reusable local redaction presets</li><li>Adapter recipe starter pack</li><li>Priority implementation support</li></ul><button class="button secondary team-only" id="download-adapters" type="button" hidden>Download adapter recipes</button></div><div class="price-panel"><p class="price"><span>$</span>49</p><p>USD · one-time purchase</p><a class="button primary wide" id="buy-link" href="${checkoutUrl()}">Buy Team Kit</a><details><summary>Have a license? Restore it</summary><label for="license-input">License token</label><input id="license-input" type="text" autocomplete="off"><button id="restore-license" class="button secondary wide" type="button" aria-label="Verify pasted Team Kit license">Verify license</button></details><p id="license-status" class="license-status" aria-live="polite">License verification never includes your log.</p><p class="legal-links">Sociobot/Dodo is merchant of record. <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p></div></section>
  </main>${footer()}<div id="announcer" class="sr-only" aria-live="polite"></div>`;
}

function setStatus(kind: 'empty' | 'valid' | 'error' | 'loading', title: string, body: string): void {
  const status = document.querySelector<HTMLDivElement>('#input-status');
  if (!status) return;
  const symbols = { empty: '○', valid: '✓', error: '!', loading: '⋯' };
  status.className = `status-box ${kind}`;
  status.innerHTML = `<span class="status-symbol" aria-hidden="true">${symbols[kind]}</span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></div>`;
}

function rules(): string[] {
  const input = document.querySelector<HTMLInputElement>('#redaction-rules');
  return (input?.value ?? DEFAULT_RULES).split(',').map((rule) => rule.trim()).filter(Boolean);
}

function renderAnalysis(analysis: Analysis): void {
  const output = document.querySelector<HTMLDivElement>('#analysis-output')!;
  const conflictWord = analysis.conflicts.length === 1 ? 'conflict' : 'conflicts';
  output.className = 'analysis-results';
  output.innerHTML = `<div class="result-summary"><div><span class="summary-number">${analysis.conflicts.length}</span><span>field ${conflictWord}</span></div><div><span class="summary-number">${analysis.timeline.length}</span><span>operations</span></div><div><span class="summary-number">${analysis.replicas.length}</span><span>replicas</span></div></div>
    <div class="caveat"><span aria-hidden="true">i</span><p>${escapeHtml(analysis.caveat)}</p></div>
    <div class="result-grid"><section class="timeline-panel" aria-labelledby="timeline-title"><div class="subhead"><h3 id="timeline-title">Causal timeline</h3><span>↑ ↓ to inspect</span></div><ol class="timeline" id="timeline">${analysis.timeline.map((step, index) => {
      const isConflict = step.conflictIds.length > 0;
      const channel = analysis.replicas.indexOf(step.operation.replica) % 2;
      return `<li><button type="button" class="timeline-row channel-${channel} ${isConflict ? 'has-conflict' : ''}" data-step="${index}" aria-pressed="${index === 0 ? 'true' : 'false'}"><span class="trace-node" aria-hidden="true"></span><span class="time">${escapeHtml(new Date(step.operation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))}</span><span class="event"><strong>${escapeHtml(step.operation.id)}</strong><small>${escapeHtml(step.operation.replica)} · ${escapeHtml(step.operation.entity)}</small></span>${isConflict ? '<span class="fault">◆ conflict</span>' : '<span class="causal">causal</span>'}</button></li>`;
    }).join('')}</ol></section><aside class="detail-panel" id="step-detail" aria-live="polite"></aside></div>
    <section class="scrub-panel" aria-labelledby="scrub-title"><div class="subhead"><div><p class="eyebrow">Output safety</p><h3 id="scrub-title">Scrub before sharing</h3></div><span class="safety-seal">Local preview</span></div><label for="redaction-rules">Redact field names or dot paths <small>(comma separated; * and ** supported)</small></label><input id="redaction-rules" value="${escapeHtml(safeStorageGet('scl:team-redaction') ?? DEFAULT_RULES)}"><div class="scrub-actions"><button class="button secondary" id="preview-scrub" type="button">Refresh scrub preview</button><button class="button secondary team-only" id="save-preset" type="button" hidden>Save team preset</button><button class="button primary" id="export-bundle" type="button">Download scrubbed bundle</button></div><div id="scrub-preview" class="scrub-preview"></div></section>`;
  document.querySelector('#operation-count')!.textContent = `${analysis.timeline.length} ops · ${analysis.conflicts.length} faults`;
  bindResultEvents();
  selectStep(0);
  refreshScrubPreview();
  updateTeamUI();
}

function selectStep(index: number): void {
  if (!currentAnalysis) return;
  const step = currentAnalysis.timeline[index];
  if (!step) return;
  document.querySelectorAll<HTMLButtonElement>('.timeline-row').forEach((button, buttonIndex) => {
    button.setAttribute('aria-pressed', String(buttonIndex === index));
  });
  const conflicts = currentAnalysis.conflicts.filter((conflict) => step.conflictIds.includes(conflict.id));
  const detail = document.querySelector<HTMLElement>('#step-detail')!;
  detail.innerHTML = `<p class="eyebrow">Selected operation</p><h3>${escapeHtml(step.operation.id)}</h3><dl><div><dt>Replica</dt><dd>${escapeHtml(step.operation.replica)}</dd></div><div><dt>Entity</dt><dd>${escapeHtml(step.operation.entity)}</dd></div><div><dt>Parents</dt><dd>${step.operation.parents.length ? step.operation.parents.map(escapeHtml).join(', ') : 'root'}</dd></div></dl><p class="detail-label">Changes</p><pre tabindex="0" aria-label="Selected operation changes"><code>${escapeHtml(JSON.stringify(step.operation.changes, null, 2))}</code></pre>${conflicts.length ? `<div class="conflict-list"><h4>Faults on this operation</h4>${conflicts.map((conflict) => `<article><strong>◆ ${escapeHtml(conflict.field)}</strong><p><code>${escapeHtml(JSON.stringify(conflict.left.value))}</code> vs <code>${escapeHtml(JSON.stringify(conflict.right.value))}</code></p><small>${escapeHtml(conflict.left.replica)} ↔ ${escapeHtml(conflict.right.replica)} · concurrent</small></article>`).join('')}</div>` : '<p class="no-fault"><span>✓</span> No conflicting field write at this step.</p>'}`;
}

function refreshScrubPreview(): void {
  if (!currentLog) return;
  const preview = document.querySelector<HTMLDivElement>('#scrub-preview');
  if (!preview) return;
  const result = redactLog(currentLog, { paths: rules() });
  preview.innerHTML = `<div><strong>${result.redactionCount} values masked</strong><span>${result.redactedPaths.length ? result.redactedPaths.map(escapeHtml).join(' · ') : 'No paths matched. Review rules before export.'}</span></div><pre tabindex="0" aria-label="Scrubbed log preview"><code>${escapeHtml(JSON.stringify(result.log, null, 2).slice(0, 2500))}${JSON.stringify(result.log).length > 2500 ? '\n… preview truncated' : ''}</code></pre>`;
}

function download(name: string, content: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportBundle(): void {
  if (!currentLog) return;
  const bundle = exportBugBundle(currentLog, { redact: { paths: rules() }, notes: 'Exported from the local Sync Conflict Lens viewer.' });
  download(`sync-conflict-${new Date().toISOString().slice(0, 10)}.json`, stringifyBugBundle(bundle));
  announce(`Downloaded scrubbed bundle with ${bundle.redaction.count} values masked.`);
}

function bindResultEvents(): void {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('.timeline-row')];
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => selectStep(index));
    button.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowDown' ? Math.min(index + 1, buttons.length - 1) : Math.max(index - 1, 0);
      buttons[target]?.focus(); selectStep(target);
    });
  });
  document.querySelector('#preview-scrub')?.addEventListener('click', refreshScrubPreview);
  document.querySelector('#redaction-rules')?.addEventListener('input', refreshScrubPreview);
  document.querySelector('#export-bundle')?.addEventListener('click', exportBundle);
  document.querySelector('#save-preset')?.addEventListener('click', () => {
    try { localStorage.setItem('scl:team-redaction', rules().join(', ')); announce('Team redaction preset saved on this device.'); }
    catch { announce('The preset could not be saved in this browser.'); }
  });
}

function announce(message: string): void {
  const region = document.querySelector('#announcer');
  if (region) region.textContent = message;
}

function loadSample(run = false): void {
  const input = document.querySelector<HTMLTextAreaElement>('#log-input')!;
  input.value = JSON.stringify(SAMPLE_LOG, null, 2);
  setStatus('valid', 'Sample ready', 'Four operations across phone and laptop. Run the lens to inspect them.');
  if (run) runAnalysis(); else input.focus();
}

function runAnalysis(): void {
  const input = document.querySelector<HTMLTextAreaElement>('#log-input')!;
  const button = document.querySelector<HTMLButtonElement>('#analyze-button')!;
  button.disabled = true;
  setStatus('loading', 'Tracing parent links', 'Building the causal projection on this device…');
  requestAnimationFrame(() => setTimeout(() => {
    try {
      currentLog = JSON.parse(input.value) as OperationLog;
      currentAnalysis = analyze(currentLog);
      renderAnalysis(currentAnalysis);
      setStatus('valid', 'Log calibrated', `${currentAnalysis.timeline.length} operations across ${currentAnalysis.replicas.length} replicas.`);
      announce(`Analysis complete. ${currentAnalysis.conflicts.length} field conflicts found.`);
    } catch (error) {
      currentLog = null; currentAnalysis = null;
      const details = error instanceof LensValidationError ? error.issues.map((issue) => `${issue.path}: ${issue.message}`).join(' ') : error instanceof SyntaxError ? `JSON could not be parsed: ${error.message}` : 'The log could not be analyzed. Check its JSON and operation fields.';
      setStatus('error', 'The signal could not be read', details);
      const output = document.querySelector<HTMLDivElement>('#analysis-output')!;
      output.className = 'analysis-empty error-state';
      output.innerHTML = `<div class="error-glyph" aria-hidden="true">!</div><h3>Check the input tape</h3><p>${escapeHtml(details)}</p><button type="button" class="text-button" id="error-sample">Replace with a valid sample</button>`;
      document.querySelector('#error-sample')?.addEventListener('click', () => loadSample());
      document.querySelector('#operation-count')!.textContent = 'Input error';
    } finally { button.disabled = false; }
  }, 60));
}

async function readFile(file: File): Promise<void> {
  if (file.size > 2_000_000) { setStatus('error', 'File is too large', 'Choose a JSON log under 2 MB. Split long captures before analysis.'); return; }
  const input = document.querySelector<HTMLTextAreaElement>('#log-input')!;
  input.value = await file.text();
  setStatus('valid', `${file.name} loaded`, 'The file is in browser memory only. Run the lens when ready.');
}

function updateNetworkStatus(): void {
  const status = document.querySelector<HTMLElement>('#network-status');
  if (!status) return;
  const online = navigator.onLine;
  status.classList.toggle('offline', !online);
  status.innerHTML = `<span aria-hidden="true"></span> ${online ? 'Local mode' : 'Offline ready'}`;
}

function updateTeamUI(): void {
  const state = cachedLicenseState();
  const status = document.querySelector<HTMLElement>('#license-status');
  document.querySelectorAll<HTMLElement>('.team-only').forEach((element) => { element.hidden = !state.unlocked; });
  if (status) status.textContent = state.unlocked ? 'Team Kit active on this device.' : state.reason && state.reason !== 'ok' ? 'License no longer active. You can restore another license or purchase again.' : 'License verification never includes your log.';
}

function initLicense(): void {
  captureReturnedLicense();
  updateTeamUI();
  const input = document.querySelector<HTMLInputElement>('#license-input');
  document.querySelector('#restore-license')?.addEventListener('click', async () => {
    if (!input?.value.trim()) { input?.focus(); return; }
    restoreLicense(input.value);
    const status = document.querySelector<HTMLElement>('#license-status');
    if (status) status.textContent = 'Verifying license…';
    const verdict = await verifyLicense(true);
    if (status && !verdict) status.textContent = 'Could not reach license verification. The free analyzer remains ready.';
    updateTeamUI();
  });
  verifyLicense().then(() => updateTeamUI()).catch(() => {});
  document.querySelector('#download-adapters')?.addEventListener('click', () => {
    const recipes = `# Sync Conflict Lens — Team adapter recipes\n\nMap each engine event to this vendor-neutral shape:\n\n\`\`\`ts\nimport type { Operation } from 'sync-conflict-lens';\n\nexport function adapt(event: YourEngineEvent): Operation {\n  return {\n    id: event.id,\n    replica: event.clientId,\n    entity: \`${'${event.table}:${event.recordId}'}\`,\n    timestamp: new Date(event.time).toISOString(),\n    parents: event.causalParents ?? [],\n    changes: event.patch,\n    metadata: { adapter: 'team-local-v1' }\n  };\n}\n\`\`\`\n\nChecklist: preserve stable operation IDs; emit explicit parent IDs; keep values JSON-safe; remove binary payloads; add sensitive metadata fields to a saved redaction preset.\n`;
    download('sync-conflict-lens-adapter-recipes.md', recipes, 'text/markdown');
    announce('Downloaded Team Kit adapter recipes.');
  });
}

function bindHome(): void {
  const input = document.querySelector<HTMLTextAreaElement>('#log-input')!;
  document.querySelector('#sample-button')?.addEventListener('click', () => loadSample());
  document.querySelector('#hero-sample')?.addEventListener('click', () => { loadSample(true); document.querySelector('#workbench')?.scrollIntoView({ behavior: 'smooth' }); });
  document.querySelector('#analyze-button')?.addEventListener('click', runAnalysis);
  document.querySelector<HTMLInputElement>('#file-input')?.addEventListener('change', (event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]; if (file) readFile(file);
  });
  input.addEventListener('dragover', (event) => { event.preventDefault(); input.classList.add('dragging'); });
  input.addEventListener('dragleave', () => input.classList.remove('dragging'));
  input.addEventListener('drop', (event) => { event.preventDefault(); input.classList.remove('dragging'); const file = event.dataTransfer?.files[0]; if (file) readFile(file); });
  input.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') runAnalysis(); });
  initLicense();
}

function start(): void {
  const route = location.pathname.replace(/\/+$/, '');
  if (route === '/privacy') renderLegal('privacy');
  else if (route === '/terms') renderLegal('terms');
  else { app.innerHTML = homeMarkup(); bindHome(); updateNetworkStatus(); }
  addEventListener('online', updateNetworkStatus);
  addEventListener('offline', updateNetworkStatus);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('/sw.js').catch(() => {});
}

start();
