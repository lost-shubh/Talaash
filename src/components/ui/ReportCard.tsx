import { Report } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';

function daysSince(s: string) {
  return Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
  report: Report & { coverPhoto?: string | null; sightingCount?: number };
  onClick: () => void;
}

export function ReportCard({ report, onClick }: Props) {
  const days = daysSince(report.last_seen);
  return (
    <article
      className="card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      aria-label={`Missing person: ${report.name}`}
    >
      {report.coverPhoto
        ? <img className="card-photo" src={report.coverPhoto} alt={`Photo of ${report.name}`} loading="lazy" />
        : <div className="card-photo-ph" aria-hidden="true">👤</div>
      }
      <div className="card-body">
        <div className="card-name">{report.name}</div>
        <div className="card-meta">
          Age {report.age} · {report.gender}<br />
          {report.location}<br />
          Last seen: {fmtDate(report.last_seen)}
        </div>
        <StatusBadge status={report.status} />
        <div className="card-days">
          {report.status === 'missing' ? `${days} days` : report.status === 'found' ? '✓ Found' : ''}
        </div>
        {(report.sightingCount ?? 0) > 0 && (
          <div style={{ fontSize: '.58rem', color: 'var(--g500)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            👁 {report.sightingCount} sighting{report.sightingCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </article>
  );
}
