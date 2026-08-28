import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';

const out = new URL('../dist/site/', import.meta.url);
const config = JSON.parse(await readFile(new URL('staticwebapp.config.json', out), 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(`Site build verification failed: ${message}`);
}

async function shellFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name === 'sw.js' || entry.name === 'staticwebapp.config.json') continue;
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) result.push(...await shellFiles(new URL(`${entry.name}/`, directory), `${relative}/`));
    else result.push(`/${relative}`);
  }
  return result;
}

assert(config.routes?.some((route) => route.route === '/assets/*' && route.headers?.['Cache-Control'] === 'public, max-age=31536000, immutable'), 'hashed assets need immutable caching');
assert(config.routes?.some((route) => route.route === '/sw.js' && route.headers?.['Cache-Control'] === 'no-cache, no-store, must-revalidate'), 'the service worker must be updateable');
assert(config.globalHeaders?.['Content-Security-Policy']?.includes("frame-ancestors 'none'"), 'CSP must prevent framing');
assert(config.globalHeaders?.['Permissions-Policy'], 'Permissions-Policy must be present');
assert(config.globalHeaders?.['X-Frame-Options'] === 'DENY', 'X-Frame-Options must deny framing');

const shell = await shellFiles(out);
assert(shell.includes('/instrument-hero.provenance.json'), 'provenance must be precached by the worker');
assert(!shell.includes('/staticwebapp.config.json'), 'deployment-only configuration must not be precached');
const worker = await readFile(new URL('sw.js', out), 'utf8');
const listed = JSON.parse(worker.match(/^const SHELL = (.+);$/m)?.[1] ?? 'null');
assert(Array.isArray(listed) && JSON.stringify(listed) === JSON.stringify(shell), 'worker precache list must match the clean deploy directory');
const fingerprint = await Promise.all(shell.map(async (relative) => {
  const bytes = await readFile(new URL(relative.slice(1), out));
  return `${relative}:${createHash('sha256').update(bytes).digest('hex')}`;
}));
const expectedRevision = createHash('sha256').update(fingerprint.join('|')).digest('hex').slice(0, 10);
assert(worker.includes(`const CACHE = 'scl-shell-${expectedRevision}';`), 'worker revision must fingerprint deploy artifact bytes');
await stat(new URL('index.html', out));
