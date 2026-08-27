import { defineConfig } from 'vite';

export default defineConfig({
  root: new URL('.', import.meta.url).pathname,
  publicDir: 'public',
  base: '/',
  build: {
    outDir: '../dist/site',
    emptyOutDir: false,
    target: 'es2022',
    sourcemap: true,
    cssCodeSplit: true,
    rollupOptions: { input: new URL('./index.html', import.meta.url).pathname }
  },
  preview: { port: 4173 }
});
