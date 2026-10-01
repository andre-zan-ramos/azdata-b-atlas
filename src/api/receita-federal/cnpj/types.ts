export type CodeDescription = { codigo: string; descricao: string }
export type Municipality = { codigo: string; codigo_ibge?: string | null; descricao: string; uf: string }
export type PageSize = 10 | 25 | 50
export type Page<T> = { count: null; next: string | null; previous: string | null; page: number; page_size: PageSize; has_next: boolean; has_previous: boolean; results: T[] }
export type FastPage<T> = Omit<Page<T>, 'count'> & { count: number | null }
export type CountedPage<T> = { count: number; next: string | null; previous: string | null; results: T[] }
export type Paginated<T> = Page<T> | CountedPage<T>
export type MatchField = 'cnpj' | 'cnpj_basico' | 'razao_social' | 'nome_fantasia'
export type TextMatchMode = 'contendo' | 'inicio' | 'fim' | 'exato'
export type BusinessSearchItem = { id: number; cnpj: string; cnpj_basico: string; razao_social: string; nome_fantasia: string | null; identificador_matriz_filial: CodeDescription; situacao_cadastral: CodeDescription; uf: string; municipio: Municipality | null; cnae_principal: CodeDescription | null; match_fields: MatchField[] }
export type BusinessSearchFilters = { q: string; q_modo?: TextMatchMode; page?: number; page_size?: PageSize; include_total?: boolean; uf?: string; municipio?: string; cnae?: string; situacao_cadastral?: string; matriz_filial?: string; porte?: string; natureza_juridica?: string }
export type LocationFacetItem = { uf: string; municipio: Municipality | null; estabelecimentos_count: number }
export type LocationFacetFilters = Omit<BusinessSearchFilters, 'uf' | 'municipio' | 'include_total' | 'page_size'> & { descricao?: string; page_size?: 25 | 50 | 100 }
export type EstablishmentListItem = { id: number; cnpj: string; cnpj_basico: string; razao_social: string; nome_fantasia: string | null; identificador_matriz_filial: number | string; situacao_cadastral: number | string; uf: string; municipio: Municipality | null; cnae_principal: CodeDescription | null }
export type Simples = { opcao_simples: string | null; data_opcao_simples: string | null; data_exclusao_simples: string | null; opcao_mei: string | null; data_opcao_mei: string | null; data_exclusao_mei: string | null }
export type Company = { cnpj_basico: string; razao_social: string; natureza_juridica?: CodeDescription | null; qualificacao_responsavel_id?: number | string | null; capital_social?: string | null; porte_empresa?: CodeDescription | null; ente_federativo_responsavel?: string | null; simples?: Simples | null; estabelecimentos_count?: number; socios_count?: number }
export type Partner = { identificador_socio: number | string; nome_socio_ou_razao_social: string; cnpj_cpf_socio: string | null; qualificacao_socio: CodeDescription | null; data_entrada_sociedade: string | null; representante_legal_cpf: string | null; representante_legal_nome: string | null; faixa_etaria: number | string | null }
export type PartnerParticipation = Omit<Partner, 'nome_socio_ou_razao_social' | 'cnpj_cpf_socio'> & { id: number; empresa: Pick<Company, 'cnpj_basico' | 'razao_social' | 'natureza_juridica' | 'porte_empresa'> }
export type GroupedPartnerSearchItem = { nome_socio_ou_razao_social: string; cnpj_cpf_socio: string | null; participacoes_count: number; participacoes: PartnerParticipation[] }
export type PartnerFilters = { q: string; q_modo?: TextMatchMode; page?: number; page_size?: PageSize; include_total?: boolean }
export type PartnerMapFilters = Omit<EstablishmentFilters, 'cnpj' | 'nome' | 'nome_tipo' | 'nome_modo' | 'page' | 'page_size' | 'include_total'> & { q?: string; q_modo?: TextMatchMode; limit?: number; release?: string }
export type PartnerMapItem = {
  identity: { release: string; participation_id: number; establishment_id: number; cnpj: string; geo_link_id: number | null }
  establishment: Pick<EstablishmentListItem, 'id' | 'cnpj' | 'cnpj_basico' | 'nome_fantasia' | 'uf' | 'municipio'> & { geolocation: EstablishmentGeolocation }
  company: Pick<Company, 'cnpj_basico' | 'razao_social'>
  partner: Pick<Partner, 'nome_socio_ou_razao_social' | 'cnpj_cpf_socio'> & { missing_document_id: number | null }
  participation: Omit<PartnerParticipation, 'empresa'> & { cnpj_basico: string }
}
export type PartnerMapResponse = Omit<EstablishmentMapResponse, 'identity' | 'points' | 'coverage'> & { identity: { record: 'participation_establishment'; key: string[] }; points: PartnerMapItem[]; coverage: EstablishmentMapResponse['coverage'] & { unit: 'participation_establishment' } }
export type PartnerMapResultsFilters = Omit<PartnerMapFilters, 'limit'> & { page?: number; page_size?: PageSize; include_total?: boolean }
export type PartnerMapResults = Paginated<PartnerMapItem> & { release: string | null; filters: Record<string, string> }
export type PartnerParticipationDetail = { release: string; participation: Partner & PartnerParticipation }
export type GeolocationStatus = 'not_requested' | 'pending' | 'available' | 'unavailable' | 'temporary_error' | 'stale' | 'disabled'
export type GeolocationReason = 'cep_missing' | 'cep_invalid' | 'not_found' | 'no_coordinates' | 'context_mismatch' | 'load_in_progress' | 'producer_unavailable' | 'provider_unavailable' | 'feature_disabled'
export type EstablishmentGeolocation = { status: GeolocationStatus; reason: GeolocationReason | null; precision: 'postal_code_approximation' | null; latitude: number | null; longitude: number | null; source: string | null; observed_at: string | null; stale: boolean }
export type EstablishmentMapPoint = Pick<EstablishmentListItem, 'id' | 'cnpj' | 'cnpj_basico' | 'razao_social' | 'nome_fantasia' | 'uf' | 'municipio'> & { release: string; geolocation: EstablishmentGeolocation }
export type EstablishmentMapFilters = Omit<EstablishmentFilters, 'page' | 'page_size' | 'include_total'> & { limit?: number }
export type EstablishmentMapResponse = { release: string | null; identity: { record: 'establishment'; key: 'cnpj' }; filters: Record<string, string>; territories: Municipality[]; coverage: { results_total: number; points_total: number; without_coordinates_total: number; returned_points: number; limit: number; maximum_limit: number; truncated: boolean; points_match_results: true }; points: EstablishmentMapPoint[] }
export type EstablishmentDetail = EstablishmentListItem & { cnpj_ordem: string; cnpj_dv: string; empresa: Company; data_situacao_cadastral: string | null; motivo_situacao_cadastral: CodeDescription | null; nome_cidade_exterior: string | null; pais: CodeDescription | null; data_inicio_atividade: string | null; cnae_fiscal_principal: CodeDescription | null; cnaes_secundarios: Array<CodeDescription & { ordem: number }>; cnae_fiscal_secundaria_raw: string | null; tipo_logradouro: string | null; logradouro: string | null; numero: string | null; complemento: string | null; bairro: string | null; cep: string | null; ddd1: string | null; telefone1: string | null; ddd2: string | null; telefone2: string | null; ddd_fax: string | null; fax: string | null; correio_eletronico: string | null; situacao_especial: string | null; data_situacao_especial: string | null; socios: Partner[]; geolocation: EstablishmentGeolocation }
export type CompanyDetail = Company & { estabelecimentos: EstablishmentListItem[]; socios: Partner[] }
export type EstablishmentFilters = { cnpj?: string; cnpj_basico?: string; nome?: string; nome_tipo?: 'razao_social' | 'nome_fantasia'; nome_modo?: string; uf?: string; municipio?: string; cnae?: string; situacao_cadastral?: string; matriz_filial?: string; porte?: string; natureza_juridica?: string; page?: number; page_size?: PageSize; include_total?: boolean }
export type CompanyFilters = { cnpj_basico?: string; razao_social?: string; razao_social_modo?: string; page?: number; page_size?: PageSize; include_total?: boolean; detalhado?: boolean }
