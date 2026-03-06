'use client';
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import type { Report, Sighting } from '@/types';

const LiveMap = lazy(() => import('@/components/map/LiveMap'));

interface LivePos { lat: number; lng: number; accuracy?: number; }

function fmtDT(ts: string) {
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface Props {
  report: Report;
  sightings: Sighting[];
  onClose: () => void;
}

export function SightingsMapModal({ report, sightings, onClose }: Props) {
  const [livePos, setLivePos] = useState<LivePos | null>(null);
  const [watching, setWatching] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [onClose]);

  function toggleLive() {
    if (watching) {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      setWatching(false); setLivePos(null);
    } else {
      if (!navigator.geolocation) { alert('Geolocation not supported.'); return; }
      setWatching(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        p => setLivePos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
        () => setWatching(false),
        { enableHighAccuracy: true }
      );
    }
  }

  const withCoords = sightings.filter(s => s.lat != null && s.lng != null);

  return (
    <div
      className="modal-overlay"
      onClick={e => (e.target as HTMLElement).classList.contains('modal-overlay') && onClose()}
      role="dialog" aria-modal="true"
    >
      <div className="modal" style={{ maxWidth: 820 }}>
        <div className="modal-hdr">
          <div>
            <div className="modal-title">SIGHTINGS MAP</div>
            <div className="modal-sub">
              {report.name} — {sightings.length} sighting{sightings.length !== 1 ? 's' : ''}, {withCoords.length} with GPS
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className={`btn btn-sm${watching ? ' btn-danger' : ''}`} onClick={toggleLive}>
              {watching ? <><span className="live-dot" /> Stop Live</> : '📍 My Location'}
            </button>
            <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <Suspense fallback={
          <div style={{ height: 460, background: 'var(--g100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', color: 'var(--g500)' }}>
            <span className="sp" style={{ marginRight: 10 }} />
            Loading map…
          </div>
        }>
          <LiveMap
            sightings={sightings}
            livePos={livePos}
            height="460px"
            label={`Sightings — ${report.name}`}
          />
        </Suspense>

        {/* Sightings list */}
        {sightings.length > 0 && (
          <div style={{ padding: '16px 24px', borderTop: 'var(--border)', maxHeight: 220, overflowY: 'auto' }}>
            <div style={{ fontSize: '.62rem', textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--g500)', marginBottom: 10, fontWeight: 700 }}>
              {sightings.length} Reported Sighting{sightings.length !== 1 ? 's' : ''}
            </div>
            {[...sightings]
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map(s => (
                <div key={s.id} className="sighting-item">
                  <div className="sighting-dot" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '.8rem', lineHeight: 1.5 }}>{s.description}</div>
                    <div className="sighting-meta">
                      {s.reporter_name || 'Anonymous'} · {fmtDT(s.timestamp)}
                      {s.lat ? ` · 📍 ${s.lat.toFixed(4)}, ${s.lng!.toFixed(4)}` : ' · No GPS'}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {withCoords.length === 0 && (
          <div style={{ padding: '20px 24px', borderTop: 'var(--border)', textAlign: 'center', fontSize: '.72rem', color: 'var(--g500)' }}>
            No sightings with GPS coordinates yet.
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
