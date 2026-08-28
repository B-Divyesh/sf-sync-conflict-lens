import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'vite';

const out = new URL('../dist/site/', import.meta.url);

// `build:site` is also the deployment build command. Do not inherit stale
// fingerprinted assets or an older worker when it is run without `build`.
await rm(out, { recursive: true, force: true });
await build({ configFile: new URL('../site/vite.config.ts', import.meta.url).pathname });

const index = await readFile(new URL('index.html', out), 'utf8');
for (const route of ['privacy', 'terms']) {
  const directory = new URL(`${route}/`, out);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('index.html', directory), index);
}

async function files(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    // Azure consumes this file while deploying and intentionally does not
    // expose it as a public URL, so it cannot be part of cache.addAll().
    if (entry.name === 'sw.js' || entry.name === 'staticwebapp.config.json') continue;
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) result.push(...await files(new URL(`${entry.name}/`, directory), `${relative}/`));
    else result.push(`/${relative}`);
  }
  return result;
}

// Provenance is a public deploy artifact and must be part of the same shell
// revision as the app that references its source image.
await cp(new URL('../.factory/assets/instrument-hero.png.json', import.meta.url), new URL('instrument-hero.provenance.json', out));

const shell = await files(out);
const fingerprint = await Promise.all(shell.map(async (relative) => {
  const content = await readFile(new URL(relative.slice(1), out));
  return `${relative}:${createHash('sha256').update(content).digest('hex')}`;
}));
const revision = createHash('sha256').update(fingerprint.join('|')).digest('hex').slice(0, 10);
const worker = `const CACHE = 'scl-shell-${revision}';\nconst SHELL = ${JSON.stringify(shell)};\nself.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())); });\nself.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });\nself.addEventListener('fetch', event => { if (event.request.method !== 'GET') return; event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response; }).catch(() => caches.match('/index.html')))); });\n`;
await writeFile(new URL('sw.js', out), worker);
