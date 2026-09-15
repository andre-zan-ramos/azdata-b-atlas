import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import type { GroupedPartnerSearchItem } from '../api/receita-federal/cnpj/types'
import { Providers } from '../app/providers'
import { PartnersPage } from './partners-page'

vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { partners: vi.fn(), company: vi.fn() } }))
const partnersMock = vi.mocked(cnpjApi.partners)
const companyMock = vi.mocked(cnpjApi.company)

const maria: GroupedPartnerSearchItem = {
  nome_socio_ou_razao_social: 'MARIA SILVA',
  cnpj_cpf_socio: '***123456**',
  participacoes_count: 2,
  participacoes: [
    { id: 7, identificador_socio: 2, qualificacao_socio: { codigo: '49', descricao: 'Sócio-Administrador' }, data_entrada_sociedade: '2020-01-02', representante_legal_cpf: null, representante_legal_nome: null, faixa_etaria: 5, empresa: { cnpj_basico: '00999999', razao_social: 'ZETA EMPRESA SA', natureza_juridica: null, porte_empresa: null } },
    { id: 8, identificador_socio: 2, qualificacao_socio: null, data_entrada_sociedade: '2024-05-03', representante_legal_cpf: null, representante_legal_nome: null, faixa_etaria: null, empresa: { cnpj_basico: '00123456', razao_social: 'ALFA LTDA', natureza_juridica: null, porte_empresa: null } },
  ],
}
const fastPage = { count: null, next: null, previous: null, page: 1, page_size: 10 as const, has_next: false, has_previous: false, results: [maria] }

function BackButton() {
  const navigate = useNavigate()
  return <button onClick={() => navigate(-1)}>Voltar no histórico</button>
}

function renderPage(entries = ['/receita-federal/cnpj/socios?q=maria&page=1'], initialIndex = entries.length - 1) {
  return render(<Providers><MemoryRouter initialEntries={entries} initialIndex={initialIndex}><Routes><Route path="/receita-federal/cnpj/socios" element={<><PartnersPage /><BackButton /></>} /></Routes></MemoryRouter></Providers>)
}

describe('busca agrupada de sócios', () => {
  beforeEach(() => { vi.clearAllMocks(); partnersMock.mockResolvedValue(fastPage) })

  it('renderiza todas as participações do grupo na ordem da API e preserva navegação e zeros', async () => {
    const user = userEvent.setup()
    partnersMock.mockResolvedValue({ ...fastPage, results: [maria, { ...maria, nome_socio_ou_razao_social: 'ANA COSTA', participacoes_count: 1, participacoes: [maria.participacoes[0]] }] })
    renderPage()
    const groups = await screen.findAllByRole('article')
    const group = groups[0]
    expect(groups.map(item => within(item).getByRole('button').textContent)).toEqual(['MARIA SILVA***123456**2 participações⌄', 'ANA COSTA***123456**1 participação⌄'])
    expect(within(group).getByText('***123456**')).toBeInTheDocument()
    expect(within(group).getByText('2 participações')).toBeInTheDocument()
    expect(within(group).getByRole('link', { name: 'Ver detalhes' })).toHaveAttribute('href', '/receita-federal/cnpj/socios/detalhes?nome=MARIA+SILVA&documento=***123456**&return_to=%2Freceita-federal%2Fcnpj%2Fsocios%3Fq%3Dmaria%26page%3D1')
    expect(within(group).queryByRole('table')).not.toBeInTheDocument()
    await user.click(within(group).getByRole('button', { name: /MARIA SILVA/ }))
    expect(within(within(group).getByRole('table')).getAllByRole('link').map(link => link.getAttribute('aria-label'))).toEqual(['Ver empresa ZETA EMPRESA SA', 'Ver empresa ALFA LTDA'])
    expect(within(group).getByText('00123456')).toBeInTheDocument()
    expect(within(group).getByRole('link', { name: 'Ver empresa ALFA LTDA' })).toHaveAttribute('href', '/receita-federal/cnpj/empresas/00123456?return_to=%2Freceita-federal%2Fcnpj%2Fsocios%3Fq%3Dmaria%26page%3D1')
    expect(partnersMock).toHaveBeenCalledWith({ q: 'maria', q_modo: 'contendo', page: 1, page_size: 10 }, expect.any(AbortSignal))
  })

  it('ordena somente a tabela aberta por empresa e entrada nas duas direções', async () => {
    const user = userEvent.setup()
    renderPage()
    const group = await screen.findByRole('article')
    await user.click(within(group).getByRole('button', { name: /MARIA SILVA/ }))
    const companyOrder = () => within(within(group).getByRole('table')).getAllByRole('link').map(link => link.getAttribute('aria-label'))
    expect(companyOrder()).toEqual(['Ver empresa ZETA EMPRESA SA', 'Ver empresa ALFA LTDA'])
    await user.click(within(group).getByRole('button', { name: /Ordenar por empresa/ }))
    expect(companyOrder()).toEqual(['Ver empresa ALFA LTDA', 'Ver empresa ZETA EMPRESA SA'])
    await user.click(within(group).getByRole('button', { name: /Ordenar por empresa/ }))
    expect(companyOrder()).toEqual(['Ver empresa ZETA EMPRESA SA', 'Ver empresa ALFA LTDA'])
    await user.click(within(group).getByRole('button', { name: /Ordenar por entrada/ }))
    expect(companyOrder()).toEqual(['Ver empresa ZETA EMPRESA SA', 'Ver empresa ALFA LTDA'])
    await user.click(within(group).getByRole('button', { name: /Ordenar por entrada/ }))
    expect(companyOrder()).toEqual(['Ver empresa ALFA LTDA', 'Ver empresa ZETA EMPRESA SA'])
  })

  it('mostra documento ausente sem presumir identidade e não dispara chamadas N+1', async () => {
    partnersMock.mockResolvedValue({ ...fastPage, results: [{ ...maria, cnpj_cpf_socio: null }] })
    renderPage()
    expect(await screen.findByText('Documento não informado')).toBeInTheDocument()
    expect(screen.getByText(/não comprova uma identidade civil única/i)).toBeInTheDocument()
    expect(partnersMock).toHaveBeenCalledTimes(1)
    expect(companyMock).not.toHaveBeenCalled()
  })

  it('usa count nulo e habilita a paginação exclusivamente pelas flags', async () => {
    const user = userEvent.setup()
    partnersMock.mockResolvedValue({ ...fastPage, page: 2, has_next: true, has_previous: true })
    renderPage(['/receita-federal/cnpj/socios?q=maria&page=2'])
    expect(await screen.findByText('Página 2')).toBeInTheDocument()
    expect(screen.queryByText(/resultados/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Próxima' }))
    await waitFor(() => expect(partnersMock).toHaveBeenLastCalledWith({ q: 'maria', q_modo: 'contendo', page: 3, page_size: 10 }, expect.any(AbortSignal)))
  })

  it('valida termos curtos junto ao campo sem chamar a API', () => {
    renderPage(['/receita-federal/cnpj/socios?q=ab&page=1'])
    expect(screen.getByText('Informe ao menos 3 caracteres.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Encontre um sócio' })).toHaveAttribute('aria-invalid', 'true')
    expect(partnersMock).not.toHaveBeenCalled()
  })

  it('mostra erro oficial de q e resposta vazia', async () => {
    partnersMock.mockRejectedValueOnce(new ApiError('Revise os campos.', 400, undefined, { q: ['Consulta inválida.'] }))
    const { unmount } = renderPage()
    expect(await screen.findByText('Consulta inválida.')).toBeInTheDocument()
    unmount()
    partnersMock.mockResolvedValueOnce({ ...fastPage, results: [] })
    renderPage()
    expect(await screen.findByText(/Nenhum resultado/i)).toBeInTheDocument()
  })

  it('sincroniza o campo com q ao voltar pelo histórico e cancela consultas obsoletas', async () => {
    const user = userEvent.setup()
    renderPage(['/receita-federal/cnpj/socios?q=ana&page=3', '/receita-federal/cnpj/socios?q=maria&page=1'])
    expect(await screen.findByRole('textbox', { name: 'Encontre um sócio' })).toHaveValue('maria')
    await user.click(screen.getByRole('button', { name: 'Voltar no histórico' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Encontre um sócio' })).toHaveValue('ana'))
    await waitFor(() => expect(partnersMock).toHaveBeenCalledWith({ q: 'ana', q_modo: 'contendo', page: 3, page_size: 10 }, expect.any(AbortSignal)))
    expect(partnersMock.mock.calls.every(call => call[1] instanceof AbortSignal)).toBe(true)
  })

  it('restaura o modo e envia q_modo com o agrupamento mantido pelo cliente', async () => {
    renderPage(['/receita-federal/cnpj/socios?q=maria&q_modo=fim&page=2'])
    await screen.findByRole('article')
    expect(screen.getByRole('combobox', { name: 'Modo de correspondência' })).toHaveValue('fim')
    expect(partnersMock).toHaveBeenCalledWith({ q: 'maria', q_modo: 'fim', page: 2, page_size: 10 }, expect.any(AbortSignal))
  })

  it('muda o modo, reinicia a página e preserva return_to', async () => {
    const user = userEvent.setup()
    renderPage(['/receita-federal/cnpj/socios?q=maria&q_modo=inicio&page=4&return_to=%2Forigem'])
    await screen.findByRole('article')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Modo de correspondência' }), 'exato')
    await waitFor(() => expect(partnersMock).toHaveBeenLastCalledWith({ q: 'maria', q_modo: 'exato', page: 1, page_size: 10 }, expect.any(AbortSignal)))
    expect(screen.getByRole('link', { name: 'Ver detalhes' }).getAttribute('href')).toContain('return_to=%2Freceita-federal%2Fcnpj%2Fsocios%3Fq%3Dmaria%26q_modo%3Dexato%26page%3D1%26return_to%3D%252Forigem')
  })

  it('normaliza modo inválido para contendo sem enviá-lo à API', async () => {
    renderPage(['/receita-federal/cnpj/socios?q=maria&q_modo=aproximado&page=2'])
    await screen.findByRole('article')
    expect(screen.getByRole('combobox', { name: 'Modo de correspondência' })).toHaveValue('contendo')
    expect(partnersMock.mock.calls.every(([params]) => params.q_modo === 'contendo')).toBe(true)
  })
})
