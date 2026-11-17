import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    // The app talks to the email server through /api, so the browser sees one address.
    proxy: { '/api': 'http://127.0.0.1:4000' },
  },
});
