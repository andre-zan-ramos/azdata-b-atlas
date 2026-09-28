import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import { useEffect } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import { getMesh, type Mesh } from '../api/ibge/territories'
import type { WorkSummary } from '../api/receita-federal/cno/types'
import 'leaflet/dist/leaflet.css'

function Fit({ mesh, selectedMunicipalityIbge }: { mesh: Mesh; selectedMunicipalityIbge: string | null }) {
  const map = useMap()
  useEffect(() => {
    const selected = selectedMunicipalityIbge ? mesh.features.find(feature => String(feature.properties?.codarea ?? '') === selectedMunicipalityIbge) : undefined
    const bounds = L.geoJSON((selected ?? mesh) as GeoJSON.GeoJsonObject).getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [14, 14] })
  }, [map, mesh, selectedMunicipalityIbge])
  return null
}

export function CnoTerritoryMap({ uf, onState, onMunicipality, names, selectedMunicipalityIbge, works }: {
  uf: string; onState: (uf: string) => void; onMunicipality: (code: string) => void; names: Map<string, string>; selectedMunicipalityIbge: string | null; works: WorkSummary[]
}) {
  const mesh = useQuery({ queryKey: ['ibge', 'cno-mesh', uf], queryFn: ({ signal }) => getMesh(uf || undefined, signal), staleTime: 86400000, retry: false })
  if (mesh.isPending) return <p role="status" className="cno-map-state">Carregando mapa do IBGE…</p>
  if (mesh.isError) return <div className="cno-map-state" role="alert">Mapa indisponível. <button type="button" onClick={() => void mesh.refetch()}>Tentar novamente</button></div>
  return <MapContainer className="cno-map" center={[-14.2, -51.9]} zoom={4} scrollWheelZoom>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <Fit mesh={mesh.data} selectedMunicipalityIbge={selectedMunicipalityIbge} />
    <GeoJSON key={`${uf || 'BR'}-${names.size}-${selectedMunicipalityIbge ?? ''}`} data={mesh.data as GeoJSON.GeoJsonObject} style={feature => {
      const selected = String(feature?.properties?.codarea ?? '') === selectedMunicipalityIbge
      return { color: selected ? '#8a5a16' : '#267864', weight: selected ? 3 : 1.1, fillColor: selected ? '#eeb64b' : '#58aa8f', fillOpacity: selected ? .5 : .24 }
    }} onEachFeature={(feature, layer) => {
      const code = String(feature.properties?.codarea ?? '')
      const name = names.get(code) ?? code
      layer.bindTooltip(name, { sticky: true })
      layer.on('click', () => { if (uf) onMunicipality(code); else onState(code) })
      layer.on('add', () => {
        const element = (layer as L.Path).getElement()
        if (!element) return
        element.setAttribute('role', 'button')
        element.setAttribute('tabindex', '0')
        element.setAttribute('aria-label', `Selecionar ${name}`)
        element.addEventListener('keydown', rawEvent => {
          const event = rawEvent as KeyboardEvent
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (uf) onMunicipality(code); else onState(code)
          }
        })
      })
    }} />
    {works.flatMap(work => {
      const geo = work.geolocation
      if (geo?.status !== 'available' || geo.stale || geo.reason === 'context_mismatch' || geo.precision !== 'postal_code_approximation' || geo.latitude === null || geo.longitude === null) return []
      return <CircleMarker key={work.id} center={[geo.latitude, geo.longitude]} radius={7} pathOptions={{ color: '#173f37', fillColor: '#eeb64b', fillOpacity: 1 }}><Popup><strong>CNO {work.cno ?? 'não informado'}</strong><br />{work.nome || work.nome_empresarial || 'Obra sem nome'}<br /><small>Localização aproximada pelo CEP</small></Popup></CircleMarker>
    })}
  </MapContainer>
}
