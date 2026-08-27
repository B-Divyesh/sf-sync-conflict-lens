import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'vite';

const out = new URL('../dist/site/', import.meta.url);
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
  for (const entry of entries) {
    if (entry.name === 'sw.js') continue;
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) result.push(...await files(new URL(`${entry.name}/`, directory), `${relative}/`));
    else result.push(`/${relative}`);
  }
  return result;
}

const shell = await files(out);
const revision = createHash('sha256').update(shell.join('|')).digest('hex').slice(0, 10);
const worker = `const CACHE = 'scl-shell-${revision}';\nconst SHELL = ${JSON.stringify(shell)};\nself.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())); });\nself.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });\nself.addEventListener('fetch', event => { if (event.request.method !== 'GET') return; event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response; }).catch(() => caches.match('/index.html')))); });\n`;
await writeFile(new URL('sw.js', out), worker);

// Keep image-generation provenance beside the deployable optimized asset.
await cp(new URL('../.factory/assets/instrument-hero.png.json', import.meta.url), new URL('instrument-hero.provenance.json', out)).catch(() => {});
