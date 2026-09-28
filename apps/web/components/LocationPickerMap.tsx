"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const icon = L.icon({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// Re-centres only when the parent bumps focusKey (search pick / GPS lock),
// never while the organizer is dragging or panning by hand.
function Focus({ lat, lng, radius, focusKey }: { lat: number | null; lng: number | null; radius: number; focusKey: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat == null || lng == null || focusKey === 0) return;
    const bounds = L.latLng(lat, lng).toBounds(Math.max(radius, 60) * 2.6);
    map.flyToBounds(bounds, { duration: 0.8, maxZoom: 18 });
  }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function LocationPickerMap({
  lat,
  lng,
  radius,
  precise,
  focusKey,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  radius: number;
  precise: boolean;
  focusKey: number;
  onPick: (lat: number, lng: number) => void;
}) {
  const has = lat != null && lng != null;
  const color = precise ? "#22e2f5" : "#fbbf24";
  return (
    <MapContainer
      center={has ? [lat!, lng!] : [20, 0]}
      zoom={has ? 17 : 2}
      style={{ height: "100%", width: "100%", background: "#0b0d12" }}
      scrollWheelZoom={false}
      attributionControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        subdomains="abcd"
        maxZoom={20}
      />
      <ClickToPlace onPick={onPick} />
      <Focus lat={lat} lng={lng} radius={radius} focusKey={focusKey} />
      {has && (
        <>
          <Circle center={[lat!, lng!]} radius={radius} pathOptions={{ color, weight: 1.5, fillColor: color, fillOpacity: 0.12, dashArray: precise ? undefined : "6 6" }} />
          <Marker
            position={[lat!, lng!]}
            icon={icon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const p = (e.target as L.Marker).getLatLng();
                onPick(p.lat, p.lng);
              },
            }}
          />
        </>
      )}
    </MapContainer>
  );
}
