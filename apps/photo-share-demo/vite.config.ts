import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 开发时前端跑在 Vite（5173），/api 转发给本机 Node 服务（8787）。
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: { '/api': { target: 'http://localhost:8787' } },
  },
});
