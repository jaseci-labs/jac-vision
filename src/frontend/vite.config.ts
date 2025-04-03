import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Keep the same port as CRA
    open: true, // Automatically open the browser
  },
  build: {
    outDir: 'dist', // Match CRA's output directory
  },
});