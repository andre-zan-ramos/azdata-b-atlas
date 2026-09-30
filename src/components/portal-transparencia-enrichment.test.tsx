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
    expect(resourcesMock).toHaveBeenCalledWith(cnpj, { quantidade: '3' }, expect.any(AbortSignal))
    expect(contractsMock).toHaveBeenCalledWith(cnpj, 1, expect.any(AbortSignal))
  })

  it('exibe as três seções empilhadas e dados simples ou aninhados em tabelas', async () => {
    const user = userEvent.setup()
    personMock.mockResolvedValue({ razaoSocial: 'EMPRESA TESTE', favorecidoDespesas: true, possuiContratacao: true, sancionadoCEIS: false, habilitadoRenunciaFiscal: false, indicadores: [{ key: 'favorecidoDespesas', label: 'Favorecido de despesas', description: 'O Portal sinaliza que a pessoa jurídica consta como favorecida em despesas públicas.', value: true, present: true, source_scope: 'despesas_publicas', reference_date: null }] })
    contractsMock.mockResolvedValue({ ...emptyPage, returned_count: 1, results: [{ id: 101208736, numero: '232019', situacaoContrato: 'Fechado', objeto: 'Aquisição de ferramenta informatizada', valorInicialCompra: '9.312,00', valorFinalCompra: '10.500,50', dataAssinatura: '2025-03-14', dataInicioVigencia: '2025-04-01', dataFimVigencia: '2026-03-31', compra: { numero: '0007', objeto: 'Aquisição', contato: '' } }] })
    renderFeature(); await search(user)
    expect(await screen.findByRole('heading', { name: 'Dados da pessoa jurídica' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recursos recebidos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Contratos' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Ver detalhes: Favorecido de despesas' })).toBeInTheDocument()
    expect(screen.getByText('Possui contratação com o Governo Federal')).toBeInTheDocument()
    expect(screen.getByText('Está habilitada a receber benefício de renúncia fiscal')).toBeInTheDocument()
    expect(screen.getByText('Consta no cadastro de empresas inidôneas e suspensas (CEIS)')).toBeInTheDocument()
    expect(screen.getByText('EMPRESA TESTE')).toHaveAttribute('title', 'EMPRESA TESTE')
    expect(screen.getAllByText('Não informado').length).toBeGreaterThan(0)
    expect(screen.queryByText('Outras informações')).not.toBeInTheDocument()

    const contract = screen.getByText('Contrato 232019').closest('details') as HTMLElement
    const contractSummary = contract.querySelector('summary') as HTMLElement
    expect(contract).not.toHaveAttribute('open')
    expect(within(contractSummary).getByText('Fechado')).toBeInTheDocument()
    expect(within(contractSummary).getByText('R$ 10.500,50')).toBeInTheDocument()
    expect(within(contractSummary).getByText('01/04/2025 — 31/03/2026')).toBeInTheDocument()
    expect(within(contractSummary).getByText('Aquisição de ferramenta informatizada')).toHaveAttribute('title', 'Aquisição de ferramenta informatizada')
    await user.click(within(contract).getByText('Contrato 232019'))
    expect(contract).toHaveAttribute('open')
    expect(within(contract).getByText(/9\.312,00/)).toBeInTheDocument()
    expect(within(contract).getByText('14/03/2025')).toBeInTheDocument()
    expect(within(contract).getByText('0007')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ver detalhes: Favorecido de despesas' }))
    const dialog = screen.getByRole('dialog', { name: 'Favorecido de despesas' })
    expect(within(dialog).getByText('O Portal sinaliza que a pessoa jurídica consta como favorecida em despesas públicas.')).toBeInTheDocument()
    expect(within(dialog).getByText('despesas_publicas')).toBeInTheDocument()
    expect(within(dialog).getByText('favorecidoDespesas')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mantém sucesso de um domínio quando outro falha', async () => {
    const user = userEvent.setup(); contractsMock.mockRejectedValue(new ApiError('privado', 503, 'portal_upstream_unavailable'))
    renderFeature(); await search(user)
    expect(await screen.findByText('00.123.456/0001-99')).toBeInTheDocument()
    expect(await within(section('Contratos')).findByRole('alert')).toHaveTextContent('temporariamente indisponível')
    expect(screen.queryByText('privado')).not.toBeInTheDocument()
  })

  it('solicita e exibe os três recursos mais recentes sem impor período inicial', async () => {
    const user = userEvent.setup()
    resourcesMock.mockResolvedValue({ ...emptyPage, returned_count: 3, results: [
      { anoMes: 202603, codigoPessoa: '08.747.227/0001-07', nomePessoa: 'ARQUITETURA PROCESSUAL INTELIGENTE LTDA', tipoPessoa: 'Entidades Empresariais Privadas', municipioPessoa: 'FLORIANÓPOLIS', siglaUFPessoa: 'SC', codigoUG: '153163', nomeUG: 'UNIVERSIDADE FEDERAL DE SANTA CATARINA', codigoOrgao: '26246', nomeOrgao: 'Universidade Federal de Santa Catarina', codigoOrgaoSuperior: '26000', nomeOrgaoSuperior: 'Ministério da Educação', valor: '25.09' },
      { anoMes: '02/2026', valor: '20,00' },
      { anoMes: '01/2026', valor: '10,00' },
    ] })
    renderFeature(); await search(user)
    await waitFor(() => expect(resourcesMock).toHaveBeenCalledWith(cnpj, { quantidade: '3' }, expect.any(AbortSignal)))
    expect(await screen.findByText('Recurso 1')).toBeInTheDocument()
    expect(screen.getByText('Recurso 2')).toBeInTheDocument()
    expect(screen.getByText('Recurso 3')).toBeInTheDocument()
    const firstResource = screen.getByText('Recurso 1').closest('table') as HTMLElement
    expect(within(firstResource).getByText('03/2026')).toBeInTheDocument()
    expect(within(firstResource).getByText('R$ 25,09')).toBeInTheDocument()
    expect(within(firstResource).getByText('153163 — UNIVERSIDADE FEDERAL DE SANTA CATARINA')).toBeInTheDocument()
    expect(within(firstResource).getByText('26246 — Universidade Federal de Santa Catarina')).toBeInTheDocument()
    expect(within(firstResource).getByText('26000 — Ministério da Educação')).toBeInTheDocument()
    expect(within(firstResource).getByText('FLORIANÓPOLIS — SC')).toBeInTheDocument()
    expect(within(firstResource).queryByText('Código UG')).not.toBeInTheDocument()
    expect(within(firstResource).queryByText('Nome UG')).not.toBeInTheDocument()
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
    expect(resources.getByText('Filtrar recursos').closest('details')).not.toHaveAttribute('open')
    await user.click(resources.getByText('Filtrar recursos'))
    expect(resources.getByLabelText('Quantidade de recursos')).toHaveValue('3')
    await user.selectOptions(resources.getByLabelText('Quantidade de recursos'), '10')
    await user.clear(resources.getByLabelText('Início (MM/AAAA)')); await user.type(resources.getByLabelText('Início (MM/AAAA)'), '13/2025')
    await user.click(resources.getByRole('button', { name: 'Aplicar filtros' }))
    expect(resources.getByRole('alert')).toHaveTextContent('formato MM/AAAA')
    expect(resourcesMock).toHaveBeenCalledTimes(1)
    await user.clear(resources.getByLabelText('Início (MM/AAAA)')); await user.type(resources.getByLabelText('Início (MM/AAAA)'), '01/2025')
    await user.click(resources.getByRole('button', { name: 'Aplicar filtros' }))
    await waitFor(() => expect(resourcesMock).toHaveBeenLastCalledWith(cnpj, { mes_ano_inicio: '01/2025', mes_ano_fim: expect.any(String), pagina: 1, quantidade: '10' }, expect.any(AbortSignal)))
  })

  it('qualifica resultado vazio sem transformar totais desconhecidos em zero', async () => {
    const user = userEvent.setup(); renderFeature(); await search(user)
    expect((await screen.findAllByText('Nenhum registro encontrado')).length).toBe(2)
    expect(screen.queryByText(/de 0/)).not.toBeInTheDocument()
  })
})
