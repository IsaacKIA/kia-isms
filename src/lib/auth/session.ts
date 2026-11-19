import crypto from 'crypto';

export const SESSION_COOKIE_NAME = 'kia_isms_session';
export const DEFAULT_CEO_PASSWORD = 'KiaAdmin2026!';
export const DEFAULT_STAFF_PASSWORD = 'KiaStaff2026!';

const SECRET = process.env.AUTH_SECRET || 'kia-isms-enterprise-secret-key-ghana-2026';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hashBuffer = crypto.scryptSync(password, salt, 64);
  const originalBuffer = Buffer.from(originalHash, 'hex');
  if (hashBuffer.length !== originalBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, originalBuffer);
}

export interface SessionPayload {
  staffId: string;
  email: string;
  primaryRole: string;
  iat: number;
  exp: number;
}

export function createSessionToken(staffId: string, email: string, primaryRole: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    staffId,
    email,
    primaryRole,
    iat: now,
    exp: now + 60 * 60 * 24 * 7, // 7 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [data, signature] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8')) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}
