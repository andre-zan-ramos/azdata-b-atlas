import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import type { PartnerMapItem, PartnerMapResponse, PartnerMapResults } from '../api/receita-federal/cnpj/types'
import { Providers } from '../app/providers'
import { PartnersPage } from './partners-page'

vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { segments: vi.fn(), partnerMap: vi.fn(), partnerMapResults: vi.fn(), partners: vi.fn(), company: vi.fn(), establishment: vi.fn(), partnerParticipation: vi.fn() } }))
vi.mock('../api/ibge/territories', () => ({ listStates: vi.fn().mockResolvedValue([{ id: 31, sigla: 'MG', nome: 'Minas Gerais' }]) }))
vi.mock('../components/partner-territory-map', () => ({ PartnerTerritoryMap: ({ points, onState, onMunicipality }: { points: PartnerMapItem[]; onState: (code: string) => void; onMunicipality: (code: string) => void }) => <div><span data-testid="points">{points.length} pontos</span><button onClick={() => onState('31')}>Selecionar MG no mapa</button><button onClick={() => onMunicipality('3106200')}>Selecionar município no mapa</button></div> }))

export const item: PartnerMapItem = {
  identity: { release: '2026-08', participation_id: 7, establishment_id: 9, cnpj: '00123456000100', geo_link_id: 12 },
  establishment: { id: 9, cnpj: '00123456000100', cnpj_basico: '00123456', nome_fantasia: '', uf: 'MG', municipio: { codigo: '4123', descricao: 'Belo Horizonte', uf: 'MG' }, geolocation: { status: 'available', reason: null, precision: 'postal_code_approximation', latitude: -19, longitude: -43, source: 'brasilapi', observed_at: '2026-08-01', stale: false } },
  company: { cnpj_basico: '00123456', razao_social: 'EMPRESA OFICIAL' },
  partner: { nome_socio_ou_razao_social: 'MARIA SILVA', cnpj_cpf_socio: '***123456**', missing_document_id: null },
  participation: { id: 7, cnpj_basico: '00123456', identificador_socio: 2, qualificacao_socio: { codigo: '49', descricao: 'Sócio' }, data_entrada_sociedade: null, representante_legal_cpf: '', representante_legal_nome: '', faixa_etaria: null },
}
const mapData: PartnerMapResponse = { release: '2026-08', identity: { record: 'participation_establishment', key: ['release', 'participation_id', 'establishment_id', 'cnpj'] }, filters: {}, territories: [{ codigo: '4123', codigo_ibge: '3106200', descricao: 'Belo Horizonte', uf: 'MG' }], coverage: { unit: 'participation_establishment', results_total: 12, points_total: 11, without_coordinates_total: 1, returned_points: 2, limit: 2, maximum_limit: 5000, truncated: true, points_match_results: true }, points: [item, { ...item, identity: { ...item.identity, participation_id: 8 }, participation: { ...item.participation, id: 8 } }] }
const listData: PartnerMapResults = { release: '2026-08', filters: {}, count: null, next: 'next', previous: null, page: 1, page_size: 10, has_next: true, has_previous: false, results: [item, { ...item, identity: { ...item.identity, participation_id: 8 }, participation: { ...item.participation, id: 8 }, establishment: { ...item.establishment, geolocation: { ...item.establishment.geolocation, status: 'not_requested', latitude: null, longitude: null } } }] }

function Navigation() {
  const location = useLocation(), navigate = useNavigate()
  return <><output data-testid="url">{location.pathname + location.search}</output><button onClick={() => navigate(-1)}>Histórico anterior</button></>
}
function renderPage(url = '/receita-federal/cnpj/socios?modo=mapa') {
  return render(<Providers><MemoryRouter initialEntries={[url]}><PartnersPage /><Navigation /></MemoryRouter></Providers>)
}

describe('Fase 5 — mapa de participações por estabelecimento', () => {
  it('aplica os dois intervalos do estabelecimento com o mesmo recorte B2B', async () => {
    const user = userEvent.setup()
    renderPage('/receita-federal/cnpj/socios?modo=mapa&cnaes=5611201&atividade_escopo=principal&inicio_atividade_ate=2026-01-31&situacao_evento_de=2026-02-01&page=3')
    const apply = await screen.findByRole('button', { name: /Aplicar filtros/ })
    await user.click(apply)
    await waitFor(() => expect(cnpjApi.partnerMapResults).toHaveBeenLastCalledWith(expect.objectContaining({ cnaes: '5611201', atividade_escopo: 'principal', inicio_atividade_ate: '2026-01-31', situacao_evento_de: '2026-02-01', page: 1 }), expect.any(AbortSignal)))
    expect(cnpjApi.partnerMap).toHaveBeenCalledWith(expect.objectContaining({ cnaes: '5611201', inicio_atividade_ate: '2026-01-31', situacao_evento_de: '2026-02-01' }), expect.any(AbortSignal))
  })
  it('não consulta quando a URL repete parâmetros B2B', async () => {
    renderPage('/receita-federal/cnpj/socios?modo=mapa&cnaes=5611201&cnaes=9313100&atividade_escopo=principal')
    expect(await screen.findByText(/A URL contém parâmetros B2B repetidos/)).toBeInTheDocument()
    expect(cnpjApi.partnerMap).not.toHaveBeenCalled()
    expect(cnpjApi.partnerMapResults).not.toHaveBeenCalled()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cnpjApi.segments).mockResolvedValue({catalog_version:'b2b-v1',classification_version:'CNAE-Subclasses 2.3',reviewed_at:'2026-10-05',source:'official',secondary_available:false,segments:[]})
    vi.mocked(cnpjApi.partnerMap).mockImplementation(async filters => ({ ...mapData, filters: { ...filters } as Record<string, string> }))
    vi.mocked(cnpjApi.partnerMapResults).mockImplementation(async ({ page, page_size: _size, ...filters }) => ({ ...listData, page: page ?? 1, filters: { ...filters } as Record<string, string> }))
  })

  it('declara semântica, cobertura, truncamento, duplicatas e links com retorno completo', async () => {
    renderPage('/receita-federal/cnpj/socios?modo=mapa&uf=MG&page=2')
    await waitFor(() => expect(screen.getByTestId('points')).toHaveTextContent('2 pontos'))
    expect(screen.getByText(/A localização pertence exclusivamente/)).toBeInTheDocument()
    expect(screen.getByText(/Exibindo 2 de 11/)).toBeInTheDocument()
    expect(screen.getByText(/Mapa e lista têm filtros/)).toBeInTheDocument()
    expect(screen.getAllByText('MARIA SILVA')).toHaveLength(2)
    expect(screen.getByText(/Sem coordenadas válidas/)).toBeInTheDocument()
    const back = encodeURIComponent('/receita-federal/cnpj/socios?modo=mapa&uf=MG&page=2')
    expect(screen.getAllByRole('link', { name: 'Abrir participação do sócio' })[0]).toHaveAttribute('href', `/receita-federal/cnpj/socios/detalhes?participacao=7&release=2026-08&return_to=${back}`)
    expect(screen.getAllByRole('link', { name: 'Abrir estabelecimento' })[0]).toHaveAttribute('href', `/receita-federal/cnpj/estabelecimentos/00123456000100?return_to=${back}`)
    expect(screen.getAllByRole('link', { name: 'Abrir empresa' })[0]).toHaveAttribute('href', `/receita-federal/cnpj/empresas/00123456?return_to=${back}`)
  })

  it('consulta o mapa uma vez, pagina somente a lista e nunca busca detalhes ou junta páginas', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Página 1')
    expect(cnpjApi.partnerMap).toHaveBeenCalledTimes(1)
    expect(cnpjApi.partnerMapResults).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Próxima' }))
    await waitFor(() => expect(cnpjApi.partnerMapResults).toHaveBeenLastCalledWith({ page: 2, page_size: 10 }, expect.any(AbortSignal)))
    expect(cnpjApi.partnerMap).toHaveBeenCalledTimes(1)
    expect(cnpjApi.partners).not.toHaveBeenCalled()
    expect(cnpjApi.company).not.toHaveBeenCalled()
    expect(cnpjApi.establishment).not.toHaveBeenCalled()
    expect(cnpjApi.partnerParticipation).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Histórico anterior' }))
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('/receita-federal/cnpj/socios?modo=mapa'))
  })

  it('aplica imediatamente cliques de UF e ponte municipal oficial, mantendo filtros', async () => {
    const user = userEvent.setup()
    renderPage('/receita-federal/cnpj/socios?modo=mapa&cnpj_basico=00123456&page=3')
    await user.click(await screen.findByRole('button', { name: 'Selecionar MG no mapa' }))
    await waitFor(() => expect(cnpjApi.partnerMap).toHaveBeenLastCalledWith({ uf: 'MG', cnpj_basico: '00123456' }, expect.any(AbortSignal)))
    await user.click(screen.getByRole('button', { name: 'Selecionar município no mapa' }))
    await waitFor(() => expect(cnpjApi.partnerMap).toHaveBeenLastCalledWith({ uf: 'MG', municipio: '4123', cnpj_basico: '00123456' }, expect.any(AbortSignal)))
    expect(screen.getByTestId('url')).toHaveTextContent('page=1')
  })

  it.each(['release', 'filters'] as const)('oculta pontos quando %s não é compatível com a lista', async kind => {
    vi.mocked(cnpjApi.partnerMapResults).mockResolvedValue({ ...listData, ...(kind === 'release' ? { release: '2026-09' } : { filters: { uf: 'SP' } }) })
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('publicações ou filtros incompatíveis')
    expect(await screen.findByTestId('points')).toHaveTextContent('0 pontos')
    expect(screen.getAllByText('MARIA SILVA')).toHaveLength(2)
  })

  it('não repete automaticamente erro cartográfico e mantém a alternativa textual', async () => {
    vi.mocked(cnpjApi.partnerMap).mockRejectedValue(new Error('Mapa indisponível'))
    renderPage()
    await screen.findByText('Mapa indisponível')
    expect(screen.getAllByText('MARIA SILVA')).toHaveLength(2)
    expect(cnpjApi.partnerMap).toHaveBeenCalledTimes(1)
  })

  it('mostra publicação indisponível e resultado vazio sem inventar pontos', async () => {
    vi.mocked(cnpjApi.partnerMap).mockResolvedValue({ ...mapData, release: null, points: [], coverage: { ...mapData.coverage, points_total: 0, results_total: 0, without_coordinates_total: 0, returned_points: 0, truncated: false } })
    vi.mocked(cnpjApi.partnerMapResults).mockResolvedValue({ ...listData, release: null, results: [] })
    renderPage()
    expect(await screen.findByText('Publicação CNPJ indisponível para o mapa.')).toBeInTheDocument()
    expect(await screen.findByTestId('points')).toHaveTextContent('0 pontos')
  })
})
