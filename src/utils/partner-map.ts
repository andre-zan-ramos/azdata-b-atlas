import type { PartnerMapItem, PartnerMapResponse, PartnerMapResults } from '../api/receita-federal/cnpj/types'

export function participationDetailPath(item: PartnerMapItem, returnTo: string) {
  const params = new URLSearchParams({ participacao: String(item.identity.participation_id), release: item.identity.release, return_to: returnTo })
  return `/receita-federal/cnpj/socios/detalhes?${params}`
}

export function compatiblePartnerMap(map: PartnerMapResponse, list: PartnerMapResults) {
  const keys = new Set([...Object.keys(map.filters), ...Object.keys(list.filters)])
  return map.release !== null && map.release === list.release && map.coverage.points_match_results === true && [...keys].every(key => map.filters[key] === list.filters[key])
}

export function validPartnerPoint(item: PartnerMapItem) {
  const geo = item.establishment.geolocation
  return item.identity.cnpj === item.establishment.cnpj && item.identity.establishment_id === item.establishment.id && item.identity.participation_id === item.participation.id && geo.status === 'available' && !geo.stale && geo.reason !== 'context_mismatch' && geo.precision === 'postal_code_approximation' && geo.latitude !== null && geo.longitude !== null && Number.isFinite(geo.latitude) && Number.isFinite(geo.longitude) && Math.abs(geo.latitude) <= 90 && Math.abs(geo.longitude) <= 180 && (geo.latitude !== 0 || geo.longitude !== 0)
}
