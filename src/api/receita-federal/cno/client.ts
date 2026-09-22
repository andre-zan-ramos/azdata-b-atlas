import type { AxiosInstance } from 'axios'
import { apiClient } from '../../client'
import { ApiError } from '../../errors'
import type { Area, Cnae, CnoMunicipality, LinkFilters, MunicipalityFilters, Page, PaginationParams, WorkDetail, WorkFilters, WorkLink, WorkSummary } from './types'

export const filterKeys = {
  obras: ['cno', 'ni_responsavel', 'uf', 'codigo_municipio', 'situacao', 'cnae', 'cno_vinculado', 'data_inicio_obra_de', 'data_inicio_obra_ate'],
  areas: ['cno'], cnaes: ['cno', 'cnae'], vinculos: ['cno', 'ni_responsavel'], municipios: ['uf', 'nome'],
} as const
export type Endpoint = keyof typeof filterKeys
export function serializeParams(endpoint: Endpoint, params: object) {
  const result = new URLSearchParams()
  for (const key of [...filterKeys[endpoint], 'page', 'page_size', 'include_total']) {
    const value: unknown = (params as Record<string, unknown>)[key]
    if (value === undefined || value === null || value === '') continue
    let error: string | undefined
    if (key === 'page' && !(typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 999999999)) error = 'Use um inteiro de 1 a 999999999.'
    else if (key === 'page_size' && ![10, 25, 50].includes(value as number)) error = 'Use 10, 25 ou 50.'
    else if (key === 'include_total' && typeof value !== 'boolean') error = 'Use true ou false.'
    else if (!['page', 'page_size', 'include_total'].includes(key) && typeof value !== 'string') error = 'Informe um valor textual.'
    if (error) throw new ApiError('Revise os campos informados.', 400, undefined, { [key]: [error] })
    result.set(key, String(value))
  }
  return result
}
export function createCnoApi(client: AxiosInstance = apiClient) {
  const list = async <T>(endpoint: Endpoint, params: object, signal?: AbortSignal) => (await client.get<Page<T>>(`api/v1/receita-federal/cno/${endpoint}/`, { params: serializeParams(endpoint, params), signal })).data
  return {
    obras: (params: WorkFilters, signal?: AbortSignal) => list<WorkSummary>('obras', params, signal),
    areas: (params: PaginationParams & { cno?: string }, signal?: AbortSignal) => list<Area>('areas', params, signal),
    cnaes: (params: PaginationParams & { cno?: string; cnae?: string }, signal?: AbortSignal) => list<Cnae>('cnaes', params, signal),
    vinculos: (params: LinkFilters, signal?: AbortSignal) => list<WorkLink>('vinculos', params, signal),
    municipios: (params: MunicipalityFilters, signal?: AbortSignal) => list<CnoMunicipality>('municipios', params, signal),
    obra: async (id: string, signal?: AbortSignal) => {
      if (!/^[0-9]+$/.test(id)) throw new ApiError('Ocorrência não disponível.', 404)
      return (await client.get<WorkDetail>(`api/v1/receita-federal/cno/obras/${id}/`, { signal })).data
    },
  }
}
export const cnoApi = createCnoApi()
export const cnoQueryOptions = { retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false } as const
