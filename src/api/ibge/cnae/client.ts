import type { AxiosInstance } from 'axios'
import { apiClient } from '../../client'
import { ApiError } from '../../errors'
import type { Catalog, CnaeNode, CnaePage, CnaeResponse, Correspondence, CorrespondenceFilters, Level, NodeDetail, NodeFilters, PublicationParams, Relationship, RelationshipFilters } from './types'

const BASE = 'api/v1/ibge/cnae/'
type Params = Record<string, string | number | undefined>

// Empty strings are meaningful correspondence filters. Never trim or deduplicate.
export function cnaeParams(params: Params) {
  return new URLSearchParams(Object.entries(params).flatMap(([key, value]) => value === undefined ? [] : [[key, String(value)]]))
}

export function createCnaeApi(client: AxiosInstance) {
  async function get<T extends Catalog>(path: string, params: Params, signal?: AbortSignal): Promise<T> {
    const { data } = await client.get<T>(BASE + path, { params: cnaeParams(params), signal })
    if (params.publication_id !== undefined && data.publication_id !== params.publication_id) {
      throw new ApiError('A publicação atual difere da esperada.', 409, 'publication_mismatch')
    }
    return data
  }
  return {
    catalog: (params: PublicationParams = {}, signal?: AbortSignal) => get<Catalog>('catalogo/', params, signal),
    nodes: (params: NodeFilters, signal?: AbortSignal) => get<CnaePage<CnaeNode>>('nos/', params, signal),
    node: (level: Level, code: string, params: PublicationParams, signal?: AbortSignal) => get<NodeDetail>(`nos/${encodeURIComponent(level)}/${encodeURIComponent(code)}/`, params, signal),
    relationships: (params: RelationshipFilters, signal?: AbortSignal) => get<CnaePage<Relationship>>('relacoes/', params, signal),
    correspondences: (params: CorrespondenceFilters, signal?: AbortSignal) => get<CnaePage<Correspondence>>('correspondencias/', params, signal),
    follow: async (link: string, publication: string, signal?: AbortSignal): Promise<CnaeResponse> => {
      // Use the configured AzData origin, preserving the complete query of API links.
      // Absolute links never redirect this client to an arbitrary third-party origin.
      const url = new URL(link, 'https://cnae.invalid/')
      const path = url.pathname.slice(1)
      if (url.username || url.password || url.hash || !['http:', 'https:'].includes(url.protocol) ||
          !/^api\/v1\/ibge\/cnae\/(nos\/|relacoes\/|correspondencias\/|nos\/(secao|divisao|grupo|classe|subclasse)\/[^/]+\/)$/.test(path) ||
          url.searchParams.getAll('publication_id').length !== 1 || url.searchParams.get('publication_id') !== publication) {
        throw new ApiError('Link de navegação CNAE inválido para esta publicação.', 400, 'invalid_parameter')
      }
      const { data } = await client.get<CnaeResponse>(path + url.search, { signal })
      if (data.publication_id !== publication) throw new ApiError('A publicação atual difere da esperada.', 409, 'publication_mismatch')
      return data
    },
  }
}

export const cnaeApi = createCnaeApi(apiClient)
