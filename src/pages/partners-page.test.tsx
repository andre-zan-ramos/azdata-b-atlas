import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { Providers } from '../app/providers'
import { PartnersPage } from './partners-page'

vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { partners: vi.fn() } }))
const partnersMock = vi.mocked(cnpjApi.partners)

describe('busca de sócios', () => {
  beforeEach(() => { vi.clearAllMocks(); partnersMock.mockResolvedValue({ count: null, next: null, previous: null, page: 1, page_size: 10, has_next: false, has_previous: false, results: [{ id: 7, identificador_socio: 2, nome_socio_ou_razao_social: 'MARIA SILVA', cnpj_cpf_socio: '***123456**', qualificacao_socio: { codigo: '49', descricao: 'Sócio-Administrador' }, data_entrada_sociedade: '2020-01-02', representante_legal_cpf: null, representante_legal_nome: null, faixa_etaria: 5, empresa: { cnpj_basico: '00123456', razao_social: 'ATLAS LTDA' } }] }) })
  it('lista a participação e abre a empresa preservando a busca', async () => {
    render(<Providers><MemoryRouter initialEntries={['/receita-federal/cnpj/socios?q=maria&page=1']}><Routes><Route path="/receita-federal/cnpj/socios" element={<PartnersPage />} /></Routes></MemoryRouter></Providers>)
    expect(await screen.findByText('MARIA SILVA')).toBeInTheDocument()
    expect(partnersMock).toHaveBeenCalledWith({ q: 'maria', page: 1, page_size: 10 }, expect.any(AbortSignal))
    expect(screen.getByRole('link', { name: 'Ver empresa ATLAS LTDA' })).toHaveAttribute('href', '/receita-federal/cnpj/empresas/00123456?return_to=%2Freceita-federal%2Fcnpj%2Fsocios%3Fq%3Dmaria%26page%3D1')
  })
})
