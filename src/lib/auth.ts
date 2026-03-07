import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const FALLBACK_SECRET = 'talaash_fallback_secret_change_in_production';
let warnedFallback = false;

function getSecret(): Uint8Array {
  const secretValue = (process.env.JWT_SECRET || '').trim() || FALLBACK_SECRET;

  if (process.env.NODE_ENV === 'production' && secretValue === FALLBACK_SECRET) {
    throw new Error('JWT_SECRET must be set in production.');
  }

  if (process.env.NODE_ENV !== 'production' && secretValue === FALLBACK_SECRET && !warnedFallback) {
    warnedFallback = true;
    console.warn('Using fallback JWT secret for local development. Set JWT_SECRET in .env.local.');
  }

  return new TextEncoder().encode(secretValue);
}

export interface JWTPayload {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getSessionUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('talaash_token')?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function sanitize(str: string): string {
  return String(str || '').replace(/[<>"'`\\]/g, '').trim();
}

export function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000 + 1000);
  const ts = Date.now().toString().slice(-4);
  return `TLS-${year}-${rand}${ts}`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
