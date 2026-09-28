import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export default function ApproximatePostalMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  return <MapContainer className="establishment-geolocation-map" center={[latitude, longitude]} zoom={14} scrollWheelZoom={false}>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <CircleMarker center={[latitude, longitude]} radius={8} pathOptions={{ color: '#176f5e', fillColor: '#eeb64b', fillOpacity: 1 }}><Popup>Localização aproximada pelo CEP</Popup></CircleMarker>
  </MapContainer>
}
