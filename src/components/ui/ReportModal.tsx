'use client';
import { useState, useEffect, lazy, Suspense } from 'react';
import type { Report, Sighting } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SightingModal } from '@/components/map/SightingModal';
import { SightingsMapModal } from '@/components/map/SightingsMapModal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtDT(s: string) {
  return new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function daysSince(s: string) {
  return Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
}

const F = ({ label, val }: { label: string; val: React.ReactNode }) => (
  <div className="mfield">
    <div className="mfield-lbl">{label}</div>
    <div className="mfield-val">{val}</div>
  </div>
);

interface Props {
  reportId: string;
  onClose: () => void;
  isAdmin?: boolean;
  onStatusChange?: (id: string, status: string, notes?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function ReportModal({ reportId, onClose, isAdmin, onStatusChange, onDelete }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(false);
  const [showSighting, setShowSighting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/reports/${reportId}`);
      if (!res.ok) { toast('Report not found', 'error'); onClose(); return; }
      const data = await res.json();
      setReport(data);
      setAdminNotes(data.admin_notes || '');
    } catch {
      toast('Failed to load report', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function saveNotes() {
    if (!report) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: adminNotes }),
      });
      if (!res.ok) throw new Error();
      toast('Notes saved', 'success');
    } catch { toast('Failed to save notes', 'error'); }
    setSavingNotes(false);
  }

  if (loading || !report) {
    return (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal" style={{ maxWidth: 600 }}>
          <div style={{ padding: 60, textAlign: 'center' }}>
            <span className="sp" /><br /><br />
            <span style={{ fontSize: '.7rem', color: 'var(--g500)' }}>Loading report…</span>
          </div>
        </div>
      </div>
    );
  }

  const sightings: Sighting[] = report.sightings || [];
  const photos = report.photos || [];
  const showContact = !!user;

  return (
    <>
      <div
        className="modal-overlay"
        onClick={e => (e.target as HTMLElement).classList.contains('modal-overlay') && onClose()}
        role="dialog" aria-modal="true" aria-labelledby="modal-name"
      >
        <div className="modal" style={{ maxWidth: 720 }}>
          <div className="modal-hdr">
            <div>
              <div id="modal-name" className="modal-title">{report.name}</div>
              <div className="modal-sub">{report.case_number} · {daysSince(report.last_seen)} days</div>
            </div>
            <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
          </div>

          <div className="modal-body">
            {/* Photos */}
            {photos.length > 0 && (
              <div className="modal-photos">
                {photos.map(p => (
                  <img key={p.id} className="modal-photo" src={p.data} alt={`Photo of ${report.name}`} />
                ))}
              </div>
            )}

            <div className="detail-grid">
              <div>
                <F label="Case Number" val={<strong>{report.case_number}</strong>} />
                <F label="Status" val={<StatusBadge status={report.status} />} />
                <F label="Age / Gender" val={`${report.age} years · ${report.gender}`} />
                <F label="Category" val={report.report_type.toUpperCase()} />
              </div>
              <div>
                <F label="Last Seen" val={fmtDate(report.last_seen)} />
                <F label="Location" val={report.location} />
                <F label="State" val={report.state} />
                <F label="Filed On" val={fmtDT(report.created_at)} />
              </div>
            </div>

            <F label="Circumstances" val={report.description} />
            <F label="Physical Description" val={report.physical_desc} />
            {report.identifying_marks && <F label="Identifying Marks" val={report.identifying_marks} />}

            {/* Contact */}
            {showContact ? (
              <div className="mfield">
                <div className="mfield-lbl">Contact Person</div>
                <div className="mfield-val">
                  {report.contact_name} ({report.contact_relation})<br />
                  <a href={`tel:${report.contact_phone}`} style={{ color: 'inherit', fontWeight: 700 }}>
                    {report.contact_phone}
                  </a>
                </div>
              </div>
            ) : (
              <div className="alert alert-warn">
                <span className="alert-icon">🔒</span>
                <span>Contact details hidden. <a href="/login" style={{ fontWeight: 700 }}>Login</a> to view.</span>
              </div>
            )}

            {isAdmin && report.admin_notes && (
              <div className="alert alert-warn" style={{ marginTop: 12 }}>
                <span className="alert-icon">📋</span>
                <span><strong>Admin Note: </strong>{report.admin_notes}</span>
              </div>
            )}

            {/* Sightings Section */}
            {report.status === 'missing' && (
              <div style={{ marginTop: 20, borderTop: 'var(--border)', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: '1.3rem', letterSpacing: '.05em' }}>
                    SIGHTINGS
                    <span style={{ fontFamily: 'var(--font-m)', fontSize: '.72rem', fontWeight: 400, color: 'var(--g500)', marginLeft: 8 }}>
                      {sightings.length > 0 ? `${sightings.length} reported` : 'None yet'}
                    </span>
                  </div>
                  {sightings.length > 0 && (
                    <button className="btn btn-sm" onClick={() => setShowMap(true)}>🗺 View on Map</button>
                  )}
                </div>

                {sightings.length > 0 && (
                  <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 12 }}>
                    {[...sightings]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 3)
                      .map(s => (
                        <div key={s.id} className="sighting-item">
                          <div className="sighting-dot" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '.78rem', lineHeight: 1.5 }}>{s.description}</div>
                            <div className="sighting-meta">
                              {s.reporter_name || 'Anonymous'} · {fmtDT(s.timestamp)}
                              {s.lat ? ' · 📍 GPS captured' : ' · No location'}
                            </div>
                          </div>
                        </div>
                      ))}
                    {sightings.length > 3 && (
                      <div style={{ fontSize: '.62rem', color: 'var(--g500)', padding: '4px 0' }}>
                        + {sightings.length - 3} more — click View on Map
                      </div>
                    )}
                  </div>
                )}

                {sightings.length === 0 && (
                  <div style={{ fontSize: '.73rem', color: 'var(--g500)', marginBottom: 12, padding: '10px 0' }}>
                    No sightings reported yet. If you have seen this person, please report below.
                  </div>
                )}

                <button className="btn btn-solid btn-sm" onClick={() => setShowSighting(true)}>
                  👁 I Saw This Person
                </button>
              </div>
            )}

            {/* Admin notes editor */}
            {isAdmin && (
              <div style={{ marginTop: 20, borderTop: 'var(--border)', paddingTop: 16 }}>
                <label className="flabel" style={{ marginBottom: 8 }}>Admin Notes (internal only)</label>
                <textarea
                  className="ftextarea" rows={3} value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Verification details, police case no., actions taken…"
                />
                <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={saveNotes} disabled={savingNotes}>
                  {savingNotes ? 'Saving…' : 'Save Notes'}
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="modal-actions">
            {isAdmin && report.status === 'pending' && (
              <>
                <button className="btn btn-solid btn-sm" onClick={() => onStatusChange?.(report.id, 'missing')}>✓ Approve</button>
                <button className="btn btn-sm btn-danger" onClick={() => onStatusChange?.(report.id, 'rejected')}>✗ Reject</button>
              </>
            )}
            {isAdmin && report.status === 'missing' && (
              <button className="btn btn-sm" onClick={() => onStatusChange?.(report.id, 'found')}>Mark as Found</button>
            )}
            {isAdmin && report.status === 'found' && (
              <button className="btn btn-sm" onClick={() => onStatusChange?.(report.id, 'missing')}>Re-open Case</button>
            )}
            {isAdmin && !confirmDel && (
              <button className="btn btn-sm btn-danger" style={{ marginLeft: 'auto' }} onClick={() => setConfirmDel(true)}>
                🗑 Delete
              </button>
            )}
            {isAdmin && confirmDel && (
              <>
                <span style={{ fontSize: '.7rem', color: 'var(--red)', marginLeft: 'auto', alignSelf: 'center' }}>Confirm delete?</span>
                <button className="btn btn-sm btn-danger" onClick={() => onDelete?.(report.id)}>Yes, Delete</button>
                <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>Cancel</button>
              </>
            )}
            <button className="btn btn-sm" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>

      {showSighting && (
        <SightingModal
          report={report}
          onClose={() => setShowSighting(false)}
          onSubmitted={s => { load(); }}
        />
      )}
      {showMap && (
        <SightingsMapModal
          report={report}
          sightings={sightings}
          onClose={() => setShowMap(false)}
        />
      )}
    </>
  );
}
