import { useEffect, useMemo, useRef } from "react";
import "@/components/map/map-styles.css";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationMapProps {
  lat: number;
  lng: number;
  onMove: (lat: number, lng: number) => void;
}

function DraggableMarker({ lat, lng, onMove }: LocationMapProps) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const pos = marker.getLatLng();
        onMove(pos.lat, pos.lng);
      }
    },
  }), [onMove]);

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={[lat, lng]}
      ref={markerRef}
    />
  );
}

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMapEvents({});
  const prev = useRef({ lat, lng });

  useEffect(() => {
    if (prev.current.lat !== lat || prev.current.lng !== lng) {
      map.setView([lat, lng], map.getZoom());
      prev.current = { lat, lng };
    }
  }, [lat, lng, map]);

  return null;
}

export default function LocationMap({ lat, lng, onMove }: LocationMapProps) {
  return (
    <div className="h-[280px] rounded-xl overflow-hidden border">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DraggableMarker lat={lat} lng={lng} onMove={onMove} />
        <MapRecenter lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}
