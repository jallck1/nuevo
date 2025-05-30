import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Configuración base
  root: '.',
  publicDir: 'public',
  
  // Configuración de resolución de módulos
  resolve: {
    alias: {
      '@': resolve(__dirname, './js')
    }
  },
  
  // Configuración de compilación
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
  
  // Configuración del servidor de desarrollo
  server: {
    port: 3000,
    open: true,
    host: true
  },
  
  // Optimización de dependencias
  optimizeDeps: {
    include: ['@supabase/supabase-js']
  }
});
