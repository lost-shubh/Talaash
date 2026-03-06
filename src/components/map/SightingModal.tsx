'use client';
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import type { Report, Sighting } from '@/types';
import { useToast } from '@/hooks/useToast';

// Dynamic import of map (no SSR)
const LiveMap = lazy(() => import('@/components/map/LiveMap'));

interface LivePos { lat: number; lng: number; accuracy?: number; }

interface Props {
  report: Report;
  onClose: () => void;
  onSubmitted: (s: Sighting) => void;
}

export function SightingModal({ report, onClose, onSubmitted }: Props) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [pos, setPos] = useState<LivePos | null>(null);
  const [locErr, setLocErr] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [watching, setWatching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  function getOnce() {
    if (!navigator.geolocation) { setLocErr('Geolocation not supported by your browser.'); return; }
    setLocLoading(true); setLocErr('');
    navigator.geolocation.getCurrentPosition(
      p => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }); setLocLoading(false); },
      e => { setLocErr('Could not get location: ' + e.message); setLocLoading(false); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  function startLive() {
    if (!navigator.geolocation) { setLocErr('Geolocation not supported.'); return; }
    setLocErr(''); setWatching(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      p => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      e => { setLocErr('Live tracking error: ' + e.message); setWatching(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function stopLive() {
    if (watchIdRef.current != null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    setWatching(false);
  }

  async function submit() {
    if (!desc.trim() || desc.trim().length < 10) {
      toast('Please describe what you saw (min 10 characters)', 'error'); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/sightings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: report.id,
          reporter_name: name.trim() || null,
          description: desc.trim(),
          lat: pos?.lat ?? null,
          lng: pos?.lng ?? null,
          accuracy: pos?.accuracy ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      toast('Sighting reported! Thank you for helping.', 'success', 5000);
      onSubmitted(data.sighting);
      onClose();
    } catch (e: any) {
      toast(e.message || 'Error submitting sighting', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const mockSighting: Sighting[] = pos ? [{
    id: 'live', report_id: report.id, description: 'Your location',
    lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, timestamp: new Date().toISOString(),
  }] : [];

  return (
    <div className="modal-overlay" onClick={e => (e.target as HTMLElement).classList.contains('modal-overlay') && onClose()} role="dialog" aria-modal="true">
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-hdr">
          <div>
            <div className="modal-title">REPORT SIGHTING</div>
            <div className="modal-sub">Missing: {report.name} — {report.case_number}</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          <div className="alert alert-warn" style={{ marginBottom: 20 }}>
            <span className="alert-icon">⚠</span>
            <span>
              Do <strong>NOT</strong> approach anyone in a dangerous situation.
              Call <strong>100 (Police)</strong> immediately if someone is in danger.
            </span>
          </div>

          {/* Description */}
          <div className="fg">
            <label className="flabel" htmlFor="sig_desc">What did you see? <span className="req">*</span></label>
            <textarea
              id="sig_desc" className="ftextarea" rows={4}
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Where and when, what they were wearing, who they were with, what they were doing..."
            />
            <p className="fhint">Be specific — street name, landmark, time, clothing, behaviour</p>
          </div>

          {/* Name */}
          <div className="fg">
            <label className="flabel" htmlFor="sig_name">Your Name (optional)</label>
            <input
              id="sig_name" className="finput"
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Leave blank to report anonymously"
            />
          </div>

          {/* Location */}
          <div className="fsec-label" style={{ fontSize: '1.2rem', marginBottom: 10 }}>📍 Share Your Location</div>
          <p className="fhint" style={{ marginBottom: 12 }}>
            Sharing GPS helps authorities pinpoint the sighting. Strongly recommended.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            {!watching && (
              <button className="btn btn-sm" onClick={getOnce} disabled={locLoading}>
                {locLoading ? <><span className="sp" /> Locating…</> : '📍 Get My Location'}
              </button>
            )}
            {!watching
              ? <button className="btn btn-sm btn-solid" onClick={startLive}>🔴 Start Live Tracking</button>
              : <button className="btn btn-sm btn-danger" onClick={stopLive}><span className="live-dot" /> Stop Tracking</button>
            }
            {pos && <button className="btn btn-sm" onClick={() => { setPos(null); stopLive(); }}>✕ Clear</button>}
          </div>

          {locErr && (
            <div className="alert alert-err" style={{ marginBottom: 12 }}>
              <span className="alert-icon">⚠</span><span>{locErr}</span>
            </div>
          )}

          {pos && (
            <>
              <div className="loc-status" style={{ marginBottom: 12 }}>
                {watching
                  ? <span className="live-badge"><span className="live-dot" /> Live tracking active</span>
                  : <span>📍 Location captured</span>
                }
                <span style={{ marginLeft: 'auto', fontSize: '.6rem', color: 'var(--g500)' }}>
                  {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)} · ±{Math.round(pos.accuracy || 0)}m
                </span>
              </div>
              <Suspense fallback={<div style={{ height: 200, background: 'var(--g100)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'var(--border)', fontSize: '.7rem', color: 'var(--g500)' }}>Loading map…</div>}>
                <LiveMap sightings={mockSighting} livePos={pos} height="200px" label="Your Location" />
              </Suspense>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-solid btn-lg" onClick={submit} disabled={submitting}>
            {submitting ? <><span className="sp sp-w" /> Submitting…</> : '✓ Submit Sighting'}
          </button>
          <button className="btn btn-sm" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
