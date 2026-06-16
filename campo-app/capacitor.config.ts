import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'br.com.futlendas.campo',
  appName: 'Campo Analista',
  webDir: 'dist',
  // origem da WebView = https://localhost (libere essa origem no CORS do backend)
  server: {
    androidScheme: 'https',
  },
}

export default config
