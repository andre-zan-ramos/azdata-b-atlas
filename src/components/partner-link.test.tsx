import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { Partner } from '../api/receita-federal/cnpj/types'
import { PartnerLink } from './partner-link'

const partner: Partner = {
  identificador_socio: 1,
  nome_socio_ou_razao_social: 'EMPRESA SÓCIA LTDA',
  cnpj_cpf_socio: '47.315.745/0001-03',
  qualificacao_socio: null,
  data_entrada_sociedade: null,
  representante_legal_cpf: null,
  representante_legal_nome: null,
  faixa_etaria: null,
}

describe('navegação de sócio', () => {
  it('oferece as visões de sócio e empresa para pessoa jurídica', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><PartnerLink partner={partner} returnTo="/receita-federal/cnpj/empresas/53028508?return_to=%2Freceita-federal%2Fcnpj" /></MemoryRouter>)

    await user.click(screen.getByText('EMPRESA SÓCIA LTDA'))

    expect(screen.getByRole('link', { name: 'Abrir como sócio' })).toHaveAttribute('href', '/receita-federal/cnpj/socios?q=EMPRESA+S%C3%93CIA+LTDA&page=1')
    expect(screen.getByRole('link', { name: 'Abrir como empresa' })).toHaveAttribute('href', '/receita-federal/cnpj/empresas/47315745?return_to=%2Freceita-federal%2Fcnpj%2Fempresas%2F53028508%3Freturn_to%3D%252Freceita-federal%252Fcnpj')
  })

  it('mantém pessoa física como link direto para participações', () => {
    render(<MemoryRouter><PartnerLink partner={{ ...partner, nome_socio_ou_razao_social: 'MARIA SILVA', cnpj_cpf_socio: '***397766**' }} returnTo="/receita-federal/cnpj/empresas/53028508" /></MemoryRouter>)

    expect(screen.getByRole('link', { name: 'MARIA SILVA' })).toHaveAttribute('href', '/receita-federal/cnpj/socios?q=MARIA+SILVA&page=1')
    expect(screen.queryByRole('link', { name: 'Abrir como empresa' })).not.toBeInTheDocument()
  })
})
