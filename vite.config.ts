import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_UI_BASE_URL
    ? new URL(env.VITE_UI_BASE_URL).pathname
    : '/'

  return {
    base,
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api/ocr": {
          target: "http://192.168.5.47:8001",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ocr/, "/ocr"),
        },
      },
    },
  }
})