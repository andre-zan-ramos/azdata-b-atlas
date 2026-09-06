import axios from 'axios'
import { normalizeApiError } from './errors'

function apiBaseUrl(value: string | undefined) {
  if (!value?.trim()) throw new Error('Configure VITE_AZDATA_API_BASE_URL para consultar a API.')
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw new Error('VITE_AZDATA_API_BASE_URL deve ser uma URL HTTP ou HTTPS válida.')
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('VITE_AZDATA_API_BASE_URL deve conter somente uma origem HTTP ou HTTPS, sem caminho.')
  }
  if (url.pathname !== '/') throw new Error('VITE_AZDATA_API_BASE_URL deve conter somente uma origem HTTP ou HTTPS, sem caminho.')
  return url.origin + '/'
}

export function createApiClient(baseUrl: string | undefined) {
  const client = axios.create({ timeout: 15_000 })
  client.interceptors.request.use((config) => {
    // Validação no primeiro acesso: o shell funciona sem backend configurado.
    config.baseURL = apiBaseUrl(baseUrl)
    return config
  })
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(normalizeApiError(error)),
  )
  return client
}

export const apiClient = createApiClient(import.meta.env.VITE_AZDATA_API_BASE_URL)
