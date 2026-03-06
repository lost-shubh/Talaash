'use client';
import { useState, useEffect } from 'react';
import { ReportCard } from '@/components/ui/ReportCard';
import { ReportModal } from '@/components/ui/ReportModal';
import { useRouter } from 'next/navigation';
import type { Report } from '@/types';

function Notice() {
  return (
    <div className="notice" aria-live="polite">
      ⚠ All reports are admin-verified before going public. AI matching is for assistance only — NOT official identification.{' '}
      <strong>Helpline: 1094 (Child) | 100 (Police) | 1091 (Women)</strong>
    </div>
  );
}

function Ticker({ reports }: { reports: Report[] }) {
  if (!reports.length) return null;
  const items = [...reports, ...reports];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {items.map((r, i) => (
          <span key={i} className="ticker-item">
            {r.name} — {r.age}y — {r.location} — {Math.floor((Date.now() - new Date(r.last_seen).getTime()) / 86400000)} days missing
          </span>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState({ missing: 0, found: 0, total: 0 });
  const [selId, setSelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports?status=missing&pageSize=50')
      .then(r => r.json())
      .then(data => {
        setReports(data.items || []);
        setLoading(false);
      });
    // Load stats
    Promise.all([
      fetch('/api/reports?status=missing&pageSize=1').then(r => r.json()),
      fetch('/api/reports?status=found&pageSize=1').then(r => r.json()),
      fetch('/api/reports?status=all&pageSize=1').then(r => r.json()),
    ]).then(([m, f, t]) => {
      setStats({ missing: m.total || 0, found: f.total || 0, total: t.total || 0 });
    });
  }, []);

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSelId(null);
    // Refresh
    fetch('/api/reports?status=missing&pageSize=50').then(r => r.json()).then(d => setReports(d.items || []));
  }

  return (
    <div style={{ flex: 1 }}>
      <Notice />
      <Ticker reports={reports.slice(0, 8)} />

      {/* Hero */}
      <div className="hero">
        <div>
          <h1 className="hero-title">
            FIND THE<br />MISSING
            <span className="accent">India's open-source missing person registry</span>
          </h1>
        </div>
        <div>
          <p className="hero-sub">
            Talaash is a free, open-source platform helping families find missing persons across India.
            Submit a report, search our database, or upload a photo to find possible matches.<br /><br />
            All reports are verified by administrators. Contact details are only shared with registered users.
          </p>
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-num">{loading ? '—' : stats.missing}</div>
              <div className="stat-lbl">Active Cases</div>
            </div>
            <div className="stat">
              <div className="stat-num">{loading ? '—' : stats.found}</div>
              <div className="stat-lbl">Found</div>
            </div>
            <div className="stat">
              <div className="stat-num">{loading ? '—' : stats.total}</div>
              <div className="stat-lbl">Total Reports</div>
            </div>
          </div>
          <div className="hero-actions">
            <button className="btn btn-lg btn-solid" onClick={() => router.push('/report')}>+ File a Report</button>
            <button className="btn btn-lg" onClick={() => router.push('/search')}>🔍 Search / Photo Match</button>
          </div>
        </div>
      </div>

      {/* Active Cases */}
      <div style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24, borderBottom: '2px solid var(--black)', paddingBottom: 10 }}>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '2rem' }}>ACTIVE CASES</h2>
          <span style={{ fontSize: '.7rem', color: 'var(--g500)' }}>Showing verified missing person reports</span>
        </div>

        {loading ? (
          <div className="empty"><div className="empty-icon"><span className="sp" style={{ width: 48, height: 48, borderWidth: 4 }} /></div><div className="empty-sub">Loading cases…</div></div>
        ) : reports.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No Active Cases</div>
            <div className="empty-sub">No verified missing person reports at this time.</div>
          </div>
        ) : (
          <div className="cards-grid">
            {reports.map(r => (
              <ReportCard key={r.id} report={r} onClick={() => setSelId(r.id)} />
            ))}
          </div>
        )}
      </div>

      {selId && (
        <ReportModal
          reportId={selId}
          onClose={() => setSelId(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
