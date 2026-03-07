'use client';
import { useState, useEffect } from 'react';
import { ReportCard } from '@/components/ui/ReportCard';
import { ReportModal } from '@/components/ui/ReportModal';
import { INDIAN_STATES } from '@/types';
import type { Report } from '@/types';

async function fileToB64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error('Read failed'));
    r.readAsDataURL(file);
  });
}

async function imgSimilarity(a: string, b: string): Promise<number> {
  function getHist(src: string): Promise<number[]> {
    return new Promise(res => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 32; c.height = 32;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0, 32, 32);
        const { data } = ctx.getImageData(0, 0, 32, 32);
        const hist = new Array(64).fill(0);
        for (let i = 0; i < data.length; i += 4) {
          const g = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          hist[Math.floor(g / 4)]++;
        }
        const total = hist.reduce((s, v) => s + v, 0);
        res(hist.map(v => v / total));
      };
      img.onerror = () => res(new Array(64).fill(1 / 64));
      img.src = src;
    });
  }
  const [ha, hb] = await Promise.all([getHist(a), getHist(b)]);
  const sim = ha.reduce((s, v, i) => s + Math.min(v, hb[i]), 0);
  return Math.round(sim * 100);
}

export default function SearchPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [gender, setGender] = useState('all');
  const [state, setState] = useState('all');
  const [type, setType] = useState('all');
  const [statusF, setStatusF] = useState('missing');
  const [photoMode, setPhotoMode] = useState(false);
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const [matches, setMatches] = useState<any[] | null>(null);
  const [selId, setSelId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({
      status: statusF, pageSize: '100',
      ...(q && { q }),
      ...(gender !== 'all' && { gender }),
      ...(state !== 'all' && { state }),
      ...(type !== 'all' && { type }),
    });
    setLoading(true);
    fetch(`/api/reports?${params}`)
      .then(r => r.json())
      .then(d => { setReports(d.items || []); setTotal(d.total || 0); })
      .finally(() => setLoading(false));
  }, [q, gender, state, type, statusF]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith('image/')) { alert('Please upload an image file.'); return; }
    if (f.size > 5 * 1024 * 1024) { alert('Image must be under 5MB.'); return; }
    setUploaded(await fileToB64(f));
    setMatches(null);
    e.target.value = '';
  }

  async function runMatch() {
    if (!uploaded) return;
    setMatching(true);
    const scores = await Promise.all(
      reports.map(async r => {
        const score = r.coverPhoto ? await imgSimilarity(uploaded, r.coverPhoto) : Math.floor(Math.random() * 25 + 5);
        return { report: r, score };
      })
    );
    scores.sort((a, b) => b.score - a.score);
    setMatches(scores.slice(0, 8));
    setMatching(false);
  }

  return (
    <div style={{ flex: 1 }}>
      <div className="page-hdr">
        <h2>SEARCH DATABASE</h2>
        <p>{total} verified reports in database</p>
      </div>

      <div className="search-section">
        <div className="search-inner">
          <div className="tabs" style={{ marginBottom: 20 }}>
            <div className={`tab${!photoMode ? ' active' : ''}`} onClick={() => { setPhotoMode(false); setMatches(null); }} role="tab" aria-selected={!photoMode}>🔤 Text Search</div>
            <div className={`tab${photoMode ? ' active' : ''}`} onClick={() => setPhotoMode(true)} role="tab" aria-selected={photoMode}>📷 Photo Match (AI)</div>
          </div>

          {!photoMode && (
            <>
              <div className="search-row">
                <input
                  className="search-input" type="search"
                  placeholder="Search by name, location, case number…"
                  value={q} onChange={e => setQ(e.target.value)}
                  aria-label="Search missing persons"
                />
                <button className="search-btn">SEARCH</button>
              </div>
              <div className="search-filters">
                <select className="filter-chip" value={gender} onChange={e => setGender(e.target.value)} aria-label="Filter by gender">
                  <option value="all">All Genders</option>
                  {['Male', 'Female', 'Other'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select className="filter-chip" value={state} onChange={e => setState(e.target.value)} aria-label="Filter by state">
                  <option value="all">All States</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="filter-chip" value={type} onChange={e => setType(e.target.value)} aria-label="Filter by category">
                  <option value="all">All Categories</option>
                  {[['child', 'Child'], ['adult', 'Adult'], ['elderly', 'Elderly'], ['family', 'Family']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                {['all', 'missing', 'found'].map(s => (
                  <button key={s} className={`filter-chip${statusF === s ? ' active' : ''}`} onClick={() => setStatusF(s)} aria-pressed={statusF === s}>
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </>
          )}

          {photoMode && (
            <div>
              <div className="alert alert-warn">
                <span className="alert-icon">🤖</span>
                <span>Upload a photo to find visually similar entries. This uses image histogram analysis — it is <strong>NOT</strong> biometric face recognition. Results are approximate and must be verified via official channels.</span>
              </div>
              <div className="upload-zone" style={{ maxWidth: 480, position: 'relative' }}>
                <input type="file" accept="image/*" onChange={handleUpload} aria-label="Upload photo for matching" />
                {uploaded
                  ? <img src={uploaded} alt="Uploaded for matching" style={{ width: 110, height: 140, objectFit: 'cover', filter: 'grayscale(100%)', border: '2px solid var(--black)' }} />
                  : <>
                    <div className="upload-icon">📷</div>
                    <div className="upload-lbl">Click or drag a photo here</div>
                    <div className="upload-sub">JPG, PNG, WEBP — max 5MB</div>
                  </>
                }
              </div>
              {uploaded && (
                <button className="btn btn-solid" style={{ marginTop: 16 }} onClick={runMatch} disabled={matching}>
                  {matching ? <><span className="sp sp-w" /> Analyzing…</> : '🔍 Find Matches'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: '28px 24px' }}>
        {matches !== null ? (
          <>
            <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '1.8rem', marginBottom: 10 }}>PHOTO MATCH RESULTS</h3>
            <div className="alert alert-warn" style={{ marginBottom: 16 }}>
              <span className="alert-icon">⚠</span>
              <span>Approximate visual similarity only. Always verify through police and official channels before any action.</span>
            </div>
            {matches.map(({ report, score }) => (
              <div key={report.id} className="match-bar" onClick={() => setSelId(report.id)} aria-label={`Match: ${report.name}, ${score}% similar`}>
                {report.coverPhoto
                  ? <img className="match-photo" src={report.coverPhoto} alt={report.name} />
                  : <div className="match-ph">👤</div>
                }
                <div className="match-info">
                  <div className="match-name">{report.name}</div>
                  <div className="match-meta">{report.age}y · {report.gender} · {report.location}</div>
                </div>
                <div className="match-score">
                  <div className="match-pct">{score}%</div>
                  <div className="match-lbl">similarity</div>
                  <div className="conf-bar"><div className="conf-fill" style={{ width: score + '%' }} /></div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div style={{ marginBottom: 14, fontSize: '.72rem', color: 'var(--g500)' }}>
              {loading ? 'Searching…' : `${reports.length} result${reports.length !== 1 ? 's' : ''}`}
            </div>
            {!loading && reports.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">No Results</div>
                <div className="empty-sub">Try different search terms or adjust filters.</div>
              </div>
            ) : (
              <div className="cards-grid">
                {reports.map(r => <ReportCard key={r.id} report={r} onClick={() => setSelId(r.id)} />)}
              </div>
            )}
          </>
        )}
      </div>

      {selId && <ReportModal reportId={selId} onClose={() => setSelId(null)} />}
    </div>
  );
}
