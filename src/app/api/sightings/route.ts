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
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { report_id, reporter_name, description, lat, lng, accuracy } = body;

    if (!report_id || !description) {
      return NextResponse.json({ error: 'report_id and description required' }, { status: 400 });
    }
    if (description.trim().length < 10) {
      return NextResponse.json({ error: 'Description must be at least 10 characters' }, { status: 400 });
    }

    const db = getDb();
    // Verify report exists and is public
    const report = db.prepare("SELECT id, status FROM reports WHERE id = ? AND status = 'missing'").get(report_id) as any;
    if (!report) return NextResponse.json({ error: 'Report not found or not active' }, { status: 404 });

    // Validate coordinates if provided
    let safeLat: number | null = null;
    let safeLng: number | null = null;
    let safeAcc: number | null = null;
    if (lat != null && lng != null) {
      const pLat = parseFloat(lat);
      const pLng = parseFloat(lng);
      if (!isNaN(pLat) && !isNaN(pLng) && pLat >= -90 && pLat <= 90 && pLng >= -180 && pLng <= 180) {
        safeLat = pLat;
        safeLng = pLng;
        safeAcc = accuracy ? Math.min(parseFloat(accuracy), 50000) : null;
      }
    }

    const id = generateId();
    db.prepare(`
      INSERT INTO sightings (id, report_id, reporter_name, description, lat, lng, accuracy)
      VALUES (?,?,?,?,?,?,?)
    `).run(id, report_id, sanitize(reporter_name || ''), sanitize(description), safeLat, safeLng, safeAcc);

    const sighting = db.prepare('SELECT * FROM sightings WHERE id = ?').get(id);
    return NextResponse.json({ success: true, sighting }, { status: 201 });
  } catch (err) {
    console.error('POST /api/sightings error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
