import type { Area, FastPage, WorkDetail, WorkLink, WorkSummary } from '../api/receita-federal/cno/types'

export function fastPage<T>(results: T[] = [], page = 1, hasNext = false): FastPage<T> {
  return { count: null, next: hasNext ? 'https://untrusted.example/api/?page=2' : null, previous: page > 1 ? '/previous' : null, page, page_size: 10, has_next: hasNext, has_previous: page > 1, results }
}
export const work: WorkSummary = {
  id: 41, cno: '000001', nome: 'Obra oficial', nome_empresarial: '', ni_responsavel: '00-X', qualificacao_responsavel: '009',
  codigo_municipio: '0009', municipio: null, uf: 'MG', situacao: '003', data_situacao: '31/01/2020', tipo_logradouro: 'RUA', logradouro: 'A', numero: '001', bairro: 'B', complemento: '', cep: '00000000', release: '2026-09',
}
export const area: Area = { id: 1, cno: '000001', categoria: '01', destinacao: '00', tipo_construcao: null, tipo_area: '', tipo_area_complementar: '02', metragem: '1.234,50' }
export const link: WorkLink = { id: 7, cno: '000001', data_inicio_vinculo: 'texto oficial', data_fim_vinculo: '', data_registro: null, qualificacao_contribuinte: '0009', ni_responsavel: '00-X' }
export const detail: WorkDetail = {
  ...work, codigo_pais: '001', pais: 'BRASIL', data_inicio_obra: '2020', data_inicio_responsabilidade: '', data_registro: null, cno_vinculado: '000002', caixa_postal: null, unidade_medida: 'm² oficial', area_total: '1.234,50', codigo_localizacao: '009',
  associacao: { criterio: 'igualdade_cno_textual', descricao: 'Associação oficial por igualdade textual.' },
  areas: fastPage([area], 1, true), cnaes: fastPage([{ id: 2, cno: '000001', cnae: '0007', data_registro_cnae: '2020/01' }], 1, true), vinculos: fastPage([link], 1, true), obras_vinculadas: fastPage([{ ...work, id: 42, cno: '000002' }], 1, true),
}
