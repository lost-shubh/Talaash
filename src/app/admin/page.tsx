'use client';
import { useState, useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ReportModal } from '@/components/ui/ReportModal';

const LiveMap = lazy(() => import('@/components/map/LiveMap'));

function fmtDate(s: string) { return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
function fmtDT(s: string) { return new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [sec, setSec] = useState('pending');
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [sightings, setSightings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);

  async function load() {
    try {
      const [rAll, rPend, usrs, audit, sight] = await Promise.all([
        fetch('/api/reports?status=all&pageSize=200').then(r => r.json()),
        fetch('/api/reports?status=pending&pageSize=200').then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
        fetch('/api/reports?status=all&pageSize=1').then(r => r.json()), // placeholder
        fetch('/api/sightings').then(r => r.json()),
      ]);
      setReports(rAll.items || []);
      setUsers(Array.isArray(usrs) ? usrs : []);
      setSightings(Array.isArray(sight) ? sight : []);
    } catch (e) {
      toast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadAudit() {
    // Fake from sightings + reports for now; in real app, add audit API
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login?from=/admin'); return; }
    if (user.role !== 'admin') { router.push('/'); return; }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function changeStatus(id: string, status: string, notes = '') {
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error();
      toast(`Status updated: ${status}`, 'success');
      setSelId(null);
      load();
    } catch { toast('Failed to update status', 'error'); }
  }

  async function delReport(id: string) {
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast('Report deleted', 'success');
      setSelId(null);
      load();
    } catch { toast('Failed to delete report', 'error'); }
  }

  const pending  = reports.filter(r => r.status === 'pending');
  const missing  = reports.filter(r => r.status === 'missing');
  const found    = reports.filter(r => r.status === 'found');
  const rejected = reports.filter(r => r.status === 'rejected');

  function listFor(s: string) {
    return s === 'pending' ? pending : s === 'missing' ? missing : s === 'found' ? found : s === 'rejected' ? rejected : reports;
  }

  const NAV = [
    { k: 'pending',  l: 'Pending Review', b: pending.length  },
    { k: 'all',      l: 'All Reports',    b: reports.length  },
    { k: 'missing',  l: 'Active Missing', b: missing.length  },
    { k: 'found',    l: 'Found',          b: found.length    },
    { k: 'rejected', l: 'Rejected',       b: rejected.length },
    { k: 'users',    l: 'Users',          b: users.length    },
    { k: 'sightings',l: 'Sightings Map',  b: sightings.length},
    { k: 'stats',    l: 'Statistics',     b: null            },
  ];

  if (authLoading || loading) {
    return (
      <div className="empty" style={{ marginTop: 80 }}>
        <div className="empty-icon"><span className="sp" style={{ width: 48, height: 48, borderWidth: 4 }} /></div>
        <div className="empty-sub">Loading admin panel…</div>
      </div>
    );
  }

  return (
    <>
      <div className="admin-layout">
        {/* Sidebar */}
        <nav className="admin-sidebar" aria-label="Admin navigation">
          {NAV.map(({ k, l, b }) => (
            <div key={k} className={`a-nav${sec === k ? ' active' : ''}`} onClick={() => setSec(k)}>
              {l}
              {b !== null && <span className="a-badge">{b}</span>}
            </div>
          ))}
        </nav>

        {/* Content */}
        <div className="admin-content">

          {/* Users */}
          {sec === 'users' && (
            <>
              <h1 className="admin-title">USERS</h1>
              <p className="admin-sub">{users.length} registered users</p>
              <div className="table-wrap">
                <table>
                  <thead><tr>{['ID', 'Name', 'Email', 'Role', 'Joined'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {users.map((u: any) => (
                      <tr key={u.id}>
                        <td><code style={{ fontSize: '.6rem' }}>{u.id}</code></td>
                        <td><strong>{u.name}</strong></td>
                        <td>{u.email}</td>
                        <td><StatusBadge status={u.role} /></td>
                        <td>{fmtDate(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Sightings Map */}
          {sec === 'sightings' && (
            <>
              <h1 className="admin-title">SIGHTINGS MAP</h1>
              <p className="admin-sub">{sightings.length} total sightings — {sightings.filter((s: any) => s.lat).length} with GPS location</p>
              {sightings.filter((s: any) => s.lat).length > 0 ? (
                <>
                  <Suspense fallback={<div style={{ height: 480, background: 'var(--g100)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'var(--border)', fontSize: '.75rem' }}>Loading map…</div>}>
                    <LiveMap sightings={sightings.filter((s: any) => s.lat)} height="480px" label="All Sightings — India" />
                  </Suspense>
                  <div style={{ marginTop: 28 }}>
                    <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '1.5rem', marginBottom: 14 }}>ALL SIGHTINGS</h3>
                    <div className="table-wrap">
                      <table>
                        <thead><tr>{['Time', 'Reporter', 'Case', 'Description', 'Coordinates'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                        <tbody>
                          {[...sightings].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((s: any) => (
                            <tr key={s.id}>
                              <td>{fmtDT(s.timestamp)}</td>
                              <td>{s.reporter_name || 'Anonymous'}</td>
                              <td><strong>{s.report_name}</strong><br /><code style={{ fontSize: '.6rem' }}>{s.case_number}</code></td>
                              <td><div style={{ maxWidth: 280, fontSize: '.7rem' }}>{s.description}</div></td>
                              <td>{s.lat ? <code style={{ fontSize: '.6rem' }}>{s.lat.toFixed(5)}, {s.lng.toFixed(5)}</code> : <span style={{ color: 'var(--g400)' }}>—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty">
                  <div className="empty-icon">🗺</div>
                  <div className="empty-title">No Location Data</div>
                  <div className="empty-sub">No sightings with GPS coordinates have been submitted yet.</div>
                </div>
              )}
            </>
          )}

          {/* Stats */}
          {sec === 'stats' && (
            <>
              <h1 className="admin-title">STATISTICS</h1>
              <p className="admin-sub">Platform activity overview</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', border: '2px solid var(--black)', marginBottom: 32 }}>
                {[
                  { l: 'Total Reports', v: reports.length, s: 'all time' },
                  { l: 'Active Missing', v: missing.length, s: 'current' },
                  { l: 'Found', v: found.length, s: reports.length ? Math.round(found.length / reports.length * 100) + '% recovery' : '—' },
                  { l: 'Pending Review', v: pending.length, s: 'awaiting approval' },
                  { l: 'Total Users', v: users.length, s: 'registered' },
                  { l: 'Total Sightings', v: sightings.length, s: 'community reports' },
                ].map(({ l, v, s }) => (
                  <div key={l} style={{ borderRight: '2px solid var(--black)', borderBottom: '2px solid var(--black)', padding: 20 }}>
                    <div style={{ fontFamily: 'var(--font-d)', fontSize: '3.5rem', lineHeight: 1 }}>{v}</div>
                    <div style={{ fontFamily: 'var(--font-m)', fontSize: '.62rem', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 4 }}>{l}</div>
                    <div style={{ fontSize: '.6rem', color: 'var(--g500)', marginTop: 2 }}>{s}</div>
                  </div>
                ))}
              </div>
              <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '1.5rem', marginBottom: 14 }}>CASES BY STATE</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr>{['State', 'Missing', 'Found', 'Total'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {Object.entries(
                      reports.filter(r => r.status !== 'pending' && r.status !== 'rejected').reduce((acc: any, r) => {
                        if (!acc[r.state]) acc[r.state] = { missing: 0, found: 0 };
                        if (r.status === 'missing') acc[r.state].missing++;
                        if (r.status === 'found') acc[r.state].found++;
                        return acc;
                      }, {})
                    ).sort((a: any, b: any) => (b[1].missing + b[1].found) - (a[1].missing + a[1].found)).map(([state, c]: any) => (
                      <tr key={state}>
                        <td>{state}</td>
                        <td>{c.missing}</td>
                        <td>{c.found}</td>
                        <td><strong>{c.missing + c.found}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Reports table */}
          {['pending', 'all', 'missing', 'found', 'rejected'].includes(sec) && (
            <>
              <h1 className="admin-title">{sec.toUpperCase()} REPORTS</h1>
              <p className="admin-sub">{listFor(sec).length} record{listFor(sec).length !== 1 ? 's' : ''}</p>
              {pending.length > 0 && sec !== 'pending' && (
                <div className="alert alert-warn" style={{ marginBottom: 20 }}>
                  <span className="alert-icon">⚠</span>
                  <span>{pending.length} report{pending.length !== 1 ? 's' : ''} awaiting review</span>
                </div>
              )}
              {listFor(sec).length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">✓</div>
                  <div className="empty-title">{sec === 'pending' ? 'All clear' : 'No records'}</div>
                  <div className="empty-sub">{sec === 'pending' ? 'No pending reports.' : 'Nothing in this category.'}</div>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>{['Case #', 'Name', 'Age', 'Last Seen', 'State', 'Status', 'Filed', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {[...listFor(sec)].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((r: any) => (
                        <tr key={r.id}>
                          <td><code style={{ fontSize: '.6rem' }}>{r.case_number}</code></td>
                          <td><strong>{r.name}</strong></td>
                          <td>{r.age}</td>
                          <td>{fmtDate(r.last_seen)}</td>
                          <td>{r.state}</td>
                          <td><StatusBadge status={r.status} /></td>
                          <td>{fmtDate(r.created_at)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              <button className="btn btn-sm" onClick={() => setSelId(r.id)}>Review</button>
                              {r.status === 'pending' && (
                                <>
                                  <button className="btn btn-sm btn-solid" onClick={() => changeStatus(r.id, 'missing', 'Approved')} aria-label="Approve">✓</button>
                                  <button className="btn btn-sm btn-danger" onClick={() => changeStatus(r.id, 'rejected', 'Rejected')} aria-label="Reject">✗</button>
                                </>
                              )}
                              {r.status === 'missing' && <button className="btn btn-sm" onClick={() => changeStatus(r.id, 'found')}>Found</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selId && (
        <ReportModal
          reportId={selId}
          onClose={() => setSelId(null)}
          isAdmin
          onStatusChange={changeStatus}
          onDelete={delReport}
        />
      )}
    </>
  );
}
