import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/jotform-api': {
        target: 'https://api.jotform.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/jotform-api/, ''),
        secure: true,
      },
    },
  },
});
