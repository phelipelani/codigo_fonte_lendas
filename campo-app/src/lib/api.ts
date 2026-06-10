// Cliente HTTP do /campo.
// Web (mesma origem): usa '/api'. APK/dev override: VITE_API_BASE.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '/api'

const TOKEN_KEY = 'campo_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    if (res.status === 401) tokenStore.clear()
    throw new ApiError(data?.message || 'Erro na requisição.', res.status)
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

// Upload multipart (foto) — sem Content-Type manual (boundary automatico)
export async function uploadFoto(file: File): Promise<string> {
  const token = tokenStore.get()
  const form = new FormData()
  form.append('foto', file)
  const res = await fetch(`${API_BASE}/campo/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  })
  const data = await res.json()
  if (!res.ok) throw new ApiError(data?.message || 'Erro no upload.', res.status)
  return data.url as string
}
