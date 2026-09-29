import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { portalTransparenciaApi } from '../api/portal-transparencia/client'
import type { PortalPage } from '../api/portal-transparencia/types'
import { Providers } from '../app/providers'
import { PortalTransparenciaEnrichment } from './portal-transparencia-enrichment'

vi.mock('../api/portal-transparencia/client', () => ({ portalTransparenciaApi: { person: vi.fn(), resources: vi.fn(), contracts: vi.fn() } }))
const personMock = vi.mocked(portalTransparenciaApi.person)
const resourcesMock = vi.mocked(portalTransparenciaApi.resources)
const contractsMock = vi.mocked(portalTransparenciaApi.contracts)
const cnpj = '00123456000199'
const emptyPage: PortalPage = { page: 1, returned_count: 0, total_count: null, has_next: null, has_previous: false, results: [] }
function renderFeature() { return render(<Providers><PortalTransparenciaEnrichment cnpj={cnpj} /></Providers>) }
function section(name: string) { return screen.getByRole('heading', { name }).closest('article') as HTMLElement }
async function search(user: ReturnType<typeof userEvent.setup>) { await user.click(screen.getByRole('button', { name: 'Buscar dados no Portal da Transparência' })) }

describe('enriquecimento do Portal da Transparência', () => {
  beforeEach(() => {
    vi.useRealTimers()
    personMock.mockResolvedValue({ cnpj })
    resourcesMock.mockResolvedValue(emptyPage)
    contractsMock.mockResolvedValue(emptyPage)
  })

  it('mantém as consultas sob demanda e uma única ação inicia os três domínios', async () => {
    const user = userEvent.setup(); renderFeature()
    expect(screen.getByRole('link', { name: 'Portal da Transparência do Governo Federal' })).toHaveAttribute('href', 'https://api.portaldatransparencia.gov.br/')
    expect(screen.queryByText('Enriquecimento externo')).not.toBeInTheDocument()
    expect(screen.getByText('Nenhum dado do Portal foi solicitado nesta visita.')).toBeInTheDocument()
    expect(personMock).not.toHaveBeenCalled(); expect(resourcesMock).not.toHaveBeenCalled(); expect(contractsMock).not.toHaveBeenCalled()
    await search(user)
    await waitFor(() => expect(personMock).toHaveBeenCalledWith(cnpj, expect.any(AbortSignal)))
    expect(resourcesMock).toHaveBeenCalledTimes(1)
    expect(contractsMock).toHaveBeenCalledWith(cnpj, 1, expect.any(AbortSignal))
  })

  it('exibe as três seções empilhadas e dados simples ou aninhados em tabelas', async () => {
    const user = userEvent.setup()
    personMock.mockResolvedValue({ razaoSocial: 'EMPRESA TESTE', favorecidoDespesas: true, possuiContratacao: true, sancionadoCEIS: false, habilitadoRenunciaFiscal: false })
    contractsMock.mockResolvedValue({ ...emptyPage, returned_count: 1, results: [{ numero: '0007', compra: { objeto: 'Aquisição', contato: '' } }] })
    renderFeature(); await search(user)
    expect(await screen.findByRole('heading', { name: 'Dados da pessoa jurídica' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recursos recebidos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Contratos' })).toBeInTheDocument()
    expect(await screen.findByText('Recebeu pagamentos de despesas públicas')).toBeInTheDocument()
    expect(screen.getByText('Possui contratação com o Governo Federal')).toBeInTheDocument()
    expect(screen.getByText('Está habilitada a receber benefício de renúncia fiscal')).toBeInTheDocument()
    expect(screen.getByText('Consta no cadastro de empresas inidôneas e suspensas (CEIS)')).toBeInTheDocument()
    expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('EMPRESA TESTE')).toHaveAttribute('title', 'EMPRESA TESTE')
    expect(screen.getByText('0007')).toBeInTheDocument()
    expect(screen.getAllByText('Não informado').length).toBeGreaterThan(0)
  })

  it('mantém sucesso de um domínio quando outro falha', async () => {
    const user = userEvent.setup(); contractsMock.mockRejectedValue(new ApiError('privado', 503, 'portal_upstream_unavailable'))
    renderFeature(); await search(user)
    expect(await screen.findByText('00.123.456/0001-99')).toBeInTheDocument()
    expect(await within(section('Contratos')).findByRole('alert')).toHaveTextContent('temporariamente indisponível')
    expect(screen.queryByText('privado')).not.toBeInTheDocument()
  })

  it('preserva códigos e valores monetários literais, mas apresenta booleanos como Sim e Não', async () => {
    const user = userEvent.setup()
    personMock.mockResolvedValue({ codigo: '0007', valorZero: '0,00', valorNegativo: '- 4.220,98', participanteLicitacao: true, emitiuNFe: false })
    renderFeature(); await search(user)
    for (const literal of ['0007', '0,00', '- 4.220,98', 'Sim', 'Não']) expect(await screen.findByText(literal)).toBeInTheDocument()
    expect(screen.queryByText('true')).not.toBeInTheDocument(); expect(screen.queryByText('false')).not.toBeInTheDocument()
  })

  it('deixa o filtro de recursos recolhido e valida antes de refazer somente essa consulta', async () => {
    const user = userEvent.setup(); renderFeature(); await search(user)
    await screen.findByText('00.123.456/0001-99')
    const resources = within(section('Recursos recebidos'))
    expect(resources.getByText('Filtrar por período').closest('details')).not.toHaveAttribute('open')
    await user.click(resources.getByText('Filtrar por período'))
    await user.clear(resources.getByLabelText('Início (MM/AAAA)')); await user.type(resources.getByLabelText('Início (MM/AAAA)'), '13/2025')
    await user.click(resources.getByRole('button', { name: 'Aplicar período' }))
    expect(resources.getByRole('alert')).toHaveTextContent('formato MM/AAAA')
    expect(resourcesMock).toHaveBeenCalledTimes(1)
  })

  it('qualifica resultado vazio sem transformar totais desconhecidos em zero', async () => {
    const user = userEvent.setup(); renderFeature(); await search(user)
    expect((await screen.findAllByText('Nenhum registro encontrado')).length).toBe(2)
    expect(screen.queryByText(/de 0/)).not.toBeInTheDocument()
  })
})
