import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, sanitize, generateId, generateCaseNumber } from '@/lib/auth';
import { INDIAN_STATES } from '@/types';

const VALID_STATUS = new Set(['all', 'pending', 'missing', 'found', 'rejected']);
const VALID_GENDERS = new Set(['Male', 'Female', 'Other', 'Prefer not to say']);
const VALID_TYPES = new Set(['child', 'adult', 'elderly', 'family']);
const VALID_STATES = new Set(INDIAN_STATES);

function parseIntParam(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function estimateBase64Bytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex < 0) return 0;
  const b64 = dataUrl.slice(commaIndex + 1);
  return Math.floor((b64.length * 3) / 4);
}

function ensureReporterRow(db: ReturnType<typeof getDb>, user: { id: string; name: string; email: string; role: 'admin' | 'user' }): string {
  const byId = db.prepare('SELECT id FROM users WHERE id = ?').get(user.id) as { id: string } | undefined;
  if (byId) return byId.id;

  const byEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(user.email) as { id: string } | undefined;
  if (byEmail) return byEmail.id;

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, phone, role, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(
    user.id,
    sanitize(user.name),
    sanitize(user.email).toLowerCase(),
    '__serverless_session_placeholder__',
    '',
    user.role
  );

  return user.id;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = sanitize(searchParams.get('status') || 'missing');
    const q = sanitize(searchParams.get('q') || '');
    const state = sanitize(searchParams.get('state') || '');
    const gender = sanitize(searchParams.get('gender') || '');
    const type = sanitize(searchParams.get('type') || '');
    const page = Math.max(1, parseIntParam(searchParams.get('page'), 1));
    const pageSize = Math.min(50, Math.max(1, parseIntParam(searchParams.get('pageSize'), 20)));
    const myReports = searchParams.get('my') === '1';

    const user = await getSessionUser();
    const db = getDb();

    let where = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (myReports) {
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      where += ' AND r.reporter_id = ?';
      params.push(user.id);
    } else if (!user || user.role !== 'admin') {
      where += " AND r.status NOT IN ('pending','rejected')";
    }

    if (status && status !== 'all' && !myReports) {
      if (!VALID_STATUS.has(status)) {
        return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
      }
      where += ' AND r.status = ?';
      params.push(status);
    }

    if (q) {
      where += ' AND (r.name LIKE ? OR r.location LIKE ? OR r.description LIKE ? OR r.case_number LIKE ? OR r.state LIKE ?)';
      const lq = `%${q}%`;
      params.push(lq, lq, lq, lq, lq);
    }

    if (state) {
      if (!VALID_STATES.has(state as (typeof INDIAN_STATES)[number])) {
        return NextResponse.json({ error: 'Invalid state filter' }, { status: 400 });
      }
      where += ' AND r.state = ?';
      params.push(state);
    }

    if (gender) {
      if (!VALID_GENDERS.has(gender)) {
        return NextResponse.json({ error: 'Invalid gender filter' }, { status: 400 });
      }
      where += ' AND r.gender = ?';
      params.push(gender);
    }

    if (type) {
      if (!VALID_TYPES.has(type)) {
        return NextResponse.json({ error: 'Invalid type filter' }, { status: 400 });
      }
      where += ' AND r.report_type = ?';
      params.push(type);
    }

    const offset = (page - 1) * pageSize;
    const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM reports r ${where}`).get(...params) as { cnt: number };
    const total = countRow.cnt;

    const rows = db.prepare(`
      SELECT r.*, u.name as reporter_name
      FROM reports r
      LEFT JOIN users u ON r.reporter_id = u.id
      ${where}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset) as Record<string, unknown>[];

    const reports = rows.map((r) => {
      const photo = db.prepare('SELECT id, data FROM photos WHERE report_id = ? LIMIT 1').get(r.id) as { data?: string } | undefined;
      const sightingCount = (db.prepare('SELECT COUNT(*) as cnt FROM sightings WHERE report_id = ?').get(r.id) as { cnt: number }).cnt;
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const required = ['name', 'age', 'gender', 'last_seen', 'location', 'state', 'description', 'physical_desc', 'contact_name', 'contact_phone', 'contact_relation'];
    for (const field of required) {
      if (!sanitize(String((body as Record<string, unknown>)[field] || ''))) {
        return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 });
      }
    }

    const age = Number.parseInt(String((body as Record<string, unknown>).age || ''), 10);
    if (!Number.isFinite(age) || age < 0 || age > 130) {
      return NextResponse.json({ error: 'Age must be between 0 and 130' }, { status: 400 });
    }

    const gender = sanitize(String((body as Record<string, unknown>).gender || ''));
    if (!VALID_GENDERS.has(gender)) {
      return NextResponse.json({ error: 'Invalid gender' }, { status: 400 });
    }

    const state = sanitize(String((body as Record<string, unknown>).state || ''));
    if (!VALID_STATES.has(state as (typeof INDIAN_STATES)[number])) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
    }

    const description = sanitize(String((body as Record<string, unknown>).description || ''));
    if (description.length < 20) {
      return NextResponse.json({ error: 'Description must be at least 20 characters' }, { status: 400 });
    }

    const lastSeen = String((body as Record<string, unknown>).last_seen || '');
    const lastSeenDate = new Date(lastSeen);
    if (Number.isNaN(lastSeenDate.getTime())) {
      return NextResponse.json({ error: 'Invalid last seen date' }, { status: 400 });
    }
    if (lastSeenDate.getTime() > Date.now()) {
      return NextResponse.json({ error: 'Last seen date cannot be in the future' }, { status: 400 });
    }

    const reportType = sanitize(String((body as Record<string, unknown>).report_type || 'adult'));
    if (!VALID_TYPES.has(reportType)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    const db = getDb();
    const reporterId = ensureReporterRow(db, user);
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
      id,
      caseNumber,
      sanitize(String((body as Record<string, unknown>).name || '')),
      age,
      gender,
      lastSeen,
      sanitize(String((body as Record<string, unknown>).location || '')),
      state,
      description,
      sanitize(String((body as Record<string, unknown>).physical_desc || '')),
      sanitize(String((body as Record<string, unknown>).identifying_marks || '')),
      sanitize(String((body as Record<string, unknown>).age_progression || '')),
      reportType,
      reporterId,
      sanitize(String((body as Record<string, unknown>).contact_name || '')),
      sanitize(String((body as Record<string, unknown>).contact_phone || '')),
      sanitize(String((body as Record<string, unknown>).contact_relation || '')),
      '',
      now,
      now
    );

    const photos = Array.isArray((body as Record<string, unknown>).photos)
      ? ((body as Record<string, unknown>).photos as Array<{ data?: string; filename?: string }>).slice(0, 5)
      : [];

    for (const photo of photos) {
      const data = String(photo.data || '');
      const filename = sanitize(String(photo.filename || ''));
      if (!data || !filename || !data.startsWith('data:image/')) continue;
      if (estimateBase64Bytes(data) > 5 * 1024 * 1024) continue;

      db.prepare('INSERT INTO photos (id, report_id, filename, data) VALUES (?,?,?,?)')
        .run(generateId(), id, filename, data);
    }

    db.prepare('INSERT INTO audit_log (id, report_id, action, user_id, notes) VALUES (?,?,?,?,?)')
      .run(generateId(), id, 'CREATED', reporterId, 'Report filed by user');

    return NextResponse.json({ success: true, id, caseNumber }, { status: 201 });
  } catch (err) {
    console.error('POST /api/reports error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
