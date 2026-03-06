'use client';
import { useEffect, useRef } from 'react';
import type { Sighting } from '@/types';

interface LivePos { lat: number; lng: number; accuracy?: number; }

interface Props {
  sightings: Sighting[];
  livePos?: LivePos | null;
  height?: string;
  label?: string;
}

// Fix Leaflet default marker icon paths (common blank-map cause)
function fixLeafletIcons(L: typeof import('leaflet')) {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

function makeBlackIcon(L: typeof import('leaflet')) {
  return L.divIcon({
    html: `<div style="
      width:14px;height:14px;
      background:#000;border:2px solid #fff;
      border-radius:50%;
      box-shadow:0 2px 6px rgba(0,0,0,0.5);
    "></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function makeLiveIcon(L: typeof import('leaflet')) {
  return L.divIcon({
    html: `<div style="
      width:18px;height:18px;
      background:#000;border:3px solid #fff;
      border-radius:50%;
      box-shadow:0 0 0 5px rgba(0,0,0,0.2);
      animation:pulse 1.2s ease infinite;
    "></div>`,
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function LiveMap({ sightings, livePos, height = '400px', label }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const liveMarkerRef = useRef<import('leaflet').Marker | null>(null);
  const liveCircleRef = useRef<import('leaflet').Circle | null>(null);

  // Init map once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;

    // Dynamic import — this is what fixes the blank map (no SSR)
    import('leaflet').then((L) => {
      if (!isMounted || !containerRef.current) return;
      if (mapRef.current) return; // already initialised

      fixLeafletIcons(L);

      // Default center: middle of India
      const defaultLat = 20.5937;
      const defaultLng = 78.9629;
      const defaultZoom = 5;

      const validSightings = sightings.filter(s => s.lat != null && s.lng != null);

      let centerLat = defaultLat;
      let centerLng = defaultLng;
      let zoom = defaultZoom;

      if (validSightings.length > 0) {
        centerLat = validSightings.reduce((s, x) => s + x.lat!, 0) / validSightings.length;
        centerLng = validSightings.reduce((s, x) => s + x.lng!, 0) / validSightings.length;
        zoom = validSightings.length === 1 ? 14 : 11;
      }

      const map = L.map(containerRef.current!, {
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true,
      }).setView([centerLat, centerLng], zoom);

      // OpenStreetMap tiles — free, no API key
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const blackIcon = makeBlackIcon(L);

      // Plot each sighting
      validSightings.forEach((s, i) => {
        const marker = L.marker([s.lat!, s.lng!], { icon: blackIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family:monospace;font-size:12px;min-width:190px;line-height:1.5">
            <div style="font-weight:700;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:6px">
              Sighting #${i + 1}
            </div>
            <div style="color:#666;font-size:11px;margin-bottom:4px">${fmt(s.timestamp)}</div>
            <div style="margin-bottom:4px"><strong>${s.reporter_name || 'Anonymous'}</strong></div>
            <div>${s.description}</div>
            ${s.accuracy ? `<div style="color:#999;font-size:10px;margin-top:6px">GPS: ±${Math.round(s.accuracy)}m accuracy</div>` : ''}
          </div>
        `, { maxWidth: 280 });

        // Accuracy circle
        if (s.accuracy && s.accuracy < 500) {
          L.circle([s.lat!, s.lng!], {
            radius: s.accuracy,
            color: '#000',
            fillColor: '#000',
            fillOpacity: 0.08,
            weight: 1,
          }).addTo(map);
        }
      });

      // Fit bounds to show all sightings
      if (validSightings.length > 1) {
        try {
          const bounds = L.latLngBounds(validSightings.map(s => [s.lat!, s.lng!]));
          map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
        } catch {}
      }

      mapRef.current = map;
    });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only run once — sightings are plotted on init

  // Update live position without re-initialising map
  useEffect(() => {
    if (!mapRef.current) return;

    import('leaflet').then((L) => {
      if (!mapRef.current) return;

      // Remove old live marker
      if (liveMarkerRef.current) { liveMarkerRef.current.remove(); liveMarkerRef.current = null; }
      if (liveCircleRef.current) { liveCircleRef.current.remove(); liveCircleRef.current = null; }

      if (!livePos?.lat || !livePos?.lng) return;

      const liveIcon = makeLiveIcon(L);
      liveMarkerRef.current = L.marker([livePos.lat, livePos.lng], { icon: liveIcon, zIndexOffset: 1000 })
        .addTo(mapRef.current);
      liveMarkerRef.current.bindPopup(`
        <div style="font-family:monospace;font-size:12px">
          <strong>📍 Your Live Location</strong>
          ${livePos.accuracy ? `<br><span style="color:#999;font-size:10px">±${Math.round(livePos.accuracy)}m</span>` : ''}
        </div>
      `);

      if (livePos.accuracy && livePos.accuracy < 1000) {
        liveCircleRef.current = L.circle([livePos.lat, livePos.lng], {
          radius: livePos.accuracy,
          color: '#000',
          fillColor: '#000',
          fillOpacity: 0.1,
          weight: 1,
          dashArray: '4',
        }).addTo(mapRef.current);
      }

      mapRef.current.panTo([livePos.lat, livePos.lng], { animate: true, duration: 0.5 });
    });
  }, [livePos?.lat, livePos?.lng]);

  const withCoords = sightings.filter(s => s.lat != null && s.lng != null);

  return (
    <div style={{ position: 'relative' }}>
      {/* Leaflet CSS loaded here so it never causes SSR mismatch */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div
        ref={containerRef}
        className="map-wrap"
        style={{ height }}
        aria-label="Sightings map"
      />
      {label && <div className="map-label">{label}</div>}
      {withCoords.length > 0 && (
        <div className="map-count">{withCoords.length}</div>
      )}
    </div>
  );
}
