import { render, screen, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { judicialApi } from '../api/judicial/client'
import type { EstablishmentDetail } from '../api/receita-federal/cnpj/types'
import { Providers } from '../app/providers'
import { EstablishmentDetailPage } from './establishment-detail-page'

vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { establishment: vi.fn(), requestEstablishmentGeolocation: vi.fn() } }))
vi.mock('../api/judicial/client', () => ({ judicialApi: { byDocument: vi.fn() } }))
vi.mock('react-leaflet', () => ({ MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="postal-map">{children}</div>, TileLayer: () => null, CircleMarker: ({ children }: { children: ReactNode }) => <div data-testid="postal-marker">{children}</div>, Popup: ({ children }: { children: ReactNode }) => <>{children}</> }))
const establishmentMock = vi.mocked(cnpjApi.establishment)
const geolocationMock = vi.mocked(cnpjApi.requestEstablishmentGeolocation)
const judicialMock = vi.mocked(judicialApi.byDocument)

const establishment: EstablishmentDetail = {
  id: 1,
  cnpj: '12345678000210',
  cnpj_basico: '12345678',
  cnpj_ordem: '0002',
  cnpj_dv: '10',
  razao_social: 'EMPRESA ATLAS LTDA',
  nome_fantasia: 'ATLAS CENTRO',
  identificador_matriz_filial: 2,
  situacao_cadastral: 2,
  uf: 'MG',
  municipio: { codigo: '3106200', descricao: 'Belo Horizonte', uf: 'MG' },
  cnae_principal: null,
  empresa: { cnpj_basico: '12345678', razao_social: 'EMPRESA ATLAS LTDA' },
  data_situacao_cadastral: null,
  motivo_situacao_cadastral: null,
  nome_cidade_exterior: null,
  pais: null,
  data_inicio_atividade: null,
  cnae_fiscal_principal: null,
  cnaes_secundarios: [],
  cnae_fiscal_secundaria_raw: null,
  tipo_logradouro: null,
  logradouro: null,
  numero: null,
  complemento: null,
  bairro: null,
  cep: null,
  ddd1: null,
  telefone1: null,
  ddd2: null,
  telefone2: null,
  ddd_fax: null,
  fax: null,
  correio_eletronico: null,
  situacao_especial: null,
  data_situacao_especial: null,
  socios: [],
  geolocation: { status: 'available', reason: null, precision: 'postal_code_approximation', latitude: -19.92, longitude: -43.94, source: 'brasilapi_cep_v2', observed_at: '2026-09-28T12:00:00Z', stale: false },
}

function renderPage(strict = false) {
  const page = <Providers>
      <MemoryRouter initialEntries={[`/receita-federal/cnpj/estabelecimentos/${establishment.cnpj}`]}>
        <Routes>
          <Route path="/receita-federal/cnpj/estabelecimentos/:cnpj" element={<EstablishmentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </Providers>
  return render(strict ? <StrictMode>{page}</StrictMode> : page)
}

describe('cabeçalho do estabelecimento', () => {
  beforeEach(() => { vi.clearAllMocks(); establishmentMock.mockResolvedValue(establishment); geolocationMock.mockResolvedValue(establishment.geolocation); judicialMock.mockResolvedValue({ source_total: 0, page: 1, page_size: 10, has_next: false, has_previous: false, returned_count: 0, duplicates_removed: 0, results: [] }) })

  it('apresenta a empresa uma única vez como retorno e identifica a filial', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'ATLAS CENTRO' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: '← EMPRESA ATLAS LTDA' })).toHaveLength(1)
    expect(screen.getByText('Estabelecimento · Filial · CNPJ 12.345.678/0002-10')).toBeInTheDocument()
    expect(screen.queryByText(/Empresa:/)).not.toBeInTheDocument()
  })

  it('usa a razão social como título quando não há nome fantasia e identifica a matriz', async () => {
    establishmentMock.mockResolvedValue({ ...establishment, cnpj: '12345678000139', cnpj_ordem: '0001', cnpj_dv: '39', nome_fantasia: null, identificador_matriz_filial: '1' })
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'EMPRESA ATLAS LTDA' })).toBeInTheDocument()
    expect(screen.getByText('Estabelecimento · Matriz · CNPJ 12.345.678/0001-39')).toBeInTheDocument()
  })

  it('consulta processos usando somente o CNPJ completo do estabelecimento', async () => {
    renderPage()
    expect(await screen.findByText('Nenhum processo encontrado')).toBeInTheDocument()
    expect(judicialMock).toHaveBeenCalledWith(establishment.cnpj, { page: 1, page_size: 10 }, expect.any(AbortSignal))
  })

  it('mostra marcador somente para coordenada postal disponível e a identifica como aproximação', async () => {
    renderPage()
    expect(await screen.findByTestId('postal-marker')).toBeInTheDocument()
    expect(screen.getByText(/não representa o endereço exato/)).toBeInTheDocument()
    expect(geolocationMock).not.toHaveBeenCalled()
  })

  it.each(['pending', 'available', 'unavailable', 'temporary_error', 'stale', 'disabled'] as const)('não solicita automaticamente no estado %s', async status => {
    establishmentMock.mockResolvedValue({ ...establishment, geolocation: { ...establishment.geolocation, status, latitude: null, longitude: null, precision: null } })
    renderPage()
    await screen.findByRole('heading', { name: 'Localização aproximada pelo CEP' })
    expect(geolocationMock).not.toHaveBeenCalled()
    expect(screen.queryByTestId('postal-marker')).not.toBeInTheDocument()
  })

  it('não mostra coordenadas quando há divergência de contexto', async () => {
    establishmentMock.mockResolvedValue({ ...establishment, geolocation: { ...establishment.geolocation, reason: 'context_mismatch' } })
    renderPage()
    await screen.findByRole('heading', { name: 'Localização aproximada pelo CEP' })
    expect(screen.queryByTestId('postal-marker')).not.toBeInTheDocument()
  })

  it('faz uma única tentativa para not_requested em StrictMode e um único refetch após a mutation', async () => {
    establishmentMock.mockResolvedValue({ ...establishment, cnpj: '00123456000199', geolocation: { ...establishment.geolocation, status: 'not_requested', latitude: null, longitude: null, precision: null } })
    geolocationMock.mockResolvedValue({ ...establishment.geolocation, status: 'pending', latitude: null, longitude: null, precision: null })
    renderPage(true)
    await waitFor(() => expect(geolocationMock).toHaveBeenCalledTimes(1))
    expect(geolocationMock).toHaveBeenCalledWith('00123456000199')
    // StrictMode faz duas leituras iniciais; a terceira é o único refetch pós-mutation.
    await waitFor(() => expect(establishmentMock).toHaveBeenCalledTimes(3))
  })

  it('mantém o cadastro oficial visível quando a solicitação falha', async () => {
    establishmentMock.mockResolvedValue({ ...establishment, geolocation: { ...establishment.geolocation, status: 'not_requested', latitude: null, longitude: null, precision: null } })
    geolocationMock.mockRejectedValue(new Error('timeout'))
    renderPage()
    expect(await screen.findByRole('heading', { name: 'ATLAS CENTRO' })).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('cadastro oficial permanece disponível')
  })

  it.each([
    ['cep_missing', 'não informa um CEP'], ['cep_invalid', 'formato válido'], ['not_found', 'não foi localizado'], ['no_coordinates', 'não retornou coordenadas'],
    ['context_mismatch', 'divergiu do contexto'], ['load_in_progress', 'base CNPJ está em atualização'], ['producer_unavailable', 'serviço de enriquecimento'],
    ['provider_unavailable', 'provedor geográfico'], ['feature_disabled', 'desabilitada no momento'],
  ] as const)('explica o motivo controlado %s', async (reason, message) => {
    const status = reason === 'feature_disabled' ? 'disabled' : reason === 'context_mismatch' ? 'stale' : reason.includes('unavailable') || reason === 'load_in_progress' ? 'temporary_error' : 'unavailable'
    establishmentMock.mockResolvedValue({ ...establishment, geolocation: { ...establishment.geolocation, status, reason, latitude: null, longitude: null, precision: null } })
    renderPage()
    expect(await screen.findByText(new RegExp(message))).toBeInTheDocument()
    expect(screen.queryByTestId('postal-marker')).not.toBeInTheDocument()
  })
})
