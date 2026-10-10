import { useTerritorySelection } from './use-territory-selection'
import { useTerritoryLabels } from './use-territory-labels'
import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import { useEffect } from 'react'
import { GeoJSON, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router'
import { getMesh, type Mesh } from '../api/ibge/territories'
import type { WorkMapPoint } from '../api/receita-federal/cno/types'
import { validCoordinates } from '../utils/map-accessibility'
import { AccessibleCircleMarker } from './accessible-circle-marker'
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

export function CnoTerritoryMap({ uf, onState, onMunicipality, names, selectedMunicipalityIbge, works, returnTo }: {
  uf: string; onState: (uf: string) => void; onMunicipality: (code: string) => void; names: Map<string, string>; selectedMunicipalityIbge: string | null; works: WorkMapPoint[]; returnTo: string
}) {
  const selectTerritory = useTerritorySelection(uf, onState, onMunicipality)
  const { labels, labelKey } = useTerritoryLabels(uf, names)
  const mesh = useQuery({ queryKey: ['ibge', 'cno-mesh', uf], queryFn: ({ signal }) => getMesh(uf || undefined, signal), staleTime: 86400000, retry: false })
  if (mesh.isPending) return <p role="status" className="cno-map-state">Carregando mapa do IBGE…</p>
  if (mesh.isError) return <div className="cno-map-state" role="alert">Mapa indisponível. <button type="button" onClick={() => void mesh.refetch()}>Tentar novamente</button></div>
  return <MapContainer className="cno-map" center={[-14.2, -51.9]} zoom={4} scrollWheelZoom={true}>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <Fit mesh={mesh.data} selectedMunicipalityIbge={selectedMunicipalityIbge} />
    <GeoJSON key={`${uf || 'BR'}-${labelKey}-${selectedMunicipalityIbge ?? ''}`} data={mesh.data as GeoJSON.GeoJsonObject} style={feature => {
      const selected = String(feature?.properties?.codarea ?? '') === selectedMunicipalityIbge
      return { color: selected ? '#8a5a16' : '#267864', weight: selected ? 3 : 1.1, fillColor: selected ? '#eeb64b' : '#58aa8f', fillOpacity: selected ? .5 : .24 }
    }} onEachFeature={(feature, layer) => {
      const code = String(feature.properties?.codarea ?? '')
      const name = labels.get(code) ?? (uf ? 'Munic\u00edpio' : 'UF')
      layer.bindTooltip(name, { sticky: true })
      layer.on('click', () => selectTerritory(code))
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
            selectTerritory(code)
          }
        })
      })
    }} />
    {works.flatMap(work => {
      const geo = work.geolocation
      if (geo?.status !== 'available' || geo.stale || geo.reason === 'context_mismatch' || geo.precision !== 'postal_code_approximation' || geo.latitude === null || geo.longitude === null || !validCoordinates(geo.latitude, geo.longitude)) return []
      return <AccessibleCircleMarker accessibleLabel={`Ocorrência ${work.id}, CNO ${work.cno ?? 'não informado'}. Abrir popup`} key={work.id} center={[geo.latitude, geo.longitude]} radius={7} pathOptions={{ color: '#173f37', fillColor: '#eeb64b', fillOpacity: 1 }}><Popup><strong>CNO {work.cno ?? 'não informado'}</strong><br />{work.nome || work.nome_empresarial || 'Obra sem nome'}<br />{work.municipio ?? 'Município não informado'} / {work.uf ?? 'UF não informada'}<br /><small>Localização aproximada pelo CEP</small><br /><Link to={`/receita-federal/cno/obras/${work.id}?return_to=${encodeURIComponent(returnTo)}`}>Abrir ocorrência</Link></Popup></AccessibleCircleMarker>
    })}
  </MapContainer>
}
