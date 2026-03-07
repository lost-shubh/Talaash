import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, sanitize, generateId } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }
    const db = getDb();
    const sightings = db.prepare(`
      SELECT s.*, r.name as report_name, r.case_number
      FROM sightings s
      LEFT JOIN reports r ON s.report_id = r.id
      ORDER BY s.timestamp DESC
    `).all();
    return NextResponse.json(sightings);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const reportId = sanitize(String((body as Record<string, unknown>).report_id || ''));
    const reporterName = sanitize(String((body as Record<string, unknown>).reporter_name || ''));
    const description = sanitize(String((body as Record<string, unknown>).description || ''));

    if (!reportId || !description) {
      return NextResponse.json({ error: 'report_id and description required' }, { status: 400 });
    }
    if (description.length < 10) {
      return NextResponse.json({ error: 'Description must be at least 10 characters' }, { status: 400 });
    }

    const rawLat = (body as Record<string, unknown>).lat;
    const rawLng = (body as Record<string, unknown>).lng;
    const rawAccuracy = (body as Record<string, unknown>).accuracy;

    const db = getDb();
    const report = db.prepare("SELECT id, status FROM reports WHERE id = ? AND status = 'missing'").get(reportId) as { id: string; status: string } | undefined;
    if (!report) return NextResponse.json({ error: 'Report not found or not active' }, { status: 404 });

    let safeLat: number | null = null;
    let safeLng: number | null = null;
    let safeAcc: number | null = null;

    if (rawLat != null && rawLng != null) {
      const pLat = Number.parseFloat(String(rawLat));
      const pLng = Number.parseFloat(String(rawLng));
      if (!Number.isNaN(pLat) && !Number.isNaN(pLng) && pLat >= -90 && pLat <= 90 && pLng >= -180 && pLng <= 180) {
        safeLat = pLat;
        safeLng = pLng;

        const parsedAcc = Number.parseFloat(String(rawAccuracy ?? ''));
        if (!Number.isNaN(parsedAcc) && parsedAcc >= 0) {
          safeAcc = Math.min(parsedAcc, 50000);
        }
      }
    }

    const id = generateId();
    db.prepare(`
      INSERT INTO sightings (id, report_id, reporter_name, description, lat, lng, accuracy)
      VALUES (?,?,?,?,?,?,?)
    `).run(id, reportId, reporterName, description, safeLat, safeLng, safeAcc);

    const sighting = db.prepare('SELECT * FROM sightings WHERE id = ?').get(id);
    return NextResponse.json({ success: true, sighting }, { status: 201 });
  } catch (err) {
    console.error('POST /api/sightings error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
