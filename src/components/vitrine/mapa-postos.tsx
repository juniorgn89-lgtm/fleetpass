'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

/**
 * Mapa somente leitura com vários postos.
 *
 * Não reaproveita `ui/map-picker.tsx` de propósito: aquele é um EDITOR de um
 * único pino (exige onChange, marcador arrastável, clique reposiciona, zoom
 * fixo). Aqui nada é editável e o enquadramento acompanha o conjunto.
 *
 * Deve ser carregado com dynamic(..., { ssr: false }) — leaflet precisa de window.
 */

export interface PontoMapa {
  postoId: string
  nome: string
  cidade: string
  estado: string
  lat: number | null
  lng: number | null
}

const CENTRO_BRASIL: [number, number] = [-15.78, -47.93]

const pino = L.divIcon({
  html: `<div style="
    width:26px;height:26px;border-radius:50% 50% 50% 0;
    background:#0f766e;transform:rotate(-45deg);
    border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);
  "></div>`,
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
})

/** Enquadra todos os pontos; com um só, centraliza sem exagerar no zoom. */
function Enquadrar({ pontos }: { pontos: [number, number][] }) {
  const map = useMap()

  useEffect(() => {
    if (pontos.length === 0) return
    if (pontos.length === 1) {
      map.setView(pontos[0], 13)
      return
    }
    map.fitBounds(L.latLngBounds(pontos), { padding: [40, 40], maxZoom: 13 })
  }, [pontos, map])

  return null
}

interface Props {
  postos: PontoMapa[]
  onSelecionar?: (postoId: string) => void
  className?: string
}

export default function MapaPostos({ postos, onSelecionar, className }: Props) {
  // Memoizados de propósito: sem isso, `pontos` seria um array novo a cada
  // render, o efeito de Enquadrar rodaria sempre e jogaria fora o zoom/pan que
  // o usuário acabou de fazer (clicar num pino já bastava para o mapa saltar).
  const comCoordenada = useMemo(
    () => postos.filter(
      (p): p is PontoMapa & { lat: number; lng: number } => p.lat != null && p.lng != null,
    ),
    [postos],
  )
  const pontos = useMemo(
    () => comCoordenada.map((p) => [p.lat, p.lng] as [number, number]),
    [comCoordenada],
  )

  return (
    <MapContainer
      center={pontos[0] ?? CENTRO_BRASIL}
      zoom={pontos.length ? 12 : 4}
      scrollWheelZoom
      className={className}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Enquadrar pontos={pontos} />
      {comCoordenada.map((p) => (
        <Marker
          key={p.postoId}
          position={[p.lat, p.lng]}
          icon={pino}
          eventHandlers={onSelecionar ? { click: () => onSelecionar(p.postoId) } : undefined}
        >
          <Popup>
            <span className="font-semibold">{p.nome}</span>
            <br />
            {p.cidade} · {p.estado}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
