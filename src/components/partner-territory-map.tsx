import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import { useEffect } from 'react'
import { GeoJSON, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { getMesh, type Mesh } from '../api/ibge/territories'
import type { PartnerMapItem } from '../api/receita-federal/cnpj/types'
import { validPartnerPoint } from '../utils/partner-map'
import { PartnerMapLinks } from './partner-map-links'
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

export function PartnerTerritoryMap({ uf, onState, onMunicipality, names, selectedMunicipalityIbge, points, returnTo }: {
  uf: string; onState: (code: string) => void; onMunicipality: (code: string) => void; names: Map<string, string>; selectedMunicipalityIbge: string | null; points: PartnerMapItem[]; returnTo: string
}) {
  const mesh = useQuery({ queryKey: ['ibge', 'partner-mesh', uf], queryFn: ({ signal }) => getMesh(uf || undefined, signal), staleTime: 86400000, retry: false })
  if (mesh.isPending) return <p role="status" className="cno-map-state">Carregando mapa do IBGE…</p>
  if (mesh.isError) return <div className="cno-map-state" role="alert">Mapa indisponível. <button type="button" onClick={() => void mesh.refetch()}>Tentar novamente</button></div>
  // Co-located items share one marker with every relationship in its popup.
  // This is presentation grouping only: no item or technical identity is removed.
  const positions = new Map<string, PartnerMapItem[]>()
  for (const point of points) {
    if (!validPartnerPoint(point)) continue
    const geo = point.establishment.geolocation
    const key = `${geo.latitude},${geo.longitude}`
    const items = positions.get(key) ?? []
    items.push(point)
    positions.set(key, items)
  }
  return <MapContainer className="cno-map" center={[-14.2, -51.9]} zoom={4} scrollWheelZoom={false}>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <Fit mesh={mesh.data} selectedMunicipalityIbge={selectedMunicipalityIbge} />
    <GeoJSON key={`${uf || 'BR'}-${names.size}-${selectedMunicipalityIbge ?? ''}`} data={mesh.data as GeoJSON.GeoJsonObject} style={feature => ({ color: String(feature?.properties?.codarea ?? '') === selectedMunicipalityIbge ? '#8a5a16' : '#267864', weight: 1.5, fillColor: '#58aa8f', fillOpacity: .24 })} onEachFeature={(feature, layer) => {
      const code = String(feature.properties?.codarea ?? '')
      const name = names.get(code) ?? code
      const select = () => { if (uf) onMunicipality(code); else onState(code) }
      layer.bindTooltip(name, { sticky: true }); layer.on('click', select)
      layer.on('add', () => {
        const element = (layer as L.Path).getElement()
        if (!element) return
        element.setAttribute('role', 'button'); element.setAttribute('tabindex', '0'); element.setAttribute('aria-label', `Selecionar ${name}`)
        element.addEventListener('keydown', rawEvent => { const event = rawEvent as KeyboardEvent; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select() } })
      })
    }} />
    {[...positions].map(([key, items]) => <AccessibleCircleMarker accessibleLabel={`${items.length} relações por estabelecimento neste local. Abrir popup`} key={key} center={[items[0].establishment.geolocation.latitude!, items[0].establishment.geolocation.longitude!]} radius={items.length > 1 ? 10 : 7} pathOptions={{ color: '#173f37', fillColor: '#eeb64b', fillOpacity: 1 }}>
      <Tooltip>{items.length} {items.length === 1 ? 'relação' : 'relações'} neste local. Clique para ver sócios e estabelecimentos.</Tooltip>
      <Popup><div className="partner-map-popup"><strong>{items.length} {items.length === 1 ? 'relação publicada' : 'relações publicadas'}</strong><p>A localização pertence ao estabelecimento.</p>{items.map((item, index) => <article key={`${item.identity.release}-${item.identity.participation_id}-${item.identity.establishment_id}-${index}`}>
        <strong>{item.partner.nome_socio_ou_razao_social}</strong><br />{item.partner.cnpj_cpf_socio ?? 'Documento não informado'}<br />
        {item.establishment.nome_fantasia || item.company.razao_social}<br />CNPJ {item.establishment.cnpj}<br />
        {item.establishment.municipio?.descricao ?? 'Município não informado'} / {item.establishment.uf}<br />
        <small>Localização aproximada pelo CEP · participação {item.participation.id}</small><br />
        <PartnerMapLinks item={item} returnTo={returnTo} />
      </article>)}</div></Popup>
    </AccessibleCircleMarker>)}
  </MapContainer>
}
