"use client";

import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Default Leaflet marker icons reference bundled assets that don't resolve
// under Next.js's asset pipeline — self-hosted copies in public/leaflet/
// (copied from the installed leaflet package) instead of hotlinking
// unpkg.com, which made every map render depend on a third-party CDN
// being up and reachable, and it isn't cacheable the same way a same-origin
// asset is.
const icon = L.icon({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
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
