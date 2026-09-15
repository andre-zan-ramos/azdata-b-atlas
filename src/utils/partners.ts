import type { GroupedPartnerSearchItem, Partner } from '../api/receita-federal/cnpj/types'

export function partnerSearchPath(partner: Pick<Partner, 'nome_socio_ou_razao_social'>) {
  const search = new URLSearchParams({
    q: partner.nome_socio_ou_razao_social,
    page: '1',
  })
  return `/receita-federal/cnpj/socios?${search.toString()}`
}

export function partnerDetailPath(partner: Pick<GroupedPartnerSearchItem, 'nome_socio_ou_razao_social' | 'cnpj_cpf_socio'>, returnTo?: string) {
  const search = new URLSearchParams({ nome: partner.nome_socio_ou_razao_social })
  if (partner.cnpj_cpf_socio) search.set('documento', partner.cnpj_cpf_socio)
  if (returnTo) search.set('return_to', returnTo)
  return `/receita-federal/cnpj/socios/detalhes?${search.toString()}`
}
