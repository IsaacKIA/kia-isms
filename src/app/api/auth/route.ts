import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getStaffActor, writeAuditLog } from '@/lib/services/isms-service';
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  verifyPassword,
  hashPassword,
  DEFAULT_CEO_PASSWORD,
  DEFAULT_STAFF_PASSWORD,
} from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ ok: true, authenticated: false, actor: null });
    }
    const db = await getDb();
    const res = await db.query<any>(
      'SELECT id, status FROM staff_users WHERE id = $1 AND status = $2 LIMIT 1',
      [session.staffId, 'Active']
    );
    if (!res.rows.length) {
      return NextResponse.json({ ok: true, authenticated: false, actor: null });
    }
    const actor = await getStaffActor(session.staffId);
    return NextResponse.json({ ok: true, authenticated: true, actor });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Session check failed.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const db = await getDb();

    if (action === 'LOGIN') {
      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || '';
      if (!email || !password) {
        return NextResponse.json(
          { ok: false, error: 'Email and password are required.' },
          { status: 400 }
        );
      }

      const res = await db.query<any>(
        'SELECT * FROM staff_users WHERE LOWER(email) = $1 OR LOWER(reference_code) = $1 LIMIT 1',
        [email]
      );
      const user = res.rows[0];
      if (!user) {
        return NextResponse.json(
          { ok: false, error: 'Invalid email/staff ID or password.' },
          { status: 401 }
        );
      }
      if (user.status !== 'Active') {
        return NextResponse.json(
          { ok: false, error: 'This staff account has been deactivated. Contact the Founder/CEO.' },
          { status: 403 }
        );
      }

      // Ensure password_hash is initialized if legacy row
      let storedHash = user.password_hash;
      if (!storedHash) {
        const defaultPwd = user.id === 'STF-01' ? DEFAULT_CEO_PASSWORD : DEFAULT_STAFF_PASSWORD;
        storedHash = hashPassword(defaultPwd);
        await db.query('UPDATE staff_users SET password_hash = $1 WHERE id = $2', [
          storedHash,
          user.id,
        ]);
      }

      if (!verifyPassword(password, storedHash)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid email/staff ID or password.' },
          { status: 401 }
        );
      }

      const actor = await getStaffActor(user.id);
      const token = createSessionToken(actor.id, actor.email, actor.primary_role);

      await writeAuditLog(
        actor,
        'STAFF_LOGIN',
        'staff_users',
        actor.id,
        `Staff member ${actor.full_name} (${actor.primary_role}) signed in via authenticated session.`
      );

      const response = NextResponse.json({ ok: true, authenticated: true, actor });
      response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    if (action === 'LOGOUT') {
      const response = NextResponse.json({ ok: true, authenticated: false });
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    if (action === 'CHANGE_PASSWORD') {
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      const session = verifySessionToken(token);
      if (!session) {
        return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 });
      }
      const actor = await getStaffActor(session.staffId);
      const targetStaffId = body.target_staff_id || actor.id;
      const newPassword = (body.new_password || '').trim();

      if (newPassword.length < 6) {
        return NextResponse.json(
          { ok: false, error: 'New password must be at least 6 characters.' },
          { status: 400 }
        );
      }

      // If changing someone else's password, must be CEO or Admin
      if (
        targetStaffId !== actor.id &&
        !actor.roles.includes('FOUNDER_CEO') &&
        !actor.roles.includes('ADMINISTRATOR')
      ) {
        return NextResponse.json(
          { ok: false, error: 'Only the Founder/CEO can reset another staff member’s password.' },
          { status: 403 }
        );
      }

      // If changing own password and not forced by CEO, verify current password if provided
      if (targetStaffId === actor.id && body.current_password) {
        const uRes = await db.query<any>('SELECT password_hash FROM staff_users WHERE id = $1', [
          actor.id,
        ]);
        const currentHash = uRes.rows[0]?.password_hash;
        if (currentHash && !verifyPassword(body.current_password, currentHash)) {
          return NextResponse.json(
            { ok: false, error: 'Current password is incorrect.' },
            { status: 400 }
          );
        }
      }

      const newHash = hashPassword(newPassword);
      await db.query('UPDATE staff_users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
        newHash,
        targetStaffId,
      ]);

      await writeAuditLog(
        actor,
        'PASSWORD_CHANGED',
        'staff_users',
        targetStaffId,
        `${actor.full_name} updated login password for staff account ${targetStaffId}.`
      );

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: `Unknown auth action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Authentication request failed.' },
      { status: 500 }
    );
  }
}
