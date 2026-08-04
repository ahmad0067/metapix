"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import { GpsInfo } from "@/lib/api";

// Leaflet's default marker icons reference image files by relative path,
// which breaks under Next.js bundling. Point them at the CDN instead.
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function MapView({ gps }: { gps: GpsInfo }) {
  if (!gps.hasGps || gps.latitude === null || gps.longitude === null) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-base-700 bg-base-900 text-ink-low">
        No GPS coordinates embedded in this image.
      </div>
    );
  }

  const position: [number, number] = [gps.latitude, gps.longitude];

  return (
    <div className="overflow-hidden rounded-xl border border-base-700">
      <MapContainer center={position} zoom={13} scrollWheelZoom={false} className="h-72 w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle center={position} radius={150} pathOptions={{ color: "#2DD4BF", fillOpacity: 0.1 }} />
        <Marker position={position} icon={markerIcon}>
          <Popup>
            Photo taken here
            <br />
            {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
