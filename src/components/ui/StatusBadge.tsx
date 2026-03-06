import { ReportStatus, UserRole } from '@/types';

const MAP: Record<string, string> = {
  missing:  'badge badge-missing',
  found:    'badge badge-found',
  pending:  'badge badge-pending',
  rejected: 'badge badge-rejected',
  admin:    'badge badge-admin',
  user:     'badge badge-user',
};

export function StatusBadge({ status }: { status: ReportStatus | UserRole | string }) {
  return <span className={MAP[status] || 'badge badge-pending'}>{status.toUpperCase()}</span>;
}
