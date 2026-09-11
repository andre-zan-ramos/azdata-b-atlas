import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import type { PartnerSearchItem } from '../api/receita-federal/cnpj/types'
import { Providers } from '../app/providers'
import { PartnersPage } from './partners-page'

vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { partners: vi.fn() } }))
const partnersMock = vi.mocked(cnpjApi.partners)
const maria: PartnerSearchItem = { id: 7, identificador_socio: 2, nome_socio_ou_razao_social: 'MARIA SILVA', cnpj_cpf_socio: '***123456**', qualificacao_socio: { codigo: '49', descricao: 'Sócio-Administrador' }, data_entrada_sociedade: '2020-01-02', representante_legal_cpf: null, representante_legal_nome: null, faixa_etaria: 5, empresa: { cnpj_basico: '00123456', razao_social: 'ATLAS LTDA', natureza_juridica: null, porte_empresa: null } }
const fastPage = { count: null, next: null, previous: null, page: 1, page_size: 10 as const, has_next: false, has_previous: false, results: [maria] }

function BackButton() {
  const navigate = useNavigate()
  return <button onClick={() => navigate(-1)}>Voltar no histórico</button>
}

function renderPage(entries = ['/receita-federal/cnpj/socios?q=maria&page=1'], initialIndex = entries.length - 1) {
  return render(<Providers><MemoryRouter initialEntries={entries} initialIndex={initialIndex}><Routes><Route path="/receita-federal/cnpj/socios" element={<><PartnersPage /><BackButton /></>} /></Routes></MemoryRouter></Providers>)
}

describe('busca de sócios', () => {
  beforeEach(() => { vi.clearAllMocks(); partnersMock.mockResolvedValue(fastPage) })

  it('lista a participação, preserva documento e zero inicial e abre a empresa com retorno', async () => {
    renderPage()
    expect(await screen.findByText('MARIA SILVA')).toBeInTheDocument()
    expect(screen.getByText('Documento: ***123456**')).toBeInTheDocument()
    expect(partnersMock).toHaveBeenCalledWith({ q: 'maria', page: 1, page_size: 10 }, expect.any(AbortSignal))
    expect(screen.getByText('00123456')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver empresa ATLAS LTDA' })).toHaveAttribute('href', '/receita-federal/cnpj/empresas/00123456?return_to=%2Freceita-federal%2Fcnpj%2Fsocios%3Fq%3Dmaria%26page%3D1')
  })

  it('mantém participações homônimas como linhas distintas', async () => {
    partnersMock.mockResolvedValue({ ...fastPage, results: [maria, { ...maria, id: 8, empresa: { ...maria.empresa, cnpj_basico: '00999999', razao_social: 'OUTRA EMPRESA SA' } }] })
    renderPage()
    expect(await screen.findAllByText('MARIA SILVA')).toHaveLength(2)
    expect(screen.getByText('ATLAS LTDA')).toBeInTheDocument()
    expect(screen.getByText('OUTRA EMPRESA SA')).toBeInTheDocument()
  })

  it('valida termos curtos junto ao campo sem chamar a API', () => {
    renderPage(['/receita-federal/cnpj/socios?q=ab&page=1'])
    expect(screen.getByText('Informe ao menos 3 caracteres.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Encontre um sócio' })).toHaveAttribute('aria-invalid', 'true')
    expect(partnersMock).not.toHaveBeenCalled()
  })

  it('mostra erro oficial de q e suporta página contada', async () => {
    partnersMock.mockRejectedValueOnce(new ApiError('Revise os campos.', 400, undefined, { q: ['Consulta inválida.'] }))
    const { unmount } = renderPage()
    expect(await screen.findByText('Consulta inválida.')).toBeInTheDocument()
    unmount()
    partnersMock.mockResolvedValueOnce({ ...fastPage, count: 21, next: 'x', previous: 'x', page: 2, has_next: true, has_previous: true })
    renderPage(['/receita-federal/cnpj/socios?q=maria&page=2'])
    expect(await screen.findByText('Página 2 de 3 · 21 resultados')).toBeInTheDocument()
  })

  it('sincroniza o campo com q ao voltar pelo histórico', async () => {
    const user = userEvent.setup()
    renderPage(['/receita-federal/cnpj/socios?q=ana&page=3', '/receita-federal/cnpj/socios?q=maria&page=1'])
    expect(await screen.findByRole('textbox', { name: 'Encontre um sócio' })).toHaveValue('maria')
    await user.click(screen.getByRole('button', { name: 'Voltar no histórico' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Encontre um sócio' })).toHaveValue('ana'))
    await waitFor(() => expect(partnersMock).toHaveBeenCalledWith({ q: 'ana', page: 3, page_size: 10 }, expect.any(AbortSignal)))
  })
})
