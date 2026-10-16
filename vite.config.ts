import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Configure base path dynamically:
// - GitHub Pages repository: /University-Academic-Calculator/
// - Vercel / Local dev: /
const isGitHubPages =
  process.env.GITHUB_PAGES === 'true' ||
  (process.env.GITHUB_ACTIONS === 'true' && !process.env.VERCEL);

export default defineConfig({
  base: isGitHubPages ? '/University-Academic-Calculator/' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'vendor-pdf';
          }
          if (id.includes('node_modules/tesseract.js')) {
            return 'vendor-ocr';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router-dom')
          ) {
            return 'vendor-react';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
