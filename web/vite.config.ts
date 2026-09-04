import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // API isteklerini backend'e yönlendir (VITE_API_URL kullanmıyorsanız).
      '/api': {
        target: 'http://localhost:5080',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Satıcı (vendor) kütüphanelerini ayrı parçalara böl → daha küçük ana paket,
    // tarayıcı önbelleği daha iyi çalışır, "500 kB" uyarısı ortadan kalkar.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'data-vendor': ['@tanstack/react-query', 'axios'],
          'ui-vendor': ['lucide-react', 'qrcode.react'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
