import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, sanitize, generateId } from '@/lib/auth';

interface Params { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser();
    const db = getDb();
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(params.id) as any;

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Non-admin can only see public reports or their own
    if (!user || user.role !== 'admin') {
      if (report.status === 'pending' || report.status === 'rejected') {
        if (!user || report.reporter_id !== user.id) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
      }
    }

    const photos = db.prepare('SELECT * FROM photos WHERE report_id = ?').all(params.id) as any[];
    const sightings = db.prepare('SELECT * FROM sightings WHERE report_id = ? ORDER BY timestamp DESC').all(params.id) as any[];
    const reporter = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(report.reporter_id) as any;

    // Hide contact info from unauthenticated users
    const safeReport = { ...report, photos, sightings, reporter };
    if (!user) {
      delete safeReport.contact_phone;
      delete safeReport.contact_name;
      delete safeReport.contact_relation;
    }

    return NextResponse.json(safeReport);
  } catch (err) {
    console.error('GET /api/reports/[id] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(params.id) as any;
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const now = new Date().toISOString();

    // Status change - admin only
    if (body.status) {
      if (user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      const allowed = ['pending', 'missing', 'found', 'rejected'];
      if (!allowed.includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

      db.prepare('UPDATE reports SET status = ?, verified_by = ?, updated_at = ? WHERE id = ?')
        .run(body.status, user.id, now, params.id);

      db.prepare('INSERT INTO audit_log (id, report_id, action, user_id, notes) VALUES (?,?,?,?,?)')
        .run(generateId(), params.id, body.status.toUpperCase(), user.id, body.notes || `Status changed to ${body.status}`);
    }

    // Admin notes - admin only
    if (body.admin_notes !== undefined) {
      if (user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      db.prepare('UPDATE reports SET admin_notes = ?, updated_at = ? WHERE id = ?')
        .run(sanitize(body.admin_notes), now, params.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/reports/[id] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const db = getDb();
    db.prepare('DELETE FROM reports WHERE id = ?').run(params.id);

    db.prepare('INSERT INTO audit_log (id, report_id, action, user_id, notes) VALUES (?,?,?,?,?)')
      .run(generateId(), params.id, 'DELETED', user.id, 'Report permanently deleted by admin');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/reports/[id] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
