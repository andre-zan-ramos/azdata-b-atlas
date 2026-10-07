import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { cnaeApi } from '../api/ibge/cnae/client'
import type { CnaePage, CnaeNode } from '../api/ibge/cnae/types'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { createQueryClient } from '../app/providers'
import { cnaeCatalog, cnaeCorrespondence, cnaeDetail, cnaeNode, cnaePage, cnaeParent, cnaeRelationship, publication } from '../test/cnae-fixtures'
import { CnaeCatalogPicker } from './cnae-catalog-picker'
import { CnpjB2BFilters, applyB2BForm } from './cnpj-b2b-filters'

vi.mock('../api/ibge/cnae/client', () => ({ cnaeApi: { catalog: vi.fn(), nodes: vi.fn(), node: vi.fn(), relationships: vi.fn(), correspondences: vi.fn(), follow: vi.fn() } }))
vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { cnaes: vi.fn().mockResolvedValue({results:[],next:null,previous:null}), segments: vi.fn() } }))
const api = vi.mocked(cnaeApi)
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(cnpjApi.cnaes).mockResolvedValue({ count: 0, results: [], next: null, previous: null })
  api.catalog.mockResolvedValue(cnaeCatalog); api.nodes.mockResolvedValue(cnaePage([cnaeNode])); api.node.mockResolvedValue(cnaeDetail)
  api.follow.mockResolvedValue(cnaePage([])); api.correspondences.mockResolvedValue(cnaePage([]))
  vi.mocked(cnpjApi.segments).mockResolvedValue({ catalog_version: 'b2b-v1', classification_version: 'CNAE-Subclasses 2.3', reviewed_at: '2026-10-05', source: 'official', secondary_available: false, segments: [] })
})
function Harness() {
  const [codes, setCodes] = useState('0099999,0099999')
  return <><output data-testid="codes">{codes}</output><CnaeCatalogPicker codes={codes} onCodes={setCodes} /></>
}
function renderPicker() {
  const client = createQueryClient()
  const view = render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>)
  return { client, ...view }
}
async function openAndSearch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Consultar catálogo oficial CNAE' }))
  await user.click(await screen.findByRole('button', { name: 'Consultar nós CNAE' }))
  await screen.findByRole('button', { name: 'Selecionar 0010100' })
}

describe('consulta assistida CNAE', () => {
  it('consulta metadados e uma página sob demanda, sem cascata, e seleciona literalmente', async () => {
    const user = userEvent.setup(); renderPicker()
    expect(api.catalog).not.toHaveBeenCalled(); expect(api.nodes).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Consultar catálogo oficial CNAE' }))
    await screen.findByText(/Hierarquia completa: cobertura parcial declarada/)
    expect(api.catalog).toHaveBeenCalledTimes(1); expect(api.nodes).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText('Código ou descrição oficial'), '  atividade  ')
    expect(api.nodes).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Consultar nós CNAE' }))
    await user.click(await screen.findByRole('button', { name: 'Selecionar 0010100' }))
    expect(screen.getByTestId('codes')).toHaveTextContent('0099999,0099999,0010100')
    expect(api.nodes).toHaveBeenCalledWith({ nivel: 'subclasse', descricao: '  atividade  ', page: 1, page_size: 10, classification_version: cnaeCatalog.classification_version, publication_id: publication }, expect.any(AbortSignal))
    expect(api.node).not.toHaveBeenCalled(); expect(api.follow).not.toHaveBeenCalled(); expect(api.correspondences).not.toHaveBeenCalled()
  })
  it('navega pelos pais explícitos e links de relações, sem expandir códigos de níveis superiores', async () => {
    const user = userEvent.setup(); renderPicker(); await openAndSearch(user)
    await user.click(screen.getByRole('button', { name: /classe 99999/ }))
    expect(api.node).toHaveBeenCalledWith('classe', '99999', expect.objectContaining({ publication_id: publication }), expect.any(AbortSignal))
    await user.click(await screen.findByRole('button', { name: 'Relações como filho' }))
    expect(api.follow).toHaveBeenCalledWith(cnaeDetail.links.relationships_as_child, publication, expect.any(AbortSignal))
    api.nodes.mockResolvedValue(cnaePage([{ ...cnaeNode, ...cnaeParent, parent: null }]))
    await user.selectOptions(screen.getByLabelText('Nível oficial'), 'classe')
    await user.click(screen.getByRole('button', { name: 'Consultar nós CNAE' }))
    await screen.findByRole('button', { name: /classe 99999/ })
    expect(screen.queryByRole('button', { name: /Selecionar/ })).not.toBeInTheDocument()
    expect(screen.getByTestId('codes')).toHaveTextContent('0099999,0099999')
  })
  it('segue next/previous completos sem acumular páginas e mantém contagem global separada', async () => {
    const user = userEvent.setup(), next = `/api/v1/ibge/cnae/nos/?nivel=subclasse&page=2&page_size=25&publication_id=${publication}`
    api.nodes.mockResolvedValue(cnaePage([cnaeNode], { count: 26, page_size: 25, next }))
    api.follow.mockResolvedValue(cnaePage([{ ...cnaeNode, code: '8430200' }], { count: 26, page: 2, page_size: 25, previous: next.replace('page=2', 'page=1') }))
    renderPicker(); await user.click(screen.getByRole('button', { name: 'Consultar catálogo oficial CNAE' }))
    await user.selectOptions(await screen.findByLabelText('Registros por página CNAE'), '25')
    await user.click(screen.getByRole('button', { name: 'Consultar nós CNAE' }))
    await user.click(await screen.findByRole('button', { name: 'Próxima página CNAE' }))
    expect(await screen.findByRole('button', { name: 'Selecionar 8430200' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Selecionar 0010100' })).not.toBeInTheDocument()
    expect(api.follow).toHaveBeenCalledWith(next, publication, expect.any(AbortSignal))
    expect(screen.getByText(/Página 2 · 26 registros/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Página anterior CNAE' }))
    expect(api.follow).toHaveBeenLastCalledWith(next.replace('page=2', 'page=1'), publication, expect.any(AbortSignal))
  })
  it('409 descarta cache/detalhes, conserva seleção e exige reinício consciente sem retry', async () => {
    const user = userEvent.setup(); const { client } = renderPicker(); await openAndSearch(user)
    await user.click(screen.getByRole('button', { name: 'Selecionar 0010100' }))
    api.node.mockRejectedValue(new ApiError('A publicação atual difere da esperada.', 409, 'publication_mismatch'))
    await user.click(screen.getByRole('button', { name: /subclasse 0010100/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('As páginas e os detalhes anteriores foram descartados')
    await waitFor(() => expect(client.getQueryCache().findAll({ queryKey: ['ibge-cnae'] }).every(query => query.state.data === undefined)).toBe(true))
    expect(screen.queryByRole('button', { name: 'Selecionar 0010100' })).not.toBeInTheDocument()
    expect(screen.queryByText(cnaeCatalog.publication_id)).not.toBeInTheDocument()
    expect(api.catalog).toHaveBeenCalledTimes(1); expect(api.node).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('codes')).toHaveTextContent('0099999,0099999,0010100')
    api.catalog.mockResolvedValue({ ...cnaeCatalog, publication_id: 'b'.repeat(64) })
    await user.click(screen.getByRole('button', { name: 'Reiniciar com a publicação atual' }))
    expect(await screen.findByText('b'.repeat(64))).toBeInTheDocument()
    expect(api.nodes).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Consultar nós CNAE' }))
    await waitFor(() => expect(api.nodes).toHaveBeenLastCalledWith(expect.objectContaining({ publication_id: 'b'.repeat(64), page: 1 }), expect.any(AbortSignal)))
  })
  it.each([400, 404, 503])('mostra HTTP %s e mensagem de integridade sem mascarar como vazio', async status => {
    const user = userEvent.setup(); api.catalog.mockRejectedValue(new ApiError('Mensagem de integridade da API.', status, 'catalog_hierarchy_invalid'))
    renderPicker(); await user.click(screen.getByRole('button', { name: 'Consultar catálogo oficial CNAE' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Mensagem de integridade da API.')
    expect(screen.queryByText(/Nenhum resultado/)).not.toBeInTheDocument()
    expect(api.catalog).toHaveBeenCalledTimes(1); expect(api.nodes).not.toHaveBeenCalled()
  })
  it('apresenta vazio explicitamente sem inventar correspondência para 8430200', async () => {
    const user = userEvent.setup(); renderPicker(); await user.click(screen.getByRole('button', { name: 'Consultar catálogo oficial CNAE' }))
    await screen.findByRole('button', { name: 'Consultar nós CNAE' })
    await user.click(screen.getByText('Consultar correspondências informativas'))
    await user.type(screen.getByLabelText('Código literal na correspondência'), '8430200')
    await user.click(screen.getByRole('button', { name: 'Consultar correspondências' }))
    expect(await screen.findByText('Nenhum resultado neste recorte do catálogo.')).toBeInTheDocument()
    expect(api.correspondences).toHaveBeenCalledWith(expect.objectContaining({ target_code: '8430200' }), expect.any(AbortSignal))
  })
  it.each(['null', 'empty'] as const)('consulta estado %s sem confundir ausência de filtro ou enviar código ignorado', async state => {
    const user = userEvent.setup(); renderPicker()
    await user.click(screen.getByRole('button', { name: 'Consultar catálogo oficial CNAE' }))
    await screen.findByRole('button', { name: 'Consultar nós CNAE' })
    await user.click(screen.getByText('Consultar correspondências informativas'))
    await user.type(screen.getByLabelText('Código literal na correspondência'), '1822900')
    await user.selectOptions(screen.getByLabelText('Estado do código na fonte'), state)
    expect(screen.getByLabelText('Código literal na correspondência')).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Consultar correspondências' }))
    await waitFor(() => expect(api.correspondences).toHaveBeenCalledWith({ page: 1, page_size: 10, target_code_state: state, publication_id: publication, classification_version: cnaeCatalog.classification_version }, expect.any(AbortSignal)))
  })
  it('troca entre páginas retorna 409 e não consulta a nova publicação sem reinício', async () => {
    const user = userEvent.setup(), next = `/api/v1/ibge/cnae/nos/?nivel=subclasse&page=2&publication_id=${publication}`
    api.nodes.mockResolvedValue(cnaePage([cnaeNode], { count: 11, next }))
    api.follow.mockRejectedValue(new ApiError('A publicação atual difere da esperada.', 409, 'publication_mismatch'))
    renderPicker(); await openAndSearch(user)
    await user.click(screen.getByRole('button', { name: 'Próxima página CNAE' }))
    expect(await screen.findByRole('button', { name: 'Reiniciar com a publicação atual' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Selecionar 0010100' })).not.toBeInTheDocument()
    expect(api.follow).toHaveBeenCalledTimes(1); expect(api.catalog).toHaveBeenCalledTimes(1)
  })
  it('preserva linhas repetidas, três resoluções e não oferece links para destinos sem nó', async () => {
    const user = userEvent.setup()
    api.correspondences.mockResolvedValue(cnaePage([
      cnaeCorrespondence, { ...cnaeCorrespondence, ordinal: 1 },
      ...['1822900', '9609201'].map((target_code, index) => ({ ...cnaeCorrespondence, ordinal: index + 2, target_code, target: null, target_resolution: 'absent_from_structure' as const })),
      { ...cnaeCorrespondence, ordinal: 4, target_code: null, target: null, target_resolution: 'no_target_code' },
      { ...cnaeCorrespondence, ordinal: 5, target_code: '', target: null, target_resolution: 'no_target_code' },
    ]))
    renderPicker(); await user.click(screen.getByRole('button', { name: 'Consultar catálogo oficial CNAE' }))
    await screen.findByRole('button', { name: 'Consultar nós CNAE' })
    await user.click(screen.getByText('Consultar correspondências informativas'))
    await user.click(screen.getByRole('button', { name: 'Consultar correspondências' }))
    expect(await screen.findByText(/6 linhas de correspondência/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /subclasse 0010100/ })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /1822900|9609201/ })).not.toBeInTheDocument()
    expect(screen.getAllByText('Destino ausente da estrutura publicada')).toHaveLength(2)
    expect(screen.getAllByText('Sem código de destino na fonte')).toHaveLength(2)
    expect(screen.getAllByText(/"source_cells"/)[0].textContent).toContain('"  espaço  "')
    expect(screen.getAllByText(/"source_cells"/)[0].textContent).toContain('null')
  })
  it('conserva ocorrências de relações e JSON literal de proveniência/observações', async () => {
    const user = userEvent.setup(); renderPicker(); await openAndSearch(user)
    await user.click(screen.getByRole('button', { name: /subclasse 0010100/ }))
    await screen.findByRole('button', { name: 'Consultar filhos' })
    expect(screen.getByText(/"observations"/).textContent).toContain('"  espaço  "')
    expect(screen.getByText(/"sources"/).textContent?.match(/"  fonte  "/g)).toHaveLength(2)
    api.follow.mockResolvedValue(cnaePage([cnaeRelationship, { ...cnaeRelationship, occurrence_id: 8 }]))
    await user.click(screen.getByRole('button', { name: 'Relações como filho' }))
    await screen.findByText(/ocorrência 8/)
    expect(screen.getAllByRole('button', { name: /subclasse 0010100/ })).toHaveLength(2)
  })
  it('cancela coleção ao fechar, retorna foco por Escape e ignora conclusão atrasada', async () => {
    let resolve!: (page: CnaePage<CnaeNode>) => void
    api.nodes.mockImplementation(() => new Promise(value => { resolve = value }))
    const user = userEvent.setup(); renderPicker()
    await user.click(screen.getByRole('button', { name: 'Consultar catálogo oficial CNAE' }))
    await user.click(await screen.findByRole('button', { name: 'Consultar nós CNAE' }))
    expect(await screen.findByText('Carregando consulta CNAE…')).toBeInTheDocument()
    const signal = api.nodes.mock.calls[0][1]!
    await user.keyboard('{Escape}')
    expect(signal.aborted).toBe(true)
    expect(screen.getByRole('button', { name: 'Consultar catálogo oficial CNAE' })).toHaveFocus()
    await act(async () => resolve(cnaePage([cnaeNode])))
    expect(screen.queryByRole('button', { name: 'Selecionar 0010100' })).not.toBeInTheDocument()
  })
  it('Enter e seleção oficial não aplicam formulário B2B; somente códigos/escopo são enviados', async () => {
    const user = userEvent.setup(), applied = vi.fn(), client = createQueryClient()
    render(<QueryClientProvider client={client}><form onSubmit={event => {
      event.preventDefault(); const next = new URLSearchParams('cnae=9999999'); applyB2BForm(new FormData(event.currentTarget), next); applied(next)
    }}><CnpjB2BFilters search={new URLSearchParams('cnaes=0099999,0099999')} /><button>Aplicar filtros</button></form></QueryClientProvider>)
    await user.click(screen.getByRole('button', { name: 'Selecionar CNAEs' }))
    await user.click(screen.getByRole('button', { name: 'Consultar catálogo oficial CNAE' }))
    await user.type(await screen.findByLabelText('Código ou descrição oficial'), 'Atividade{Enter}')
    await screen.findByRole('button', { name: 'Selecionar 0010100' })
    expect(within(screen.getByRole('region', { name: 'Consulta do catálogo oficial CNAE' })).getByRole('heading', { name: 'Catálogo oficial CNAE/CONCLA' })).toHaveFocus()
    await user.click(await screen.findByRole('button', { name: 'Selecionar 0010100' }))
    expect(applied).not.toHaveBeenCalled()
    expect(screen.getByRole('option', { name: 'Principal ou secundárias' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    const next = applied.mock.calls[0][0] as URLSearchParams
    expect(Object.fromEntries(next)).toEqual({ cnaes: '0099999,0099999,0010100', atividade_escopo: 'principal' })
  })
})
