import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    target: 'esnext',
    sourcemap: false
  },
  server: {
    port: 3000,
    open: false
  }
});
