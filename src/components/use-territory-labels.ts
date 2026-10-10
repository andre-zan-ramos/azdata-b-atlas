import { useQuery } from '@tanstack/react-query'
import { listMunicipalities } from '../api/ibge/territories'

export function useTerritoryLabels(uf: string, fallback: Map<string, string>) {
  const municipalities = useQuery({
    queryKey: ['ibge', 'map-municipality-labels', uf],
    queryFn: ({ signal }) => listMunicipalities(uf, signal),
    enabled: Boolean(uf), staleTime: 86400000, retry: false,
  })
  const labels = new Map(fallback)
  if (uf) for (const item of municipalities.data ?? []) labels.set(String(item.id), item.nome)
  return { labels, labelKey: JSON.stringify([...labels]) }
}
