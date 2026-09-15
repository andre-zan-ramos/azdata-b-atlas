import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { judicialApi } from '../api/judicial/client'
import type { EstablishmentDetail } from '../api/receita-federal/cnpj/types'
import { Providers } from '../app/providers'
import { EstablishmentDetailPage } from './establishment-detail-page'

vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { establishment: vi.fn() } }))
vi.mock('../api/judicial/client', () => ({ judicialApi: { byDocument: vi.fn() } }))
const establishmentMock = vi.mocked(cnpjApi.establishment)
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
}

function renderPage() {
  return render(
    <Providers>
      <MemoryRouter initialEntries={[`/receita-federal/cnpj/estabelecimentos/${establishment.cnpj}`]}>
        <Routes>
          <Route path="/receita-federal/cnpj/estabelecimentos/:cnpj" element={<EstablishmentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </Providers>,
  )
}

describe('cabeçalho do estabelecimento', () => {
  beforeEach(() => { vi.clearAllMocks(); establishmentMock.mockResolvedValue(establishment); judicialMock.mockResolvedValue({ source_total: 0, page: 1, page_size: 10, has_next: false, has_previous: false, returned_count: 0, duplicates_removed: 0, results: [] }) })

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
})
