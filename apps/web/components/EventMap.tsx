"use client";

import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Default Leaflet marker icons reference bundled assets that don't resolve
// under Next.js's asset pipeline — point them at the CDN copies instead.
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function EventMap({ latitude, longitude, radiusM }: { latitude: number; longitude: number; radiusM: number }) {
  return (
    <div className="h-64 w-full overflow-hidden rounded-xl border border-white/10">
      <MapContainer center={[latitude, longitude]} zoom={16} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <Marker position={[latitude, longitude]} icon={icon} />
        <Circle center={[latitude, longitude]} radius={radiusM} pathOptions={{ color: "#ff2d55", fillOpacity: 0.08 }} />
      </MapContainer>
    </div>
  );
}
