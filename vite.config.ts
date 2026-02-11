
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to bypass type error for cwd() in environment where @types/node might be shadowed
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Fix: Ensure process.env.API_KEY is defined for the browser from the loaded env or system env
      'process.env.API_KEY': JSON.stringify(env.API_KEY || (process as any).env.API_KEY || "")
    }
  };
});
