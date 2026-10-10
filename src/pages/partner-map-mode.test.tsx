import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import type { PartnerMapItem, PartnerMapResponse, PartnerMapResults } from '../api/receita-federal/cnpj/types'
import { Providers } from '../app/providers'
import { PartnersPage } from './partners-page'
import { cnaeApi } from '../api/ibge/cnae/client'
import { cnaeCatalog, cnaeNode, cnaePage } from '../test/cnae-fixtures'

vi.mock('../api/ibge/cnae/client', () => ({ cnaeApi: { catalog: vi.fn(), nodes: vi.fn() } }))

vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { municipalities: vi.fn(), cnaes: vi.fn().mockResolvedValue({results:[],next:null,previous:null}), segments: vi.fn(), partnerMap: vi.fn(), partnerMapResults: vi.fn(), partners: vi.fn(), company: vi.fn(), establishment: vi.fn(), partnerParticipation: vi.fn() } }))
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
function renderPage(url = '/receita-federal/cnpj/socios?modo=mapa&uf=MG&inicio_atividade_de=2025-01-01') {
  return render(<Providers><MemoryRouter initialEntries={[url]}><PartnersPage /><Navigation /></MemoryRouter></Providers>)
}

describe('Fase 5 — mapa de participações por estabelecimento', () => {
  it('aplica seleção CNAE literal aos pares somente após envio e restaura pelo histórico', async () => {
    const user = userEvent.setup()
    vi.mocked(cnaeApi.catalog).mockResolvedValue(cnaeCatalog)
    vi.mocked(cnaeApi.nodes).mockResolvedValue(cnaePage([cnaeNode]))
    renderPage('/receita-federal/cnpj/socios?modo=mapa&inicio_atividade_de=2025-01-01&uf=MG&page=3')
    await screen.findAllByText('MARIA SILVA')
    await user.click(screen.getByText('Demais consultas', { exact: true }))
    await user.click(screen.getByRole('button', { name: 'Selecionar CNAEs' }))
    await user.click(screen.getByRole('button', { name: 'Consultar catálogo oficial CNAE' }))
    await user.click(await screen.findByRole('button', { name: 'Consultar nós CNAE' }))
    await user.click(await screen.findByRole('button', { name: 'Selecionar 0010100' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(cnpjApi.partnerMap).toHaveBeenCalledTimes(1); expect(cnpjApi.partnerMapResults).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('url')).toHaveTextContent('modo=mapa&inicio_atividade_de=2025-01-01&uf=MG&page=3')
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(cnpjApi.partnerMap).toHaveBeenLastCalledWith({ inicio_atividade_de: '2025-01-01', uf: 'MG', cnaes: '0010100', atividade_escopo: 'principal' }, expect.any(AbortSignal)))
    expect(cnpjApi.partnerMapResults).toHaveBeenLastCalledWith({ inicio_atividade_de: '2025-01-01', uf: 'MG', cnaes: '0010100', atividade_escopo: 'principal', page: 1, page_size: 10 }, expect.any(AbortSignal))
    expect(screen.getAllByRole('link', { name: 'Abrir participação do sócio' })[0].getAttribute('href')).toContain('cnaes%3D0010100')
    await user.click(screen.getByRole('button', { name: 'Histórico anterior' }))
    await waitFor(() => expect(document.querySelector('input[name="cnaes"]')).toHaveValue(''))
    expect(screen.getByTestId('url')).toHaveTextContent('modo=mapa&inicio_atividade_de=2025-01-01&uf=MG&page=3')
  })
  it('aplica os dois intervalos do estabelecimento com o mesmo recorte B2B', async () => {
    const user = userEvent.setup()
    renderPage('/receita-federal/cnpj/socios?modo=mapa&uf=MG&cnaes=5611201&atividade_escopo=principal&inicio_atividade_ate=2026-01-31&situacao_evento_de=2026-02-01&page=3')
    const apply = await screen.findByRole('button', { name: /Aplicar filtros/ })
    await user.click(apply)
    await waitFor(() => expect(cnpjApi.partnerMapResults).toHaveBeenLastCalledWith(expect.objectContaining({ cnaes: '5611201', atividade_escopo: 'principal', inicio_atividade_ate: '2026-01-31', situacao_evento_de: '2026-02-01', page: 1 }), expect.any(AbortSignal)))
    expect(cnpjApi.partnerMap).toHaveBeenCalledWith(expect.objectContaining({ cnaes: '5611201', inicio_atividade_ate: '2026-01-31', situacao_evento_de: '2026-02-01' }), expect.any(AbortSignal))
  })
  it('não consulta quando a URL repete parâmetros B2B', async () => {
    renderPage('/receita-federal/cnpj/socios?modo=mapa&cnaes=5611201&cnaes=9313100&atividade_escopo=principal')
    expect(await screen.findByText(/A URL contém parâmetros repetidos/)).toBeInTheDocument()
    expect(cnpjApi.partnerMap).not.toHaveBeenCalled()
    expect(cnpjApi.partnerMapResults).not.toHaveBeenCalled()
  })
  it('normalizes isolated legacy activity explicitly and preserves return context', async () => {
    const user = userEvent.setup()
    renderPage('/receita-federal/cnpj/socios?modo=mapa&uf=MG&cnae=0010100&return_to=%2Fdestino&page=3')
    expect(cnpjApi.partnerMap).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', {name:/Normalizar CNAE/}))
    expect(cnpjApi.partnerMap).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', {name:'Aplicar filtros'}))
    await waitFor(() => expect(cnpjApi.partnerMap).toHaveBeenCalledWith(expect.objectContaining({uf:'MG',cnaes:'0010100',atividade_escopo:'principal'}),expect.any(AbortSignal)))
    expect(screen.getByTestId('url').textContent).toContain('return_to=%2Fdestino')
    expect(screen.getByTestId('url').textContent).not.toContain('&cnae=')
  })
  it('blocks uncertified secondary activity even on a complete URL', async () => {
    renderPage('/receita-federal/cnpj/socios?modo=mapa&uf=MG&cnaes=0010100&atividade_escopo=principal_ou_secundaria')
    await screen.findByText(/Secundarias sem certificacao/)
    expect(cnpjApi.partnerMap).not.toHaveBeenCalled(); expect(cnpjApi.partnerMapResults).not.toHaveBeenCalled()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cnpjApi.municipalities).mockResolvedValue({count:null,next:null,previous:null,page:1,page_size:50,has_next:false,has_previous:false,results:mapData.territories})
    vi.mocked(cnpjApi.segments).mockResolvedValue({catalog_version:'b2b-v1',classification_version:'CNAE-Subclasses 2.3',reviewed_at:'2026-10-05',source:'official',secondary_available:false,segments:[]})
    vi.mocked(cnpjApi.partnerMap).mockImplementation(async filters => ({ ...mapData, filters: { ...filters } as Record<string, string> }))
    vi.mocked(cnpjApi.partnerMapResults).mockImplementation(async ({ page, page_size: _size, ...filters }) => ({ ...listData, page: page ?? 1, filters: { ...filters } as Record<string, string> }))
  })

  it('declara semântica, cobertura, truncamento, duplicatas e links com retorno completo', async () => {
    renderPage('/receita-federal/cnpj/socios?modo=mapa&inicio_atividade_de=2025-01-01&uf=MG&page=2')
    await waitFor(() => expect(screen.getByTestId('points')).toHaveTextContent('2 pontos'))
    expect(screen.queryByText(/A localização pertence exclusivamente/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Informações do mapa' })).toBeInTheDocument()
    expect(screen.getByText(/Exibindo 2 de 11/)).toBeInTheDocument()
    expect(screen.queryByText(/Mapa e lista têm filtros/)).not.toBeInTheDocument()
    expect(screen.getAllByText('MARIA SILVA')).toHaveLength(2)
    expect(screen.getByText(/Sem coordenadas válidas/)).toBeInTheDocument()
    const back = encodeURIComponent('/receita-federal/cnpj/socios?modo=mapa&inicio_atividade_de=2025-01-01&uf=MG&page=2')
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
    await chooseCode(user, '9313100')
    await user.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(document.querySelector('input[name="cnaes"]')).toHaveValue('9313100')
    expect(screen.getByText('Alterações ainda não aplicadas.')).toBeInTheDocument()
    await waitFor(() => expect(cnpjApi.partnerMapResults).toHaveBeenLastCalledWith({ uf: 'MG', inicio_atividade_de: '2025-01-01', page: 2, page_size: 10 }, expect.any(AbortSignal)))
    expect(cnpjApi.partnerMap).toHaveBeenCalledTimes(1)
    expect(cnpjApi.partners).not.toHaveBeenCalled()
    expect(cnpjApi.company).not.toHaveBeenCalled()
    expect(cnpjApi.establishment).not.toHaveBeenCalled()
    expect(cnpjApi.partnerParticipation).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Histórico anterior' }))
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('/receita-federal/cnpj/socios?modo=mapa'))
  })


  it.each(['release', 'filters', 'b2b_context'] as const)('oculta pontos quando %s não é compatível com a lista', async kind => {
    vi.mocked(cnpjApi.partnerMapResults).mockResolvedValue({ ...listData, ...(kind === 'release' ? { release: '2026-09' } : kind === 'filters' ? { filters: { uf: 'SP' } } : { filters: { uf: 'MG', inicio_atividade_de: '2025-01-01' }, b2b_context: { catalog_version: null, segmentos: [], cnaes: ['0010100'], atividade_escopo: 'principal' } }) })
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
  it.each(['', '&uf=MG', '&cnaes=5611201&atividade_escopo=principal', '&uf=XX&cnae=5611201', '&uf=MG&cnae=bad', '&uf=MG&inicio_atividade_de=2025-02-30', '&uf=MG&inicio_atividade_de=2025-06-01&inicio_atividade_ate=2025-01-01', '&uf=MG&municipio=9999&cnae=5611201', '&uf=MG&uf=SP&cnae=5611201', '&uf=MG&cnae=5611201&cnaes=9313100&atividade_escopo=principal'])('bloqueia consultas empresariais incompletas ou inválidas %s', async suffix => {
    renderPage('/receita-federal/cnpj/socios?modo=mapa' + suffix)
    await screen.findByRole('button', { name: 'Aplicar filtros' })
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'UF' })).not.toHaveAttribute('aria-busy', 'true'))
    if (new URLSearchParams(suffix).get('uf') === 'MG') await waitFor(() => expect(screen.getByRole('combobox', { name: 'Munic\u00edpio' })).not.toHaveAttribute('aria-busy', 'true'))
    expect(cnpjApi.partnerMap).not.toHaveBeenCalled(); expect(cnpjApi.partnerMapResults).not.toHaveBeenCalled()
    expect(screen.queryByText('Carregando resultados…')).not.toBeInTheDocument()
  })
  it('prepara município sem consultas e aplica apenas no envio; limpar cancela e oculta', async () => {
    const user = userEvent.setup()
    renderPage('/receita-federal/cnpj/socios?modo=mapa')
    await user.click(await screen.findByRole('button', { name: 'Selecionar MG no mapa' }))
    await user.click(screen.getByRole('combobox', { name: 'Munic\u00edpio' })); await user.click(await screen.findByRole('option', { name: 'Belo Horizonte' }))
    await chooseCode(user, '5611201')
    expect(cnpjApi.partnerMap).not.toHaveBeenCalled(); expect(cnpjApi.partnerMapResults).not.toHaveBeenCalled()
    expect(screen.getByText('Alterações ainda não aplicadas.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(cnpjApi.partnerMap).toHaveBeenCalledWith(expect.objectContaining({ uf: 'MG', municipio: '4123', cnaes: '5611201' }), expect.any(AbortSignal)))
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(screen.getByLabelText('UF')).toHaveValue('Brasil')
    expect(document.querySelector('input[name="cnaes"]')).toHaveValue('')
    expect(screen.queryByText('Carregando resultados…')).not.toBeInTheDocument()
  })

  it.each(['&cnaes=0010100&atividade_escopo=principal', '&inicio_atividade_ate=2025-01-01', '&cnaes=5611201&atividade_escopo=principal&situacao_evento_de=2025-01-01', '&municipio=4123&cnaes=0010100&atividade_escopo=principal'])('restores complete URL and shares map/list cut %s', async suffix => {
    renderPage('/receita-federal/cnpj/socios?modo=mapa&uf=MG' + suffix)
    await waitFor(() => expect(vi.mocked(cnpjApi.partnerMap)).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(vi.mocked(cnpjApi.partnerMapResults)).toHaveBeenCalledTimes(1))
    const [params] = vi.mocked(cnpjApi.partnerMap).mock.calls[0]
    expect(vi.mocked(cnpjApi.partnerMapResults)).toHaveBeenCalledWith({ ...params, page:1, page_size:10 }, expect.any(AbortSignal))
  })
  it('aborts pending business requests on clear and ignores late responses', async () => {
    const user = userEvent.setup()
    const originalMap = vi.mocked(cnpjApi.partnerMap).getMockImplementation()!
    const originalList = vi.mocked(cnpjApi.partnerMapResults).getMockImplementation()!
    let finishMap!: () => Promise<void>, finishList!: () => Promise<void>
    vi.mocked(cnpjApi.partnerMap).mockImplementation((...args) => new Promise(resolve => { finishMap = async () => { resolve(await originalMap(...args)) } }))
    vi.mocked(cnpjApi.partnerMapResults).mockImplementation((...args) => new Promise(resolve => { finishList = async () => { resolve(await originalList(...args)) } }))
    renderPage('/receita-federal/cnpj/socios?modo=mapa&uf=MG&cnaes=0010100&atividade_escopo=principal')
    await waitFor(() => expect(vi.mocked(cnpjApi.partnerMapResults)).toHaveBeenCalledTimes(1))
    const mapSignal = vi.mocked(cnpjApi.partnerMap).mock.calls[0][1]!, listSignal = vi.mocked(cnpjApi.partnerMapResults).mock.calls[0][1]!
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(mapSignal.aborted).toBe(true); expect(listSignal.aborted).toBe(true)
    await finishMap(); await finishList()
    await waitFor(() => expect(screen.queryByText('MARIA SILVA')).not.toBeInTheDocument())
    expect(vi.mocked(cnpjApi.partnerMap)).toHaveBeenCalledTimes(1); expect(vi.mocked(cnpjApi.partnerMapResults)).toHaveBeenCalledTimes(1)
  })

  it('clears unsaved form even when URL already has no applied cut', async () => {
    const user = userEvent.setup()
    renderPage('/receita-federal/cnpj/socios?modo=mapa')
    await chooseCode(user, '5611201')
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(document.querySelector('input[name="cnaes"]')).toHaveValue('')
  })

})

async function chooseCode(user: ReturnType<typeof userEvent.setup>, code: string) {
 await user.click(screen.getByText('Demais consultas', { exact: true }));
 await user.click(screen.getByRole('button', {name:'Selecionar CNAEs'}));
 await user.type(screen.getByLabelText(/exato \(sete/),code);
 await user.click(screen.getByRole('button',{name:'Adicionar c\u00f3digo exato'}));
 await user.click(screen.getByRole('button',{name:'Confirmar'}));
}
