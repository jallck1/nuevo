import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Configuración de resolución de módulos
  resolve: {
    alias: {
      '@': resolve(__dirname, './js')
    }
  },
  
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin/dashboard.html'),
        buyer: resolve(__dirname, 'buyer/dashboard.html')
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    host: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './js')
    }
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js']
  }
});
