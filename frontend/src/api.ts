import type { Doc, Share, User } from './types'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '')
let token = localStorage.getItem('ajaia_token') || ''

export function setToken(value: string) {
  token = value
  if (value) localStorage.setItem('ajaia_token', value)
  else localStorage.removeItem('ajaia_token')
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API}${path}`, { ...init, headers })
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = await response.json()
      message = body.detail || body.message || message
    } catch { /* response was not JSON */ }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return response.json()
}

export const api = {
  me: () => request<User>('/auth/me'),
  login: (email: string) => request<{ access_token: string; user: User }>('/auth/demo-login', {
    method: 'POST', body: JSON.stringify({ email }),
  }),
  listDocs: () => request<Doc[]>('/documents'),
  getDoc: (id: string) => request<Doc>(`/documents/${id}`),
  createDoc: (title = 'Untitled document') => request<Doc>('/documents', {
    method: 'POST', body: JSON.stringify({ title, content: emptyContent }),
  }),
  updateDoc: (id: string, payload: { title?: string; content?: Record<string, unknown> }) =>
    request<Doc>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteDoc: (id: string) => request<void>(`/documents/${id}`, { method: 'DELETE' }),
  shares: (id: string) => request<Share[]>(`/documents/${id}/permissions`),
  grantShare: (id: string, email: string, permission: 'viewer' | 'editor') =>
    request<Share>(`/documents/${id}/share`, {
      method: 'POST', body: JSON.stringify({ email, permission }),
    }),
  removeShare: (id: string, userId: string) =>
    request<void>(`/documents/${id}/permissions/${userId}`, { method: 'DELETE' }),
  upload: async (file: File) => {
    const data = new FormData()
    data.append('file', file)
    return request<Doc>('/upload', { method: 'POST', body: data })
  },
}

export const emptyContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}
