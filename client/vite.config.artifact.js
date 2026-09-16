import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build especial solo para publicar como Artifact: bundle único en formato IIFE
// (no ES module) para evitar que el navegador exija CORS al cargar el script,
// ya que no controlamos cómo el hosting del artifact sirve los archivos estáticos.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-artifact',
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'app.js',
      },
    },
  },
});
