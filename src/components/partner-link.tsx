import { Link } from 'react-router'
import type { Partner } from '../api/receita-federal/cnpj/types'
import { partnerSearchPath } from '../utils/partners'

type PartnerLinkProps = {
  partner: Partner
  returnTo: string
}

export function PartnerLink({ partner, returnTo }: PartnerLinkProps) {
  const document = partner.cnpj_cpf_socio?.replace(/\D/g, '') ?? ''
  const partnerPath = partnerSearchPath(partner)

  if (document.length !== 14) {
    return <Link className="partner-name-link" to={partnerPath}>{partner.nome_socio_ou_razao_social}</Link>
  }

  const companyPath = `/receita-federal/cnpj/empresas/${document.slice(0, 8)}?return_to=${encodeURIComponent(returnTo)}`
  return <details className="partner-link-menu">
    <summary className="partner-name-link">{partner.nome_socio_ou_razao_social}</summary>
    <div className="partner-link-options">
      <Link to={partnerPath}>Abrir como sócio</Link>
      <Link to={companyPath}>Abrir como empresa</Link>
    </div>
  </details>
}
