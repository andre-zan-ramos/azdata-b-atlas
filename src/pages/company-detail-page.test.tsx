import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { judicialApi } from '../api/judicial/client'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import type { CompanyDetail } from '../api/receita-federal/cnpj/types'
import { Providers } from '../app/providers'
import { CompanyDetailPage } from './company-detail-page'

vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { company: vi.fn() } }))
vi.mock('../api/judicial/client', () => ({ judicialApi: { byPartyName: vi.fn() } }))

const companyMock = vi.mocked(cnpjApi.company)
const judicialMock = vi.mocked(judicialApi.byPartyName)
const company: CompanyDetail = {
  cnpj_basico: '07434241',
  razao_social: 'CEDOV EMPRESAS LTDA',
  natureza_juridica: null,
  capital_social: '20000.00',
  porte_empresa: null,
  ente_federativo_responsavel: null,
  estabelecimentos: [],
  socios: [],
}

function renderPage() {
  return render(
    <Providers>
      <MemoryRouter initialEntries={['/receita-federal/cnpj/empresas/07434241']}>
        <Routes>
          <Route path="/receita-federal/cnpj/empresas/:cnpjBasico" element={<CompanyDetailPage />} />
        </Routes>
      </MemoryRouter>
    </Providers>,
  )
}

describe('busca processual da empresa', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    judicialMock.mockResolvedValue({ source_total: 0, page: 1, page_size: 10, has_next: false, has_previous: false, returned_count: 0, duplicates_removed: 0, results: [] })
  })

  it('inicia pelo nome somente depois de carregar a empresa e exibe o resultado após o quadro societário', async () => {
    let resolveCompany!: (value: CompanyDetail) => void
    companyMock.mockReturnValue(new Promise(resolve => { resolveCompany = resolve }))
    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Carregando empresa…')
    expect(judicialMock).not.toHaveBeenCalled()

    resolveCompany(company)

    expect(await screen.findByText('Nenhum processo encontrado')).toBeInTheDocument()
    expect(judicialMock).toHaveBeenCalledWith(company.razao_social, { page: 1, page_size: 10 }, expect.any(AbortSignal))
    const partnersHeading = screen.getByRole('heading', { name: 'Quadro societário' })
    const processesHeading = screen.getByRole('heading', { name: 'Processos encontrados' })
    expect(partnersHeading.compareDocumentPosition(processesHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
