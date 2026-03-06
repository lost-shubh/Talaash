import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, sanitize, generateId, generateCaseNumber } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'missing';
    const q = searchParams.get('q') || '';
    const state = searchParams.get('state') || '';
    const gender = searchParams.get('gender') || '';
    const type = searchParams.get('type') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') || '20'));
    const myReports = searchParams.get('my') === '1';

    const user = await getSessionUser();
    const db = getDb();

    let where = 'WHERE 1=1';
    const params: (string | number)[] = [];

    // Non-admin users can only see public reports unless viewing their own
    if (myReports) {
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      where += ' AND r.reporter_id = ?';
      params.push(user.id);
    } else if (!user || user.role !== 'admin') {
      where += " AND r.status NOT IN ('pending','rejected')";
    }

    if (status && status !== 'all' && !myReports) {
      where += ' AND r.status = ?';
      params.push(status);
    }

    if (q) {
      where += ' AND (r.name LIKE ? OR r.location LIKE ? OR r.description LIKE ? OR r.case_number LIKE ? OR r.state LIKE ?)';
      const lq = `%${q}%`;
      params.push(lq, lq, lq, lq, lq);
    }

    if (state) { where += ' AND r.state = ?'; params.push(state); }
    if (gender) { where += ' AND r.gender = ?'; params.push(gender); }
    if (type) { where += ' AND r.report_type = ?'; params.push(type); }

    const offset = (page - 1) * pageSize;
    const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM reports r ${where}`).get(...params) as any;
    const total = countRow.cnt;

    const rows = db.prepare(`
      SELECT r.*, u.name as reporter_name
      FROM reports r
      LEFT JOIN users u ON r.reporter_id = u.id
      ${where}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset) as any[];

    // Attach photos (first only for list view)
    const reports = rows.map((r: any) => {
      const photo = db.prepare('SELECT id, data FROM photos WHERE report_id = ? LIMIT 1').get(r.id) as any;
      const sightingCount = (db.prepare('SELECT COUNT(*) as cnt FROM sightings WHERE report_id = ?').get(r.id) as any).cnt;
      return { ...r, coverPhoto: photo?.data || null, sightingCount };
    });

    return NextResponse.json({
      items: reports,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error('GET /api/reports error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Login required to file a report' }, { status: 401 });

    const body = await req.json();

    // Validate required fields
    const required = ['name', 'age', 'gender', 'last_seen', 'location', 'state',
      'description', 'physical_desc', 'contact_name', 'contact_phone', 'contact_relation'];
    for (const field of required) {
      if (!body[field]) return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 });
    }

    if (body.description.length < 20) {
      return NextResponse.json({ error: 'Description must be at least 20 characters' }, { status: 400 });
    }

    if (new Date(body.last_seen) > new Date()) {
      return NextResponse.json({ error: 'Last seen date cannot be in the future' }, { status: 400 });
    }

    const db = getDb();
    const id = generateId();
    const caseNumber = generateCaseNumber();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO reports (
        id, case_number, name, age, gender, last_seen, location, state,
        description, physical_desc, identifying_marks, age_progression,
        report_type, status, reporter_id,
        contact_name, contact_phone, contact_relation,
        admin_notes, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?,?,?,?,?,?)
    `).run(
      id, caseNumber,
      sanitize(body.name), parseInt(body.age), body.gender,
      body.last_seen, sanitize(body.location), body.state,
      sanitize(body.description), sanitize(body.physical_desc),
      sanitize(body.identifying_marks || ''), sanitize(body.age_progression || ''),
      body.report_type || 'adult', user.id,
      sanitize(body.contact_name), sanitize(body.contact_phone), sanitize(body.contact_relation),
      '', now, now
    );

    // Save photos
    if (Array.isArray(body.photos)) {
      for (const photo of body.photos.slice(0, 5)) {
        if (photo.data && photo.filename) {
          db.prepare('INSERT INTO photos (id, report_id, filename, data) VALUES (?,?,?,?)')
            .run(generateId(), id, sanitize(photo.filename), photo.data);
        }
      }
    }

    // Audit log
    db.prepare('INSERT INTO audit_log (id, report_id, action, user_id, notes) VALUES (?,?,?,?,?)')
      .run(generateId(), id, 'CREATED', user.id, 'Report filed by user');

    return NextResponse.json({ success: true, id, caseNumber }, { status: 201 });
  } catch (err) {
    console.error('POST /api/reports error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
