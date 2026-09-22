import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import { useEffect } from 'react'
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet'
import { getMesh, type Mesh } from '../api/ibge/territories'
import 'leaflet/dist/leaflet.css'

function Fit({ mesh }: { mesh: Mesh }) {
  const map = useMap()
  useEffect(() => {
    const bounds = L.geoJSON(mesh as GeoJSON.GeoJsonObject).getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [14, 14] })
  }, [map, mesh])
  return null
}

export function CnoTerritoryMap({ uf, onState, onMunicipality, names }: {
  uf: string; onState: (uf: string) => void; onMunicipality: (code: string) => void; names: Map<string, string>
}) {
  const mesh = useQuery({ queryKey: ['ibge', 'cno-mesh', uf], queryFn: ({ signal }) => getMesh(uf || undefined, signal), staleTime: 86400000, retry: false })
  if (mesh.isPending) return <p role="status" className="cno-map-state">Carregando mapa do IBGE…</p>
  if (mesh.isError) return <div className="cno-map-state" role="alert">Mapa indisponível. <button type="button" onClick={() => void mesh.refetch()}>Tentar novamente</button></div>
  return <MapContainer className="cno-map" center={[-14.2, -51.9]} zoom={4} scrollWheelZoom>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <Fit mesh={mesh.data} />
    <GeoJSON key={`${uf || 'BR'}-${names.size}`} data={mesh.data as GeoJSON.GeoJsonObject} style={{ color: '#267864', weight: 1.1, fillColor: '#58aa8f', fillOpacity: .24 }} onEachFeature={(feature, layer) => {
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
  </MapContainer>
}
