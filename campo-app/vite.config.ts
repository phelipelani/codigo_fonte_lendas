import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base '/campo/'  => assets resolvem em futlendas.com.br/campo/ (build web)
// base './'        => assets relativos (build do APK / Capacitor, mode=capacitor)
// proxy /api no dev => evita CORS apontando pro backend de producao
export default defineConfig(({ mode }) => ({
  base: mode === 'capacitor' ? './' : '/campo/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://futlendas.com.br',
        changeOrigin: true,
        secure: true,
      },
    },
  },
}))
