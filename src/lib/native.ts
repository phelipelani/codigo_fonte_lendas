// Integração com o app nativo (Capacitor). No-op no navegador web.
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'

export const ehNativo = () => Capacitor.isNativePlatform()

// Abre o login Google no navegador in-app (Custom Tab). O OAuth volta pro app
// via deep link `futlendas://auth/callback#token=...` (ver registrarDeepLinks).
export async function loginGoogleNativo(authUrl: string) {
  await Browser.open({ url: authUrl })
}

// Captura o retorno do OAuth por deep link e reaproveita as rotas web do app.
// Ex.: futlendas://auth/callback#token=XXX  ->  navega para /auth/callback#token=XXX
export function registrarDeepLinks() {
  if (!Capacitor.isNativePlatform()) return
  App.addListener('appUrlOpen', async ({ url }) => {
    if (!url.startsWith('futlendas://')) return
    const rest = url.replace(/^futlendas:\/\//, '') // ex: "auth/callback#token=XXX"
    try {
      await Browser.close()
    } catch {
      /* a Custom Tab pode ja ter fechado */
    }
    window.location.href = '/' + rest
  })
}
