import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, signToken, sanitize, generateId } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = sanitize(body.name || '');
    const email = sanitize(body.email || '').toLowerCase();
    const password = String(body.password || '');
    const phone = sanitize(body.phone || '');

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password required' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const id = generateId();
    const hash = await hashPassword(password);
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, role)
      VALUES (?, ?, ?, ?, ?, 'user')
    `).run(id, name, email, hash, phone);

    const token = await signToken({ id, name, email, role: 'user' });

    const res = NextResponse.json({
      success: true,
      user: { id, name, email, role: 'user' },
    });

    res.cookies.set('talaash_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return res;
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
