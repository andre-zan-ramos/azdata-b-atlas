import type { AxiosInstance } from 'axios'
import { apiClient } from '../client'
import type { PortalPage, PortalRecord, PortalResourcesParams } from './types'

const PREFIX = 'api/v1/portal-transparencia/pessoas-juridicas/'

function params(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value))
  })
  return query
}

export function createPortalTransparenciaApi(client: AxiosInstance = apiClient) {
  const get = async <T>(path: string, query?: URLSearchParams, signal?: AbortSignal) => (
    await client.get<T>(PREFIX + path, { params: query, signal })
  ).data

  return {
    person: (cnpj: string, signal?: AbortSignal) => get<PortalRecord>(`${cnpj}/`, undefined, signal),
    resources: (cnpj: string, values: PortalResourcesParams, signal?: AbortSignal) => get<PortalPage>(
      `${cnpj}/recursos-recebidos/`,
      params(values),
      signal,
    ),
    contracts: (cnpj: string, pagina = 1, signal?: AbortSignal) => get<PortalPage>(
      `${cnpj}/contratos/`,
      params({ pagina }),
      signal,
    ),
  }
}

export const portalTransparenciaApi = createPortalTransparenciaApi()
