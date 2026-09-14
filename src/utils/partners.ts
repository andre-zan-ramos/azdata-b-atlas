import type { Partner } from '../api/receita-federal/cnpj/types'

export function partnerSearchPath(partner: Pick<Partner, 'nome_socio_ou_razao_social'>) {
  const search = new URLSearchParams({
    q: partner.nome_socio_ou_razao_social,
    page: '1',
  })
  return `/receita-federal/cnpj/socios?${search.toString()}`
}
