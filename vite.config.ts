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
});
