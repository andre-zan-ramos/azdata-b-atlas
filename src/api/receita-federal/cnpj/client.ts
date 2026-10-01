import type { AxiosInstance } from 'axios'
import { apiClient } from '../../client'
import type { PartnerMapFilters, PartnerMapResponse, PartnerMapResultsFilters, PartnerMapResults, PartnerParticipationDetail } from './types'
import type { BusinessSearchFilters, BusinessSearchItem, CodeDescription, Company, CompanyDetail, CompanyFilters, CountedPage, EstablishmentDetail, EstablishmentFilters, EstablishmentGeolocation, EstablishmentListItem, EstablishmentMapFilters, EstablishmentMapResponse, FastPage, GroupedPartnerSearchItem, LocationFacetFilters, LocationFacetItem, Municipality, PageSize, Paginated, PartnerFilters } from './types'
const PREFIX = 'api/v1/receita-federal/cnpj/'
type Params = Record<string, string | number | boolean | undefined>
export function serializeParams(params: Params) { const query = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)) }); return query }
export function createCnpjApi(client: AxiosInstance = apiClient) {
  const get = async <T>(path: string, params: Params | undefined, signal?: AbortSignal) => (await client.get<T>(PREFIX + path, { params: params ? serializeParams(params) : undefined, signal })).data
  return {
    search: (params: BusinessSearchFilters, signal?: AbortSignal) => get<FastPage<BusinessSearchItem>>('busca/', params, signal),
    locationFacets: (params: LocationFacetFilters, signal?: AbortSignal) => get<CountedPage<LocationFacetItem>>('busca/facetas/localidades/', params, signal),
    establishments: (params: EstablishmentFilters, signal?: AbortSignal) => get<Paginated<EstablishmentListItem>>('estabelecimentos/', params, signal),
    establishmentMap: (params: EstablishmentMapFilters, signal?: AbortSignal) => get<EstablishmentMapResponse>('estabelecimentos/mapa/', params, signal),
    establishment: (cnpj: string, signal?: AbortSignal) => get<EstablishmentDetail>(`estabelecimentos/${cnpj}/`, undefined, signal),
    requestEstablishmentGeolocation: async (cnpj: string, signal?: AbortSignal) => (await client.post<EstablishmentGeolocation>(PREFIX + `estabelecimentos/${cnpj}/geolocation/request/`, undefined, { signal, validateStatus: status => [200, 202, 400, 404, 409, 429, 503].includes(status) })).data,
    companies: (params: CompanyFilters, signal?: AbortSignal) => get<Paginated<Company>>('empresas/', params, signal),
    company: (root: string, signal?: AbortSignal) => get<CompanyDetail>(`empresas/${root}/`, undefined, signal),
    partners: (params: PartnerFilters, signal?: AbortSignal) => get<FastPage<GroupedPartnerSearchItem>>('socios/', { ...params, agrupar: true }, signal),
    partnerMap: (params: PartnerMapFilters, signal?: AbortSignal) => get<PartnerMapResponse>('socios/mapa/', params, signal),
    partnerMapResults: (params: PartnerMapResultsFilters, signal?: AbortSignal) => get<PartnerMapResults>('socios/mapa/resultados/', params, signal),
    partnerParticipation: (id: number, release: string, signal?: AbortSignal) => get<PartnerParticipationDetail>(`socios/participacoes/${id}/`, { release }, signal),
    cnaes: (params: { descricao?: string; descricao_modo?: string; page?: number; page_size?: PageSize }, signal?: AbortSignal) => get<Paginated<CodeDescription>>('dominios/cnaes/', params, signal),
    municipalities: (params: { uf?: string; page?: number; page_size?: PageSize }, signal?: AbortSignal) => get<Paginated<Municipality>>('dominios/municipios/', params, signal),
    registrationStatuses: (params: { page?: number; page_size?: PageSize }, signal?: AbortSignal) => get<CountedPage<CodeDescription>>('dominios/situacoes-cadastrais/', params, signal),
    headquartersBranches: (params: { page?: number; page_size?: PageSize }, signal?: AbortSignal) => get<CountedPage<CodeDescription>>('dominios/matriz-filial/', params, signal),
    companySizes: (params: { page?: number; page_size?: PageSize }, signal?: AbortSignal) => get<CountedPage<CodeDescription>>('dominios/portes/', params, signal),
    legalNatures: (params: { descricao?: string; descricao_modo?: string; page?: number; page_size?: PageSize }, signal?: AbortSignal) => get<CountedPage<CodeDescription>>('dominios/naturezas-juridicas/', params, signal),
  }
}
export const cnpjApi = createCnpjApi()
