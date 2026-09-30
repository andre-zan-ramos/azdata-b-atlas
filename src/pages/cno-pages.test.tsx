import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cnoApi } from '../api/receita-federal/cno/client'
import { listStates } from '../api/ibge/territories'
import { ApiError } from '../api/errors'
import type { Page, WorkMapPoint, WorkSummary } from '../api/receita-federal/cno/types'
import { Providers } from '../app/providers'
import { area, detail, fastPage, link, work } from '../test/cno-fixtures'
import { CnoSearchPage } from './cno-search-page'
import { CnoDetailPage } from './cno-detail-page'

vi.mock('../api/ibge/territories', () => ({
  listStates: vi.fn().mockResolvedValue([{ id: 31, sigla: 'MG', nome: 'Minas Gerais' }]),
  getMesh: vi.fn().mockResolvedValue({ type: 'FeatureCollection', features: [] }),
}))
vi.mock('../components/cno-territory-map', () => ({ CnoTerritoryMap: ({ uf, onState, onMunicipality, selectedMunicipalityIbge, works }: { uf: string; onState: (code: string) => void; onMunicipality: (code: string) => void; selectedMunicipalityIbge: string | null; works: WorkMapPoint[] }) => <div data-testid="territory-map" data-selected={selectedMunicipalityIbge ?? ''} data-points={works.length}><button type="button" onClick={() => onState('31')}>Mapa MG</button>{uf && <button type="button" onClick={() => onMunicipality('3106200')}>Mapa Belo Horizonte</button>}</div> }))

vi.mock('../api/receita-federal/cno/client', async importOriginal => ({ ...await importOriginal<typeof import('../api/receita-federal/cno/client')>(), cnoApi: { obras: vi.fn(), mapa: vi.fn(), obra: vi.fn(), areas: vi.fn(), cnaes: vi.fn(), vinculos: vi.fn(), municipios: vi.fn(), requestWorkGeolocations: vi.fn() } }))
const api = vi.mocked(cnoApi)
function Location() {
  const location = useLocation(), navigate = useNavigate()
  return <><output data-testid="location">{location.pathname}{location.search}</output><button onClick={() => navigate(-1)}>Histórico voltar</button><button onClick={() => navigate(1)}>Histórico avançar</button></>
}
function renderPage(path = '/receita-federal/cno') {
  const entry = path === '/receita-federal/cno' ? `${path}?modo=mapa` : path.startsWith('/receita-federal/cno?') && !path.includes('modo=') ? path.replace('?', '?modo=mapa&') : path
  return render(<Providers><MemoryRouter initialEntries={[entry]}><Location /><Routes>
    <Route path="/receita-federal/cno" element={<CnoSearchPage key="obras" />} />
    <Route path="/receita-federal/cno/obras/:id" element={<CnoDetailPage />} />
  </Routes></MemoryRouter></Providers>)
}
async function openCollection(title: string) {
  const panel = screen.getByText(title, { selector: 'summary' }).closest('details')!
  panel.open = true
  fireEvent(panel, new Event('toggle'))
  await waitFor(() => expect(within(panel).getByRole('combobox')).toBeInTheDocument())
  return panel
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listStates).mockResolvedValue([{ id: 31, sigla: 'MG', nome: 'Minas Gerais' }])
  api.municipios.mockResolvedValue(fastPage([{ nome: 'Belo Horizonte', uf: 'MG', codigo_tom: '4123', codigo_ibge: '3106200' }]))
  api.obras.mockResolvedValue(fastPage([work, { ...work, id: 43 }], 1, true))
  api.mapa.mockResolvedValue({ release: '2026-09', source_file_id: 17, filters: {}, coverage: { results_total: 2, points_total: 0, without_coordinates_total: 2, returned_points: 0, limit: 2000, maximum_limit: 5000, truncated: false, points_match_results: true }, points: [] })
  api.obra.mockResolvedValue(detail)
  api.areas.mockResolvedValue(fastPage([{ ...area, id: 11 }], 2))
  api.cnaes.mockResolvedValue(fastPage([], 2))
  api.vinculos.mockResolvedValue(fastPage([link]))
  api.requestWorkGeolocations.mockResolvedValue({ results: [] })
})

describe('pesquisas CNO', () => {
  it('seleciona UF e município por nome e envia os códigos oficiais', async () => {
    const user = userEvent.setup(); renderPage()
    await screen.findByRole('option', { name: 'MG · Minas Gerais' })
    await user.selectOptions(screen.getByRole('combobox', { name: 'UF' }), 'MG')
    const municipality = await screen.findByRole('combobox', { name: 'Município' })
    await waitFor(() => expect(municipality).toBeEnabled())
    await user.type(municipality, 'belo')
    await user.click(screen.getByRole('option', { name: 'Belo Horizonte' }))
    await user.click(screen.getByRole('button', { name: 'Pesquisar' }))
    await waitFor(() => expect(api.obras).toHaveBeenCalledWith({ uf: 'MG', codigo_municipio: '4123', page: 1, page_size: 10 }, expect.any(AbortSignal)))
  })
  it('clique no mapa aplica UF e município à pesquisa', async () => {
    const user = userEvent.setup(); renderPage()
    await screen.findByRole('option', { name: 'MG · Minas Gerais' })
    await user.click(screen.getByRole('button', { name: 'Mapa MG' }))
    await waitFor(() => expect(api.obras).toHaveBeenCalledWith({ uf: 'MG', page: 1, page_size: 10 }, expect.any(AbortSignal)))
    await waitFor(() => expect(api.mapa).toHaveBeenCalledWith({ uf: 'MG' }, expect.any(AbortSignal)))
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Município' })).toBeEnabled())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mapa Belo Horizonte' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Mapa Belo Horizonte' }))
    await waitFor(() => expect(api.obras).toHaveBeenLastCalledWith({ uf: 'MG', codigo_municipio: '4123', page: 1, page_size: 10 }, expect.any(AbortSignal)))
    await waitFor(() => expect(api.mapa).toHaveBeenLastCalledWith({ uf: 'MG', codigo_municipio: '4123' }, expect.any(AbortSignal)))
    await waitFor(() => expect(screen.getByTestId('territory-map')).toHaveAttribute('data-selected', '3106200'))
    expect(screen.getByRole('heading', { name: 'Belo Horizonte' })).toBeInTheDocument()
  })
  it('ativa uma única solicitação em lote quando a API publica not_requested e refaz a consulta uma vez', async () => {
    const notRequested = { status: 'not_requested', reason: null, precision: null, latitude: null, longitude: null, source: null, observed_at: null, stale: false } as const
    api.obras.mockResolvedValue(fastPage([{ ...work, geolocation: notRequested }]))
    renderPage('/receita-federal/cno?uf=MG&codigo_municipio=4123&page=1&page_size=10')
    await waitFor(() => expect(api.requestWorkGeolocations).toHaveBeenCalledExactlyOnceWith([41]))
    await waitFor(() => expect(api.obras).toHaveBeenCalledTimes(2))
  })
  it('entrega ao mapa os pontos disponíveis sem solicitar estados resolvidos', async () => {
    const available = { status: 'available', reason: null, precision: 'postal_code_approximation', latitude: -19.9, longitude: -43.9, source: 'provider', observed_at: '2026-09-28T12:00:00Z', stale: false } as const
    api.obras.mockResolvedValue(fastPage([{ ...work, geolocation: available }]))
    api.mapa.mockResolvedValue({ release: '2026-09', source_file_id: 17, filters: { uf: 'MG', codigo_municipio: '4123' }, coverage: { results_total: 1, points_total: 1, without_coordinates_total: 0, returned_points: 1, limit: 2000, maximum_limit: 5000, truncated: false, points_match_results: true }, points: [{ id: work.id, cno: work.cno, nome: work.nome, nome_empresarial: work.nome_empresarial, municipio: work.municipio, uf: work.uf, release: work.release, source_file_id: 17, geolocation: available }] })
    renderPage('/receita-federal/cno?uf=MG&codigo_municipio=4123&page=1&page_size=10')
    await waitFor(() => expect(screen.getByTestId('territory-map')).toHaveAttribute('data-points', '1'))
    expect(api.requestWorkGeolocations).not.toHaveBeenCalled()
    expect(api.mapa).toHaveBeenCalledWith({ uf: 'MG', codigo_municipio: '4123' }, expect.any(AbortSignal))
    expect(screen.getByText(/1 pontos para 1 ocorrências/)).toHaveTextContent('Cobertura cartográfica completa')
  })
  it('declara truncamento e obras sem coordenadas sem limitar o mapa à página textual', async () => {
    api.mapa.mockResolvedValue({ release: '2026-09', source_file_id: 17, filters: { uf: 'MG' }, coverage: { results_total: 3000, points_total: 2500, without_coordinates_total: 500, returned_points: 2000, limit: 2000, maximum_limit: 5000, truncated: true, points_match_results: true }, points: [] })
    renderPage('/receita-federal/cno?uf=MG&page=2&page_size=10')
    expect(await screen.findByText(/2500 pontos para 3000 ocorrências/)).toHaveTextContent('Exibindo 2000 de 2500 pontos')
    expect(api.mapa).toHaveBeenCalledWith({ uf: 'MG' }, expect.any(AbortSignal))
    expect(api.mapa.mock.calls[0][0]).not.toHaveProperty('page')
  })
  it('carrega o domínio municipal CNO por UF sem solicitar contagem', async () => {
    const user = userEvent.setup(); renderPage()
    await screen.findByRole('option', { name: 'MG · Minas Gerais' })
    await user.selectOptions(screen.getByRole('combobox', { name: 'UF' }), 'MG')
    await waitFor(() => expect(api.municipios).toHaveBeenCalledWith({ uf: 'MG', page: 1, page_size: 50 }, expect.any(AbortSignal)))
    expect(api.municipios.mock.calls[0][0]).not.toHaveProperty('include_total')
  })
  it('não consulta na entrada nem por tecla; preserva texto e ocorrências repetidas', async () => {
    const user = userEvent.setup(); renderPage()
    expect(api.obras).not.toHaveBeenCalled()
    await user.type(screen.getByRole('textbox', { name: 'CNO' }), '00.001')
    await user.type(screen.getByRole('textbox', { name: 'NI do responsável' }), ' 00-X ')
    expect(api.obras).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Pesquisar' }))
    expect(await screen.findAllByRole('link', { name: 'CNO 000001' })).toHaveLength(2)
    expect(api.obras).toHaveBeenCalledWith({ cno: '00.001', ni_responsavel: ' 00-X ', page: 1, page_size: 10 }, expect.any(AbortSignal))
    expect(screen.getByText('ID técnico: 41')).toBeInTheDocument(); expect(screen.getByText('ID técnico: 43')).toBeInTheDocument()
    expect(screen.getByText('Página 1')).toBeInTheDocument()
    expect(screen.queryByText(/Página 1 de/)).not.toBeInTheDocument()
    expect(api.obra).not.toHaveBeenCalled()
  })
  it('lista somente após ação explícita, sem contagem automática', async () => {
    renderPage(); await userEvent.click(screen.getByRole('button', { name: 'Listar obras' }))
    await screen.findAllByText('ID técnico: 41')
    expect(api.obras).toHaveBeenCalledExactlyOnceWith({ page: 1, page_size: 10 }, expect.any(AbortSignal))
    expect(screen.getByTestId('location')).toHaveTextContent('listar=true')
  })
  it('aplica limites inclusivos de início da obra como datas canônicas', async () => {
    const user = userEvent.setup(); renderPage()
    await user.type(screen.getByLabelText('Início da obra — de'), '2024-02-29')
    await user.type(screen.getByLabelText('Início da obra — até'), '2024-03-01')
    await user.click(screen.getByRole('button', { name: 'Pesquisar' }))
    await waitFor(() => expect(api.obras).toHaveBeenCalledWith({ data_inicio_obra_de: '2024-02-29', data_inicio_obra_ate: '2024-03-01', page: 1, page_size: 10 }, expect.any(AbortSignal)))
    expect(screen.getAllByText('2020-01-02').length).toBeGreaterThan(0)
  })
  it('reseta página ao aplicar filtros/tamanho e restaura histórico', async () => {
    const user = userEvent.setup(); renderPage('/receita-federal/cno?cno=001&page=4&page_size=25')
    await screen.findByText('ID técnico: 41')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Resultados por página' }), '50')
    await waitFor(() => expect(api.obras).toHaveBeenLastCalledWith({ cno: '001', page: 1, page_size: 50 }, expect.any(AbortSignal)))
    await user.clear(screen.getByRole('textbox', { name: 'CNO' })); await user.type(screen.getByRole('textbox', { name: 'CNO' }), '002{Enter}')
    await waitFor(() => expect(api.obras).toHaveBeenLastCalledWith({ cno: '002', page: 1, page_size: 50 }, expect.any(AbortSignal)))
    await user.click(screen.getByRole('button', { name: 'Histórico voltar' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'CNO' })).toHaveValue('001'))
    await user.click(screen.getByRole('button', { name: 'Histórico avançar' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'CNO' })).toHaveValue('002'))
  })
  it('abre detalhe por PK e retorna à URL da pesquisa', async () => {
    renderPage('/receita-federal/cno?cno=001&page=3')
    await userEvent.click((await screen.findAllByRole('link', { name: 'CNO 000001' }))[0])
    await screen.findByRole('heading', { name: 'CNO 000001' })
    expect(api.obra).toHaveBeenCalledWith('41', expect.any(AbortSignal))
    await userEvent.click(screen.getByRole('link', { name: 'Voltar à consulta anterior' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/receita-federal/cno?modo=mapa&cno=001&page=3')
  })
  it('busca CNO ou NI literalmente sem carregar dependências cartográficas', async () => {
    const user = userEvent.setup()
    renderPage('/receita-federal/cno?modo=busca')
    await user.type(screen.getByRole('textbox', { name: 'Encontre uma obra' }), '000001')
    expect(api.obras).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(api.obras).toHaveBeenCalledWith({ q: '000001', page: 1, page_size: 10 }, expect.any(AbortSignal)))
    expect(listStates).not.toHaveBeenCalled(); expect(api.municipios).not.toHaveBeenCalled(); expect(api.mapa).not.toHaveBeenCalled(); expect(api.requestWorkGeolocations).not.toHaveBeenCalled()
  })
  it('exibe os campos de correspondência informados pela API sem reclassificar no cliente', async () => {
    api.obras.mockResolvedValue(fastPage([{ ...work, campos_correspondencia: ['cno', 'ni_responsavel'] }]))
    renderPage('/receita-federal/cno?modo=busca&q=000001')
    expect(await screen.findByText('CNO e NI do responsável')).toBeInTheDocument()
  })
  it('mantém modos independentes e remove a consulta compacta ao abrir o mapa', async () => {
    renderPage('/receita-federal/cno?modo=busca&q=000001&page=3')
    await screen.findByText('ID técnico: 41')
    await userEvent.click(screen.getByRole('link', { name: 'Mapa' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/receita-federal/cno?modo=mapa'))
    expect(screen.getByTestId('location')).not.toHaveTextContent('q=')
  })
  it('preserva URL completa no return_to, pagina por flags e restaura histórico', async () => {
    const user = userEvent.setup()
    renderPage('/receita-federal/cno?modo=busca&q=000001&page=2&page_size=25')
    await screen.findByText('ID técnico: 41')
    expect(api.obras).toHaveBeenCalledWith({ q: '000001', page: 2, page_size: 25 }, expect.any(AbortSignal))
    await user.click((await screen.findAllByRole('link', { name: 'CNO 000001' }))[0])
    expect(screen.getByTestId('location')).toHaveTextContent('return_to=%2Freceita-federal%2Fcno%3Fmodo%3Dbusca%26q%3D000001%26page%3D2%26page_size%3D25')
    await user.click(screen.getByRole('link', { name: 'Voltar à consulta anterior' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/receita-federal/cno?modo=busca&q=000001&page=2&page_size=25')
  })
  it('associa erro oficial a q e reinicia a página ao trocar a consulta', async () => {
    api.obras.mockRejectedValueOnce(new ApiError('Revise.', 400, undefined, { q: ['Identificador rejeitado.'] })).mockResolvedValue(fastPage())
    const user = userEvent.setup()
    renderPage('/receita-federal/cno?modo=busca&q=000001&page=4')
    const input = screen.getByRole('textbox', { name: 'Encontre uma obra' })
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByText('Identificador rejeitado.')).toBeInTheDocument()
    await user.clear(input); await user.type(input, '000002{Enter}')
    await waitFor(() => expect(api.obras).toHaveBeenLastCalledWith({ q: '000002', page: 1, page_size: 10 }, expect.any(AbortSignal)))
  })
  it('associa 400 ao campo e bloqueia parâmetros inválidos de URL', async () => {
    api.obras.mockRejectedValue(new ApiError('Revise.', 400, undefined, { cno: ['Valor rejeitado.'] }))
    const view = renderPage('/receita-federal/cno?cno=001')
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'CNO' })).toHaveAttribute('aria-invalid', 'true'))
    view.unmount(); api.obras.mockClear(); renderPage('/receita-federal/cno?cno=001&page_size=20')
    expect(screen.getByRole('combobox', { name: 'Resultados por página' })).toHaveAttribute('aria-invalid', 'true'); expect(api.obras).not.toHaveBeenCalled()
  })
  it('mostra erro 400 no campo de data indicado pela API', async () => {
    api.obras.mockRejectedValue(new ApiError('Revise.', 400, undefined, { data_inicio_obra_ate: ['Deve ser maior ou igual à data inicial.'] }))
    renderPage('/receita-federal/cno?data_inicio_obra_de=2024-03-02&data_inicio_obra_ate=2024-03-01')
    const field = await screen.findByLabelText('Início da obra — até')
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getAllByText('Deve ser maior ou igual à data inicial.')).toHaveLength(2)
  })
  it.each(['timeout', 'network_error'])('falha %s só repete manualmente', async code => {
    api.obras.mockRejectedValueOnce(new ApiError('Falha de conexão.', undefined, code)).mockResolvedValue(fastPage())
    renderPage('/receita-federal/cno?cno=001')
    await screen.findByRole('alert'); expect(api.obras).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' })); await screen.findByText('Nenhum resultado')
    expect(api.obras).toHaveBeenCalledTimes(2)
  })
  it('cancela a consulta anterior e ignora sua resposta atrasada', async () => {
    let resolveOld!: (value: Page<WorkSummary>) => void
    api.obras.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve })).mockResolvedValue(fastPage([{ ...work, nome: 'Resposta atual' }]))
    renderPage('/receita-federal/cno?cno=001')
    await waitFor(() => expect(api.obras).toHaveBeenCalledTimes(1))
    const oldSignal = api.obras.mock.calls[0][1]!
    await userEvent.clear(screen.getByRole('textbox', { name: 'CNO' })); await userEvent.type(screen.getByRole('textbox', { name: 'CNO' }), '002{Enter}')
    await screen.findByText(/Resposta atual/)
    expect(oldSignal.aborted).toBe(true)
    await act(async () => resolveOld(fastPage([{ ...work, nome: 'Resposta obsoleta' }])))
    expect(screen.queryByText(/Resposta obsoleta/)).not.toBeInTheDocument()
  })
})

describe('detalhe CNO', () => {
  it('reutiliza as quatro páginas embutidas e preserva os campos oficiais', async () => {
    renderPage('/receita-federal/cno/obras/41?return_to=%2Freceita-federal%2Fcno%3Fcno%3D001')
    await screen.findByRole('heading', { name: 'CNO 000001' })
    expect(screen.getAllByText('Vazio').length).toBeGreaterThan(0); expect(screen.getAllByText('Não informado').length).toBeGreaterThan(0)
    for (const title of ['Áreas', 'CNAEs', 'Vínculos', 'Obras vinculadas']) await openCollection(title)
    expect(screen.getAllByText('1.234,50')).toHaveLength(2)
    expect(api.areas).not.toHaveBeenCalled(); expect(api.cnaes).not.toHaveBeenCalled(); expect(api.vinculos).not.toHaveBeenCalled(); expect(api.obras).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'CNO 000002' }).getAttribute('href')).toContain('/obras/42?return_to=')
  })
  it('pagina coleções independentemente e reconstrói filtro de obras vinculadas', async () => {
    renderPage('/receita-federal/cno/obras/41'); await screen.findByRole('heading', { name: 'CNO 000001' })
    const areas = await openCollection('Áreas'), cnaes = await openCollection('CNAEs')
    await userEvent.click(within(areas).getByRole('button', { name: 'Próxima' }))
    await waitFor(() => expect(api.areas).toHaveBeenCalledWith({ cno: '000001', page: 2, page_size: 10 }, expect.any(AbortSignal)))
    expect(within(cnaes).getByText('Página 1')).toBeInTheDocument(); expect(api.cnaes).not.toHaveBeenCalled()
    await userEvent.selectOptions(within(areas).getByRole('combobox'), '25')
    await waitFor(() => expect(api.areas).toHaveBeenLastCalledWith({ cno: '000001', page: 1, page_size: 25 }, expect.any(AbortSignal)))
    const linked = await openCollection('Obras vinculadas'); await userEvent.click(within(linked).getByRole('button', { name: 'Próxima' }))
    await waitFor(() => expect(api.obras).toHaveBeenCalledWith({ cno: '000002', page: 2, page_size: 10 }, expect.any(AbortSignal)))
    expect(api.obra).toHaveBeenCalledTimes(1)
  })
  it('não consulta filhos ao abrir detalhe com página de coleção na URL até expandir', async () => {
    renderPage('/receita-federal/cno/obras/41?areas_page=2'); await screen.findByRole('heading', { name: 'CNO 000001' })
    expect(api.areas).not.toHaveBeenCalled(); await openCollection('Áreas')
    await waitFor(() => expect(api.areas).toHaveBeenCalledTimes(1))
  })
  it('CNO vazio respeita todas as coleções vazias sem consultas amplas', async () => {
    api.obra.mockResolvedValue({ ...detail, cno: '', areas: fastPage(), cnaes: fastPage(), vinculos: fastPage(), obras_vinculadas: fastPage() })
    renderPage('/receita-federal/cno/obras/41?areas_page=2'); await screen.findByRole('heading', { name: 'CNO Vazio' })
    for (const title of ['Áreas', 'CNAEs', 'Vínculos', 'Obras vinculadas']) await openCollection(title)
    expect(screen.getAllByText('Nenhum resultado')).toHaveLength(4)
    expect(api.areas).not.toHaveBeenCalled(); expect(api.cnaes).not.toHaveBeenCalled(); expect(api.vinculos).not.toHaveBeenCalled(); expect(api.obras).not.toHaveBeenCalled()
  })
  it('404 permite retornar sem inventar diagnóstico', async () => {
    api.obra.mockRejectedValue(new ApiError('Não encontrado.', 404)); renderPage('/receita-federal/cno/obras/41')
    await screen.findByText('Ocorrência não disponível'); expect(screen.getByRole('link', { name: 'Voltar à consulta anterior' })).toHaveAttribute('href', '/receita-federal/cno')
    expect(api.obra).toHaveBeenCalledTimes(1)
  })
})
