import type { AxiosInstance } from 'axios'
import { apiClient } from '../../client'
import type { BusinessSearchFilters, BusinessSearchItem, CodeDescription, Company, CompanyDetail, CompanyFilters, CountedPage, EstablishmentDetail, EstablishmentFilters, EstablishmentListItem, FastPage, LocationFacetFilters, LocationFacetItem, Municipality, PageSize, Paginated } from './types'
const PREFIX = 'api/v1/receita-federal/cnpj/'
type Params = Record<string, string | number | boolean | undefined>
export function serializeParams(params: Params) { const query = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)) }); return query }
export function createCnpjApi(client: AxiosInstance = apiClient) {
  const get = async <T>(path: string, params: Params | undefined, signal?: AbortSignal) => (await client.get<T>(PREFIX + path, { params: params ? serializeParams(params) : undefined, signal })).data
  return {
    search: (params: BusinessSearchFilters, signal?: AbortSignal) => get<FastPage<BusinessSearchItem>>('busca/', params, signal),
    locationFacets: (params: LocationFacetFilters, signal?: AbortSignal) => get<CountedPage<LocationFacetItem>>('busca/facetas/localidades/', params, signal),
    establishments: (params: EstablishmentFilters, signal?: AbortSignal) => get<Paginated<EstablishmentListItem>>('estabelecimentos/', params, signal),
    establishment: (cnpj: string, signal?: AbortSignal) => get<EstablishmentDetail>(`estabelecimentos/${cnpj}/`, undefined, signal),
    companies: (params: CompanyFilters, signal?: AbortSignal) => get<Paginated<Company>>('empresas/', params, signal),
    company: (root: string, signal?: AbortSignal) => get<CompanyDetail>(`empresas/${root}/`, undefined, signal),
    cnaes: (params: { descricao?: string; descricao_modo?: string; page?: number; page_size?: PageSize }, signal?: AbortSignal) => get<Paginated<CodeDescription>>('dominios/cnaes/', params, signal),
    municipalities: (params: { uf?: string; page?: number; page_size?: PageSize }, signal?: AbortSignal) => get<Paginated<Municipality>>('dominios/municipios/', params, signal),
    registrationStatuses: (params: { page?: number; page_size?: PageSize }, signal?: AbortSignal) => get<CountedPage<CodeDescription>>('dominios/situacoes-cadastrais/', params, signal),
    headquartersBranches: (params: { page?: number; page_size?: PageSize }, signal?: AbortSignal) => get<CountedPage<CodeDescription>>('dominios/matriz-filial/', params, signal),
    companySizes: (params: { page?: number; page_size?: PageSize }, signal?: AbortSignal) => get<CountedPage<CodeDescription>>('dominios/portes/', params, signal),
    legalNatures: (params: { descricao?: string; descricao_modo?: string; page?: number; page_size?: PageSize }, signal?: AbortSignal) => get<CountedPage<CodeDescription>>('dominios/naturezas-juridicas/', params, signal),
  }
}
export const cnpjApi = createCnpjApi()
