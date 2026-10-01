import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { judicialApi } from '../api/judicial/client'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import type { GroupedPartnerSearchItem } from '../api/receita-federal/cnpj/types'
import { Providers } from '../app/providers'
import { PartnerDetailPage } from './partner-detail-page'

vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { partners: vi.fn(), partnerParticipation: vi.fn() } }))
vi.mock('../api/judicial/client', () => ({ judicialApi: { byPartyName: vi.fn() } }))
const partnersMock = vi.mocked(cnpjApi.partners)
const judicialMock = vi.mocked(judicialApi.byPartyName)

const partner: GroupedPartnerSearchItem = {
  nome_socio_ou_razao_social: 'MARIA SILVA',
  cnpj_cpf_socio: '***123456**',
  participacoes_count: 1,
  participacoes: [{ id: 7, identificador_socio: 2, qualificacao_socio: { codigo: '49', descricao: 'Sócio-Administrador' }, data_entrada_sociedade: '2020-01-02', representante_legal_cpf: null, representante_legal_nome: null, faixa_etaria: 5, empresa: { cnpj_basico: '00999999', razao_social: 'EMPRESA ATLAS SA', natureza_juridica: null, porte_empresa: null } }],
}
const partnerPage = { count: null, next: null, previous: null, page: 1, page_size: 50 as const, has_next: false, has_previous: false, results: [partner] }
const processPage = { source_total: 0, page: 1, page_size: 10 as const, has_next: false, has_previous: false, returned_count: 0, duplicates_removed: 0, results: [] }

function renderPage() {
  return render(<Providers><MemoryRouter initialEntries={['/receita-federal/cnpj/socios/detalhes?nome=MARIA+SILVA&documento=***123456**&return_to=%2Freceita-federal%2Fcnpj%2Fsocios%3Fq%3Dmaria%26page%3D1']}><Routes><Route path="/receita-federal/cnpj/socios/detalhes" element={<PartnerDetailPage />} /></Routes></MemoryRouter></Providers>)
}

describe('detalhe do sócio', () => {
  beforeEach(() => { vi.clearAllMocks(); judicialMock.mockResolvedValue(processPage) })

  it('abre a participação técnica vinda do mapa sem buscar grupos por nome ou documento', async () => {
    vi.mocked(cnpjApi.partnerParticipation).mockResolvedValue({ release: '2026-08', participation: { ...partner.participacoes[0], nome_socio_ou_razao_social: partner.nome_socio_ou_razao_social, cnpj_cpf_socio: null } })
    const back = '/receita-federal/cnpj/socios?modo=mapa&uf=MG&page=3'
    render(<Providers><MemoryRouter initialEntries={[`/receita-federal/cnpj/socios/detalhes?participacao=7&release=2026-08&return_to=${encodeURIComponent(back)}`]}><PartnerDetailPage /></MemoryRouter></Providers>)
    expect(await screen.findByRole('heading', { name: 'MARIA SILVA' })).toBeInTheDocument()
    expect(cnpjApi.partnerParticipation).toHaveBeenCalledWith(7, '2026-08', expect.any(AbortSignal))
    expect(partnersMock).not.toHaveBeenCalled()
    expect(screen.getByText(/sem afirmar identidade civil/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Voltar aos resultados' })).toHaveAttribute('href', back)
  })

  it('carrega primeiro as participações e só então consulta processos por nome', async () => {
    let resolvePartner!: (value: typeof partnerPage) => void
    partnersMock.mockReturnValue(new Promise(resolve => { resolvePartner = resolve }))
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Carregando sócio…')
    expect(judicialMock).not.toHaveBeenCalled()
    resolvePartner(partnerPage)
    expect(await screen.findByRole('heading', { name: 'Empresas em que participa' })).toBeInTheDocument()
    expect(screen.getByText('EMPRESA ATLAS SA')).toBeInTheDocument()
    expect(await screen.findByText('Nenhum processo encontrado')).toBeInTheDocument()
    expect(judicialMock).toHaveBeenCalledWith('MARIA SILVA', { page: 1, page_size: 10 }, expect.any(AbortSignal))
    expect(screen.getByRole('link', { name: '← Voltar aos resultados' })).toHaveAttribute('href', '/receita-federal/cnpj/socios?q=maria&page=1')
  })
})
