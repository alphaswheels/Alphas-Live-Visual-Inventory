import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      target: 'esnext'
    },
    server: {
      port: 3000
    },
    define: {
      // Polyfill process.env for client-side usage of the Google GenAI SDK
      // Use fallback to empty string to prevent crashes if key is missing
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});