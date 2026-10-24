// Lazy-loaded (Home imports it with React.lazy) so Leaflet stays out of the main bundle.
// Leaflet's stylesheet is imported once in src/main.tsx.
import { divIcon, latLngBounds } from 'leaflet'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { useNavigate } from 'react-router'
import { cn } from '@/lib/cn'
import type { CartWithSpot } from '@/types/app'
import { PIN, TINT } from './tints'

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

function pin(cart: CartWithSpot) {
  return divIcon({
    className: '', // drop Leaflet's white default box
    iconSize: undefined,
    iconAnchor: [8, 8],
    html: `<span class="${cn(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-0.5 pr-2.5 pl-1 text-[13px] font-semibold',
      TINT[cart.tint],
      !cart.is_open && 'opacity-60',
    )}"><span class="${cn('size-3.5 rounded-full ring-2 ring-white', PIN[cart.tint])}"></span>${escape(cart.name)}</span>`,
  })
}

export interface CartsMapProps {
  carts: readonly CartWithSpot[]
}

/** A small, still overview of the carts (~180px). Tapping a pin opens that cart's menu. */
export default function CartsMap({ carts }: CartsMapProps) {
  const navigate = useNavigate()
  const placed = carts.filter((c) => c.spot)
  // MapContainer reads bounds once, on mount.
  const bounds = latLngBounds(placed.map((c) => [c.spot!.lat, c.spot!.lng])).pad(0.35)

  return (
    <div className="isolate h-[180px] overflow-hidden rounded-card bg-raised" aria-label="Map of the carts" role="region">
      <MapContainer
        bounds={bounds}
        className="size-full"
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={false}
        touchZoom={false}
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        attributionControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {placed.map((c) => (
          <Marker
            key={c.id}
            position={[c.spot!.lat, c.spot!.lng]}
            icon={pin(c)}
            title={c.is_open ? `${c.name}: order here` : `${c.name}: closed`}
            keyboard={c.is_open}
            eventHandlers={{ click: () => c.is_open && navigate(`/order?cart=${c.id}`) }}
          />
        ))}
      </MapContainer>
    </div>
  )
}
