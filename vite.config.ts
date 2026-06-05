

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_UI_BASE_URL
    ? new URL(env.VITE_UI_BASE_URL).pathname
    : '/'

  return {
    base,
    plugins: [basicSsl(), react(), tailwindcss()],
    server: {
      host: true,
      cors: true,
      proxy: {
        "/api/ocr": {
          target: "http://192.168.5.47:8001",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ocr/, "/ocr"),
        },
        "/api/backend": {
          target: "http://localhost:9995",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/backend/, "/FCDM_App/V1"),
        },
      },
    },
  }
})