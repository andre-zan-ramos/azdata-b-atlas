export interface Territory { id: number; nome: string; sigla?: string }
export interface Mesh { type: 'FeatureCollection'; features: Array<{ type: 'Feature'; properties: { codarea: string }; geometry: GeoJSON.Geometry }> }

const BASE = 'https://servicodados.ibge.gov.br/api/'

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(BASE + path, { signal })
  if (!response.ok) throw new Error('Não foi possível carregar os territórios do IBGE.')
  return response.json() as Promise<T>
}

export const listStates = (signal?: AbortSignal) => get<Territory[]>('v1/localidades/estados', signal)
export const listMunicipalities = (uf: string, signal?: AbortSignal) => get<Territory[]>(`v1/localidades/estados/${encodeURIComponent(uf)}/municipios`, signal)
export const getMesh = (uf?: string, signal?: AbortSignal) => {
  const params = new URLSearchParams({ intrarregiao: uf ? 'municipio' : 'UF', qualidade: 'minima', formato: 'application/vnd.geo+json' })
  return get<Mesh>(`v4/malhas/${uf ? `estados/${encodeURIComponent(uf)}` : 'paises/BR'}?${params}`, signal)
}
