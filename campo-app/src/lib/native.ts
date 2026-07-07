import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { tokenStore } from './api'

export const ehNativo = () => Capacitor.isNativePlatform()

// Abre o login Google no navegador in-app (Custom Tab). O OAuth volta pro app
// via deep link `futlendascampo://auth/callback?token=...` (ver registrarDeepLinks).
export async function loginGoogleNativo(authUrl: string) {
  await Browser.open({ url: authUrl })
}

// Registra o handler do deep link de retorno do OAuth. No-op fora do app nativo.
export function registrarDeepLinks() {
  if (!Capacitor.isNativePlatform()) return
  App.addListener('appUrlOpen', async ({ url }) => {
    if (!url.includes('auth/callback')) return
    const params = new URLSearchParams(url.split('?')[1] ?? '')
    const token = params.get('token')
    const erro = params.get('erro')
    try {
      await Browser.close()
    } catch {
      /* a Custom Tab pode ja ter fechado */
    }
    if (token) {
      tokenStore.set(token)
      window.location.hash = '#/'
      window.location.reload() // reinicia o AuthProvider, que loga com o token
    } else {
      window.location.hash = '#/login?erro=' + encodeURIComponent(erro || 'falha_google')
    }
  })
}
