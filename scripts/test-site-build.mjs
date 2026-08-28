import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}

const output = new URL('../dist/site/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('stale-fingerprint.txt', output), 'must not be deployed');
await run(process.execPath, ['scripts/build-site.mjs']);
await run(process.execPath, ['scripts/verify-site-build.mjs']);
