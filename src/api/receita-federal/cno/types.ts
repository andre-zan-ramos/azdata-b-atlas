export type PageSize = 10 | 25 | 50
export interface CountedPage<T> { count: number; next: string | null; previous: string | null; results: T[] }
export interface FastPage<T> extends Omit<CountedPage<T>, 'count'> { count: null; page: number; page_size: PageSize; has_next: boolean; has_previous: boolean }
export type Page<T> = CountedPage<T> | FastPage<T>
export interface PaginationParams { page?: number; page_size?: PageSize; include_total?: boolean }
export interface WorkFilters extends PaginationParams { cno?: string; ni_responsavel?: string; uf?: string; codigo_municipio?: string; situacao?: string; cnae?: string; cno_vinculado?: string; data_inicio_obra_de?: string; data_inicio_obra_ate?: string }
export interface LinkFilters extends PaginationParams { cno?: string; ni_responsavel?: string }
export interface MunicipalityFilters extends PaginationParams { uf?: string; nome?: string }
export interface CnoMunicipality { nome: string; uf: string; codigo_tom: string; codigo_ibge: string | null }
export interface WorkSummary {
  id: number; cno: string | null; nome: string | null; nome_empresarial: string | null;
  ni_responsavel: string | null; qualificacao_responsavel: string | null;
  codigo_municipio: string | null; municipio: string | null; uf: string | null;
  situacao: string | null; data_situacao: string | null; data_inicio_obra: string | null; tipo_logradouro: string | null;
  logradouro: string | null; numero: string | null; bairro: string | null;
  complemento: string | null; cep: string | null; release: string;
}
export interface Area { id: number; cno: string | null; categoria: string | null; destinacao: string | null; tipo_construcao: string | null; tipo_area: string | null; tipo_area_complementar: string | null; metragem: string | null }
export interface Cnae { id: number; cno: string | null; cnae: string | null; data_registro_cnae: string | null }
export interface WorkLink { id: number; cno: string | null; data_inicio_vinculo: string | null; data_fim_vinculo: string | null; data_registro: string | null; qualificacao_contribuinte: string | null; ni_responsavel: string | null }
export interface WorkDetail extends WorkSummary {
  codigo_pais: string | null; pais: string | null;
  data_inicio_responsabilidade: string | null; data_registro: string | null; cno_vinculado: string | null;
  caixa_postal: string | null; unidade_medida: string | null; area_total: string | null; codigo_localizacao: string | null;
  associacao: { criterio: 'igualdade_cno_textual'; descricao: string };
  areas: FastPage<Area>; cnaes: FastPage<Cnae>; vinculos: FastPage<WorkLink>; obras_vinculadas: FastPage<WorkSummary>;
}
