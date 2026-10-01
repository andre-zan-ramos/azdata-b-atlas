import { Link } from 'react-router'
import type { PartnerMapItem } from '../api/receita-federal/cnpj/types'
import { participationDetailPath } from '../utils/partner-map'

export function PartnerMapLinks({ item, returnTo }: { item: PartnerMapItem; returnTo: string }) {
  const back = encodeURIComponent(returnTo)
  return <span className="partner-map-links">
    <Link to={participationDetailPath(item, returnTo)}>Abrir participação do sócio</Link>{' · '}
    <Link to={`/receita-federal/cnpj/estabelecimentos/${item.establishment.cnpj}?return_to=${back}`}>Abrir estabelecimento</Link>{' · '}
    <Link to={`/receita-federal/cnpj/empresas/${item.company.cnpj_basico}?return_to=${back}`}>Abrir empresa</Link>
  </span>
}
