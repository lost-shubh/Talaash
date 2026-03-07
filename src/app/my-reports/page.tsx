'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ReportCard } from '@/components/ui/ReportCard';
import { ReportModal } from '@/components/ui/ReportModal';

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login?from=/my-reports'); return; }
    fetch('/api/reports?my=1&pageSize=100')
      .then(r => r.json())
      .then(d => { setReports(d.items || []); setLoading(false); });
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="empty" style={{ marginTop: 80 }}>
        <div className="empty-icon"><span className="sp" style={{ width: 48, height: 48, borderWidth: 4 }} /></div>
        <div className="empty-sub">Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1 }}>
      <div className="page-hdr">
        <h2>MY REPORTS</h2>
        <p>{reports.length} report{reports.length !== 1 ? 's' : ''} filed by you</p>
      </div>

      <div style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: '32px 24px' }}>
        {reports.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No Reports Yet</div>
            <div className="empty-sub">You haven&apos;t filed any missing person reports.</div>
            <button className="btn btn-solid btn-lg" onClick={() => router.push('/report')}>+ File a Report</button>
          </div>
        ) : (
          <>
            <div className="cards-grid">
              {reports.map(r => <ReportCard key={r.id} report={r} onClick={() => setSelId(r.id)} />)}
            </div>
            <div style={{ marginTop: 24, padding: '16px 0', borderTop: 'var(--border)', fontSize: '.7rem', color: 'var(--g500)' }}>
              Pending reports are only visible to you and admins. Approved reports are publicly visible.
            </div>
          </>
        )}
      </div>

      {selId && <ReportModal reportId={selId} onClose={() => setSelId(null)} />}
    </div>
  );
}
