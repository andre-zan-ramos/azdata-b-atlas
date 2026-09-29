import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { portalTransparenciaApi } from '../api/portal-transparencia/client'
import type { PortalPage } from '../api/portal-transparencia/types'
import { Providers } from '../app/providers'
import { PortalTransparenciaEnrichment } from './portal-transparencia-enrichment'

vi.mock('../api/portal-transparencia/client', () => ({
  portalTransparenciaApi: { person: vi.fn(), resources: vi.fn(), contracts: vi.fn() },
}))

const personMock = vi.mocked(portalTransparenciaApi.person)
const resourcesMock = vi.mocked(portalTransparenciaApi.resources)
const contractsMock = vi.mocked(portalTransparenciaApi.contracts)
const cnpj = '00123456000199'
const emptyPage: PortalPage = { page: 1, returned_count: 0, total_count: null, has_next: null, has_previous: false, results: [] }

function renderFeature() {
  return render(<Providers><PortalTransparenciaEnrichment cnpj={cnpj} /></Providers>)
}

function panel(name: string) {
  return screen.getByRole('heading', { name }).closest('article') as HTMLElement
}

describe('enriquecimento do Portal da Transparência', () => {
  beforeEach(() => {
    personMock.mockResolvedValue({ cnpj: '00123456000199' })
    resourcesMock.mockResolvedValue(emptyPage)
    contractsMock.mockResolvedValue(emptyPage)
  })

  it('começa ocioso e só consulta cada domínio por ação explícita', async () => {
    const user = userEvent.setup()
    renderFeature()
    expect(screen.getAllByText('Consulta ainda não realizada.')).toHaveLength(3)
    expect(personMock).not.toHaveBeenCalled()
    expect(resourcesMock).not.toHaveBeenCalled()
    expect(contractsMock).not.toHaveBeenCalled()

    await user.click(within(panel('Pessoa jurídica')).getByRole('button', { name: 'Consultar pessoa jurídica' }))
    await waitFor(() => expect(personMock).toHaveBeenCalledWith(cnpj, expect.any(AbortSignal)))
    expect(resourcesMock).not.toHaveBeenCalled()
    expect(contractsMock).not.toHaveBeenCalled()
  })

  it('expõe carregamento e mantém outra consulta já carregada', async () => {
    const user = userEvent.setup()
    let finishContracts!: (value: PortalPage) => void
    contractsMock.mockImplementation(() => new Promise(resolve => { finishContracts = resolve }))
    renderFeature()

    await user.click(within(panel('Pessoa jurídica')).getByRole('button', { name: 'Consultar pessoa jurídica' }))
    expect(await screen.findByText('00123456000199')).toBeInTheDocument()
    await user.click(within(panel('Contratos')).getByRole('button', { name: 'Consultar contratos' }))
    expect(screen.getByRole('status')).toHaveTextContent('Consultando contratos')
    expect(screen.getByText('00123456000199')).toBeInTheDocument()
    finishContracts(emptyPage)
    expect(await screen.findByText('Nenhum registro retornado nesta página')).toBeInTheDocument()
  })

  it('não apaga dados de outro domínio quando uma consulta falha', async () => {
    const user = userEvent.setup()
    contractsMock.mockRejectedValue(new ApiError('privado', 503, 'portal_upstream_unavailable'))
    renderFeature()

    await user.click(within(panel('Pessoa jurídica')).getByRole('button', { name: 'Consultar pessoa jurídica' }))
    expect(await screen.findByText('00123456000199')).toBeInTheDocument()
    await user.click(within(panel('Contratos')).getByRole('button', { name: 'Consultar contratos' }))
    expect(await within(panel('Contratos')).findByRole('alert')).toHaveTextContent('temporariamente indisponível')
    expect(screen.getByText('00123456000199')).toBeInTheDocument()
  })

  it('preserva literalmente códigos, zeros, null, string vazia e valores monetários textuais', async () => {
    const user = userEvent.setup()
    personMock.mockResolvedValue({ codigo: '0007', nulo: null, vazio: '', valorZero: '0,00', valorNegativo: '- 4.220,98', valorPositivo: '209.999,00', indicador: true })
    renderFeature()
    await user.click(within(panel('Pessoa jurídica')).getByRole('button', { name: 'Consultar pessoa jurídica' }))

    for (const literal of ['0007', 'null', 'string vazia', '0,00', '- 4.220,98', '209.999,00', 'true']) {
      expect(await screen.findByText(literal)).toBeInTheDocument()
    }
    expect(screen.getByText(/não comprovam cobertura completa/)).toBeInTheDocument()
  })

  it('mantém total e próxima página desconhecidos e qualifica uma página vazia', async () => {
    const user = userEvent.setup()
    renderFeature()
    await user.click(within(panel('Contratos')).getByRole('button', { name: 'Consultar contratos' }))

    expect(await screen.findByText('Nenhum registro retornado nesta página')).toBeInTheDocument()
    expect(screen.getAllByText('Desconhecido')).toHaveLength(2)
    expect(screen.getByText('Isso não indica inexistência histórica de contratos.')).toBeInTheDocument()
  })

  it('consulta manualmente páginas de contratos sem carregamento automático', async () => {
    const user = userEvent.setup()
    contractsMock.mockResolvedValue({ ...emptyPage, page: 7 })
    renderFeature()
    const contracts = within(panel('Contratos'))
    await user.clear(contracts.getByLabelText('Página'))
    await user.type(contracts.getByLabelText('Página'), '7')
    expect(contractsMock).not.toHaveBeenCalled()
    await user.click(contracts.getByRole('button', { name: 'Consultar contratos' }))
    await waitFor(() => expect(contractsMock).toHaveBeenCalledWith(cnpj, 7, expect.any(AbortSignal)))
    expect(contracts.getByText('7')).toBeInTheDocument()
  })

  it('valida o período antes de consultar recursos e envia a página escolhida', async () => {
    const user = userEvent.setup()
    renderFeature()
    const resources = within(panel('Recursos recebidos'))
    await user.type(resources.getByLabelText('Início (MM/AAAA)'), '13/2025')
    await user.type(resources.getByLabelText('Fim (MM/AAAA)'), '01/2025')
    await user.click(resources.getByRole('button', { name: 'Consultar recursos' }))
    expect(resources.getByRole('alert')).toHaveTextContent('formato MM/AAAA')
    expect(resourcesMock).not.toHaveBeenCalled()

    await user.clear(resources.getByLabelText('Início (MM/AAAA)'))
    await user.type(resources.getByLabelText('Início (MM/AAAA)'), '02/2025')
    await user.clear(resources.getByLabelText('Fim (MM/AAAA)'))
    await user.type(resources.getByLabelText('Fim (MM/AAAA)'), '01/2025')
    await user.click(resources.getByRole('button', { name: 'Consultar recursos' }))
    expect(resources.getByRole('alert')).toHaveTextContent('anterior ou igual')

    await user.clear(resources.getByLabelText('Fim (MM/AAAA)'))
    await user.type(resources.getByLabelText('Fim (MM/AAAA)'), '03/2025')
    await user.clear(resources.getByLabelText('Página'))
    await user.type(resources.getByLabelText('Página'), '4')
    await user.click(resources.getByRole('button', { name: 'Consultar recursos' }))
    await waitFor(() => expect(resourcesMock).toHaveBeenCalledWith(cnpj, { mes_ano_inicio: '02/2025', mes_ano_fim: '03/2025', pagina: 4 }, expect.any(AbortSignal)))
  })

  it.each([
    ['portal_integration_disabled', 503, 'integração está desabilitada'],
    ['portal_upstream_timeout', 504, 'excedeu o tempo de espera'],
    ['portal_upstream_rate_limited', 503, 'limitou temporariamente'],
    ['portal_upstream_rejected', 502, 'rejeitou a consulta'],
    ['portal_upstream_unavailable', 503, 'temporariamente indisponível'],
    ['portal_upstream_invalid_response', 502, 'resposta inesperada'],
    ['portal_invalid_cnpj', 400, 'CNPJ informado não é válido'],
    ['portal_invalid_parameters', 400, 'Revise o período'],
  ])('apresenta mensagem pública segura para %s', async (code, status, message) => {
    const user = userEvent.setup()
    personMock.mockRejectedValue(new ApiError('conteúdo técnico privado', status, code))
    renderFeature()
    await user.click(within(panel('Pessoa jurídica')).getByRole('button', { name: 'Consultar pessoa jurídica' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByText('conteúdo técnico privado')).not.toBeInTheDocument()
  })
})
