import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { listStates } from '../api/ibge/territories'
import type { BusinessSearchItem } from '../api/receita-federal/cnpj/types'
import { Providers } from '../app/providers'
import { EstablishmentsPage } from './establishments-page'
import { cnaeApi } from '../api/ibge/cnae/client'
import { cnaeCatalog, cnaeNode, cnaePage } from '../test/cnae-fixtures'

vi.mock('../api/ibge/cnae/client', () => ({ cnaeApi: { catalog: vi.fn(), nodes: vi.fn() } }))

vi.mock('../api/ibge/territories', () => ({ listStates: vi.fn().mockResolvedValue([{ id: 31, sigla: 'MG', nome: 'Minas Gerais' }]) }))
vi.mock('../components/establishment-territory-map', () => ({ EstablishmentTerritoryMap: ({ points, onState, onMunicipality, uf }: { points: unknown[]; onState: (code: string) => void; onMunicipality: (code: string) => void; uf: string }) => <div data-testid="establishment-map" data-points={points.length}><button onClick={() => onState('31')}>Mapa MG</button>{uf ? <button onClick={() => onMunicipality('3106200')}>Mapa Belo Horizonte</button> : null}</div> }))
vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { search:vi.fn(), establishments:vi.fn(), establishmentMapResults:vi.fn(), segments:vi.fn(), establishmentMap:vi.fn(), locationFacets:vi.fn(), municipalities:vi.fn() } }))
const searchMock = vi.mocked(cnpjApi.search)
const establishmentsMock = vi.mocked(cnpjApi.establishmentMapResults)
const mapMock = vi.mocked(cnpjApi.establishmentMap)
const municipalitiesMock = vi.mocked(cnpjApi.municipalities)
const result: BusinessSearchItem = { id:1,cnpj:'00123456000199',cnpj_basico:'00123456',razao_social:'ATLAS LTDA',nome_fantasia:'ATLAS',identificador_matriz_filial:{codigo:'1',descricao:'Matriz'},situacao_cadastral:{codigo:'2',descricao:'Ativa'},uf:'MG',municipio:{codigo:'4123',descricao:'Belo Horizonte',uf:'MG'},cnae_principal:null,match_fields:['razao_social','nome_fantasia'] }
const page = { count:null,next:null,previous:null,page:1,page_size:10 as const,has_next:false,has_previous:false,results:[result] }
const establishmentPage = { ...page, results: [{ ...result, identificador_matriz_filial: 1, situacao_cadastral: 2, data_inicio_atividade: null, data_situacao_cadastral: null }] }
function LocationProbe(){const location=useLocation();return <output data-testid="location">{location.pathname}{location.search}</output>}
function renderPage(entry='/receita-federal/cnpj?q=atlas&page=1'){return render(<Providers><MemoryRouter initialEntries={[entry]}><Routes><Route path="/receita-federal/cnpj" element={<><EstablishmentsPage/><LocationProbe/></>}/><Route path="*" element={<LocationProbe/>}/></Routes></MemoryRouter></Providers>)}

describe('busca empresarial unificada',()=>{
  it('seleção oficial preserva URL até Aplicar, envia apenas códigos ao CNPJ e mantém erro Receita', async () => {
    const user = userEvent.setup()
    vi.mocked(cnaeApi.catalog).mockResolvedValue(cnaeCatalog)
    vi.mocked(cnaeApi.nodes).mockResolvedValue(cnaePage([cnaeNode]))
    renderPage('/receita-federal/cnpj?modo=mapa&inicio_atividade_de=2025-01-01&uf=MG&page=3')
    await screen.findByText('ATLAS')
    await user.click(screen.getByRole('button', { name: 'Consultar catálogo oficial CNAE' }))
    await user.click(await screen.findByRole('button', { name: 'Consultar nós CNAE' }))
    await user.click(await screen.findByRole('button', { name: 'Selecionar 0010100' }))
    expect(mapMock).toHaveBeenCalledTimes(1); expect(establishmentsMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('location')).toHaveTextContent('modo=mapa&inicio_atividade_de=2025-01-01&uf=MG&page=3')
    establishmentsMock.mockRejectedValue(new ApiError('Códigos indisponíveis no domínio publicado: 0010100', 400, undefined, { cnaes: ['0010100 indisponível'] }))
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(mapMock).toHaveBeenLastCalledWith({ inicio_atividade_de: '2025-01-01', uf: 'MG', cnaes: '0010100', atividade_escopo: 'principal' }, expect.any(AbortSignal)))
    expect(establishmentsMock).toHaveBeenLastCalledWith({ inicio_atividade_de: '2025-01-01', uf: 'MG', cnaes: '0010100', atividade_escopo: 'principal', page: 1, page_size: 10 }, expect.any(AbortSignal))
    expect(await screen.findByText('Códigos indisponíveis no domínio publicado: 0010100')).toBeInTheDocument()
    expect(screen.getByLabelText(/CNAEs adicionais/)).toHaveValue('0010100')
    await user.click(screen.getByRole('link', { name: 'Busca' }))
    expect(screen.getByTestId('location').textContent).not.toContain('cnaes=')
    await user.click(screen.getByRole('link', { name: 'Mapa' }))
    expect(screen.getByLabelText(/CNAEs adicionais/)).toHaveValue('0010100')
  })
  it('envia o recorte B2B igual ao mapa e à lista contextual e reinicia a página', async () => {
    const user = userEvent.setup()
    renderPage('/receita-federal/cnpj?modo=mapa&uf=MG&cnaes=5611201&atividade_escopo=principal&inicio_atividade_de=2026-01-01&situacao_evento_ate=2026-02-28&page=3')
    await screen.findByRole('button', { name: 'Aplicar filtros' })
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(establishmentsMock).toHaveBeenLastCalledWith(expect.objectContaining({ cnaes: '5611201', atividade_escopo: 'principal', inicio_atividade_de: '2026-01-01', situacao_evento_ate: '2026-02-28', page: 1 }), expect.any(AbortSignal)))
    expect(mapMock).toHaveBeenCalledWith(expect.objectContaining({ cnaes: '5611201', atividade_escopo: 'principal', inicio_atividade_de: '2026-01-01', situacao_evento_ate: '2026-02-28' }), expect.any(AbortSignal))
    expect(screen.getByTestId('location').textContent).not.toContain('situacao_cadastral=')
  })
  it('não transforma parâmetros B2B repetidos em consulta parcial', async () => {
    renderPage('/receita-federal/cnpj?modo=mapa&cnaes=5611201&cnaes=9313100&atividade_escopo=principal')
    expect(await screen.findByText(/A URL contém parâmetros repetidos/)).toBeInTheDocument()
    expect(mapMock).not.toHaveBeenCalled()
    expect(establishmentsMock).not.toHaveBeenCalled()
  })
  beforeEach(()=>{vi.clearAllMocks();vi.mocked(cnpjApi.segments).mockResolvedValue({catalog_version:'b2b-v1',classification_version:'CNAE-Subclasses 2.3',reviewed_at:'2026-10-05',source:'official',secondary_available:false,segments:[]});vi.mocked(listStates).mockResolvedValue([{id:31,sigla:'MG',nome:'Minas Gerais'}]);searchMock.mockResolvedValue(page);establishmentsMock.mockImplementation(async ({ page: _page, page_size: _size, ...filters }) => ({ ...establishmentPage, release: '2026-08', filters: filters as Record<string, string>, b2b_context: { catalog_version: null, segmentos: [], cnaes: [], atividade_escopo: null } }));mapMock.mockResolvedValue({b2b_context: { catalog_version: null, segmentos: [], cnaes: [], atividade_escopo: null },release:'2026-08',identity:{record:'establishment',key:'cnpj'},filters:{},territories:[{codigo:'4123',codigo_ibge:'3106200',descricao:'Belo Horizonte',uf:'MG'}],coverage:{results_total:1,points_total:0,without_coordinates_total:1,returned_points:0,limit:2000,maximum_limit:5000,truncated:false,points_match_results:true},points:[]});municipalitiesMock.mockResolvedValue({count:null,next:null,previous:null,page:1,page_size:50,has_next:false,has_previous:false,results:[{codigo:'4123',codigo_ibge:'3106200',descricao:'Belo Horizonte',uf:'MG'}]})})
  it('trata URL antiga sem q_modo como contendo',async()=>{renderPage();expect(await screen.findByText('ATLAS LTDA')).toBeInTheDocument();expect(screen.getByRole('combobox',{name:'Modo de correspondência'})).toHaveValue('contendo');expect(searchMock).toHaveBeenCalledTimes(1);expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({q:'atlas',q_modo:'contendo',page:1,page_size:10}),expect.any(AbortSignal))})
  it('leva a linha inteira à empresa e preserva a busca no link',async()=>{renderPage();const link=await screen.findByRole('link',{name:'Ver empresa ATLAS LTDA'});expect(link).toHaveAttribute('href','/receita-federal/cnpj/empresas/00123456?return_to=%2Freceita-federal%2Fcnpj%3Fq%3Datlas%26page%3D1')})
  it('mostra o erro oficial de q junto ao campo',async()=>{searchMock.mockRejectedValue(new ApiError('Revise os campos.',400,undefined,{q:['Informe um CNPJ válido.']}));renderPage('/receita-federal/cnpj?q=123&page=1');expect(await screen.findByText('Informe um CNPJ válido.')).toBeInTheDocument();expect(screen.getByRole('textbox',{name:'Encontre uma empresa'})).toHaveAttribute('aria-invalid','true')})
  it('restaura e muda o modo, reinicia a página e repete a busca',async()=>{const user=userEvent.setup();renderPage('/receita-federal/cnpj?q=atlas&q_modo=inicio&page=3');await screen.findByText('ATLAS LTDA');expect(screen.getByRole('combobox',{name:'Modo de correspondência'})).toHaveValue('inicio');await user.selectOptions(screen.getByRole('combobox',{name:'Modo de correspondência'}),'exato');await waitFor(()=>expect(screen.getByTestId('location')).toHaveTextContent('/receita-federal/cnpj?q=atlas&q_modo=exato&page=1'));await waitFor(()=>expect(searchMock).toHaveBeenLastCalledWith(expect.objectContaining({q:'atlas',q_modo:'exato',page:1}),expect.any(AbortSignal)))})
  it('filtra localidade em duas etapas, por UF e município',async()=>{const user=userEvent.setup();renderPage('/receita-federal/cnpj?q=atlas&q_modo=fim&cnae=6201501&page=3');await screen.findByText('ATLAS LTDA');await user.click(screen.getByRole('button',{name:'Filtrar por localidade'}));expect(screen.getByLabelText('Município')).toBeDisabled();await user.selectOptions(screen.getByLabelText('UF'),'MG');await user.click(await screen.findByRole('button',{name:/Belo Horizonte/}));await waitFor(()=>expect(screen.getByTestId('location')).toHaveTextContent('/receita-federal/cnpj?q=atlas&q_modo=fim&cnae=6201501&page=1&uf=MG&municipio=4123'));expect(municipalitiesMock).toHaveBeenCalledWith({uf:'MG',page:1,page_size:50},expect.any(AbortSignal));expect(searchMock).toHaveBeenLastCalledWith(expect.objectContaining({uf:'MG',municipio:'4123'}),expect.any(AbortSignal))})
  it('normaliza modo inválido sem enviá-lo e preserva filtros',async()=>{renderPage('/receita-federal/cnpj?q=atlas&q_modo=aproximado&cnae=6201501&page=2');await screen.findByText('ATLAS LTDA');await waitFor(()=>expect(screen.getByTestId('location')).toHaveTextContent('/receita-federal/cnpj?q=atlas&q_modo=contendo&cnae=6201501&page=2'));expect(searchMock.mock.calls.every(([params])=>params.q_modo==='contendo')).toBe(true)})
  it.each(['00123456','00123456000199'])('mantém CNPJ %s pesquisável com seletor visível',async q=>{renderPage(`/receita-federal/cnpj?q=${q}&page=1`);await screen.findByText('ATLAS LTDA');expect(screen.getByRole('combobox',{name:'Modo de correspondência'})).toBeVisible();expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({q,q_modo:'contendo'}),expect.any(AbortSignal))})
  it('consulta o universo cartográfico separado da página e preserva a busca ao retornar',async()=>{const user=userEvent.setup();renderPage('/receita-federal/cnpj?modo=mapa&q=atlas&inicio_atividade_de=2025-01-01&uf=MG&page=2');expect(screen.getByRole('heading',{name:'Mapa de Empresas'})).toBeInTheDocument();await waitFor(()=>expect(mapMock).toHaveBeenCalledWith({uf:'MG',inicio_atividade_de:'2025-01-01'},expect.any(AbortSignal)));expect(mapMock.mock.calls[0][0]).not.toHaveProperty('page');expect(establishmentsMock).toHaveBeenCalledWith(expect.objectContaining({uf:'MG',page:2,page_size:10}),expect.any(AbortSignal));expect(searchMock).not.toHaveBeenCalled();await user.click(screen.getByRole('link',{name:'Busca'}));expect(await screen.findByText('ATLAS LTDA')).toBeInTheDocument();expect(screen.getByTestId('location')).toHaveTextContent('modo=busca&q=atlas&uf=MG&page=2')})

  it('declara truncamento e mantém resultados sem coordenadas na lista',async()=>{mapMock.mockResolvedValue({b2b_context: { catalog_version: null, segmentos: [], cnaes: [], atividade_escopo: null },release:'2026-08',identity:{record:'establishment',key:'cnpj'},filters:{uf:'MG'},territories:[{codigo:'4123',codigo_ibge:'3106200',descricao:'Belo Horizonte',uf:'MG'}],coverage:{results_total:3000,points_total:2500,without_coordinates_total:500,returned_points:2000,limit:2000,maximum_limit:5000,truncated:true,points_match_results:true},points:[]});renderPage('/receita-federal/cnpj?modo=mapa&inicio_atividade_de=2025-01-01&uf=MG&page=1');expect(await screen.findByText(/2500 pontos para 3000 estabelecimentos/)).toHaveTextContent('Exibindo 2000 de 2500 pontos');expect(await screen.findByText('ATLAS')).toBeInTheDocument()})
  it('substitui modo inválido por busca e mantém os demais parâmetros',async()=>{renderPage('/receita-federal/cnpj?modo=grade&q=atlas&page=2');expect(await screen.findByText('ATLAS LTDA')).toBeInTheDocument();await waitFor(()=>expect(screen.getByTestId('location')).toHaveTextContent('/receita-federal/cnpj?modo=busca&q=atlas&page=2'))})
  it.each(['', '&uf=MG', '&cnaes=5611201&atividade_escopo=principal', '&uf=XX&cnae=5611201', '&uf=MG&cnae=bad', '&uf=MG&inicio_atividade_de=2025-02-30', '&uf=MG&inicio_atividade_de=2025-06-01&inicio_atividade_ate=2025-01-01', '&uf=MG&municipio=9999&cnae=5611201', '&uf=MG&uf=SP&cnae=5611201', '&uf=MG&cnae=5611201&cnaes=9313100&atividade_escopo=principal'])('bloqueia consultas empresariais incompletas ou inválidas %s', async suffix => {
    renderPage('/receita-federal/cnpj?modo=mapa' + suffix)
    await screen.findByRole('button', { name: 'Aplicar filtros' })
    await screen.findByRole('option', { name: /MG/ })
    if (new URLSearchParams(suffix).get('uf') === 'MG') await screen.findByRole('option', { name: 'Belo Horizonte' })
    expect(mapMock).not.toHaveBeenCalled(); expect(establishmentsMock).not.toHaveBeenCalled()
    expect(screen.queryByText('Carregando resultados…')).not.toBeInTheDocument()
  })
  it('prepara município sem consultas e aplica apenas no envio; limpar cancela e oculta', async () => {
    const user = userEvent.setup()
    renderPage('/receita-federal/cnpj?modo=mapa')
    await user.click(await screen.findByRole('button', { name: 'Mapa MG' }))
    await screen.findByRole('option', { name: 'Belo Horizonte' }); await user.selectOptions(screen.getByLabelText('Município'), '4123')
    await user.type(screen.getByLabelText(/CNAEs adicionais/), '5611201')
    expect(mapMock).not.toHaveBeenCalled(); expect(establishmentsMock).not.toHaveBeenCalled()
    expect(screen.getByText('Alterações ainda não aplicadas.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(mapMock).toHaveBeenCalledWith(expect.objectContaining({ uf: 'MG', municipio: '4123', cnaes: '5611201' }), expect.any(AbortSignal)))
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(screen.getByLabelText('UF')).toHaveValue('')
    expect(screen.getByLabelText(/CNAEs adicionais/)).toHaveValue('')
    expect(screen.queryByText('Carregando resultados…')).not.toBeInTheDocument()
  })

  it.each(['&cnae=0010100', '&inicio_atividade_ate=2025-01-01', '&cnaes=5611201&atividade_escopo=principal&situacao_evento_de=2025-01-01', '&municipio=4123&cnae=0010100'])('restores complete URL and shares map/list cut %s', async suffix => {
    renderPage('/receita-federal/cnpj?modo=mapa&uf=MG' + suffix)
    await waitFor(() => expect(mapMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(establishmentsMock).toHaveBeenCalledTimes(1))
    const [params] = mapMock.mock.calls[0]
    expect(establishmentsMock).toHaveBeenCalledWith({ ...params, page:1, page_size:10 }, expect.any(AbortSignal))
  })
  it('aborts pending business requests on clear and ignores late responses', async () => {
    const user = userEvent.setup()
    const originalMap = mapMock.getMockImplementation()!
    const originalList = establishmentsMock.getMockImplementation()!
    let finishMap!: () => Promise<void>, finishList!: () => Promise<void>
    mapMock.mockImplementation((...args) => new Promise(resolve => { finishMap = async () => { resolve(await originalMap(...args)) } }))
    establishmentsMock.mockImplementation((...args) => new Promise(resolve => { finishList = async () => { resolve(await originalList(...args)) } }))
    renderPage('/receita-federal/cnpj?modo=mapa&uf=MG&cnae=0010100')
    await waitFor(() => expect(establishmentsMock).toHaveBeenCalledTimes(1))
    const mapSignal = mapMock.mock.calls[0][1]!, listSignal = establishmentsMock.mock.calls[0][1]!
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(mapSignal.aborted).toBe(true); expect(listSignal.aborted).toBe(true)
    await finishMap(); await finishList()
    await waitFor(() => expect(screen.queryByText('ATLAS')).not.toBeInTheDocument())
    expect(mapMock).toHaveBeenCalledTimes(1); expect(establishmentsMock).toHaveBeenCalledTimes(1)
  })

  it('clears unsaved form even when URL already has no applied cut', async () => {
    const user = userEvent.setup()
    renderPage('/receita-federal/cnpj?modo=mapa')
    await user.type(screen.getByLabelText(/CNAEs adicionais/), '5611201')
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(screen.getByLabelText(/CNAEs adicionais/)).toHaveValue('')
  })

})
