'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'

const pinIcon = L.divIcon({
  html: `<div style="
    width:28px;height:28px;border-radius:50% 50% 50% 0;
    background:#0f766e;transform:rotate(-45deg);
    border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);
  "></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onChange(e.latlng.lat, e.latlng.lng) },
  })
  return null
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  const prev = useRef<[number, number] | null>(null)
  useEffect(() => {
    if (prev.current?.[0] === lat && prev.current?.[1] === lng) return
    prev.current = [lat, lng]
    map.setView([lat, lng], 16, { animate: true })
  }, [lat, lng, map])
  return null
}

interface Props {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
}

export function MapPicker({ lat, lng, onChange }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter lat={lat} lng={lng} />
      <ClickHandler onChange={onChange} />
      <Marker
        position={[lat, lng]}
        icon={pinIcon}
        draggable
        eventHandlers={{
          dragend(e) {
            const pos = (e.target as L.Marker).getLatLng()
            onChange(pos.lat, pos.lng)
          },
        }}
      />
    </MapContainer>
  )
}
