/**
 * Database-backed session store.
 *
 * express-session's default MemoryStore leaks memory and loses every login on
 * restart, which is unacceptable for a system with customer accounts and admin
 * sessions. Sessions live in the `sessions` table and expire on their own.
 */
import session from 'express-session';
import { execute, query, nowSql } from './db';

export class DbSessionStore extends session.Store {
  private pruneTimer?: NodeJS.Timeout;

  constructor() {
    super();
    if (process.env.NODE_ENV !== 'test') {
      this.pruneTimer = setInterval(() => void this.prune(), 15 * 60 * 1000);
      this.pruneTimer.unref?.();
    }
  }

  private expiry(sess: session.SessionData): string {
    const cookieExpiry = sess?.cookie?.expires ? new Date(sess.cookie.expires) : new Date(Date.now() + 8 * 60 * 60 * 1000);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${cookieExpiry.getFullYear()}-${p(cookieExpiry.getMonth() + 1)}-${p(cookieExpiry.getDate())} ${p(
      cookieExpiry.getHours()
    )}:${p(cookieExpiry.getMinutes())}:${p(cookieExpiry.getSeconds())}`;
  }

  get(sid: string, callback: (err: any, session?: session.SessionData | null) => void): void {
    query('SELECT sess, expires_at FROM sessions WHERE sid = ?', [sid])
      .then((rows) => {
        if (!rows[0]) return callback(null, null);
        if (String(rows[0].expires_at) < nowSql()) {
          void execute('DELETE FROM sessions WHERE sid = ?', [sid]);
          return callback(null, null);
        }
        try {
          callback(null, JSON.parse(String(rows[0].sess)) as session.SessionData);
        } catch {
          callback(null, null);
        }
      })
      .catch((err) => callback(err));
  }

  set(sid: string, sess: session.SessionData, callback?: (err?: any) => void): void {
    const expires = this.expiry(sess);
    const payload = JSON.stringify(sess);
    query('SELECT sid FROM sessions WHERE sid = ?', [sid])
      .then(async (rows) => {
        if (rows.length > 0) {
          await execute('UPDATE sessions SET sess = ?, expires_at = ? WHERE sid = ?', [payload, expires, sid]);
        } else {
          await execute('INSERT INTO sessions (sid, sess, expires_at) VALUES (?,?,?)', [sid, payload, expires]);
        }
        callback?.();
      })
      .catch((err) => callback?.(err));
  }

  touch(sid: string, sess: session.SessionData, callback?: (err?: any) => void): void {
    execute('UPDATE sessions SET expires_at = ? WHERE sid = ?', [this.expiry(sess), sid])
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    execute('DELETE FROM sessions WHERE sid = ?', [sid])
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  length(callback: (err: any, length?: number) => void): void {
    query('SELECT COUNT(*) AS c FROM sessions WHERE expires_at > ?', [nowSql()])
      .then((rows) => callback(null, Number(rows[0]?.c || 0)))
      .catch((err) => callback(err));
  }

  clear(callback?: (err?: any) => void): void {
    execute('DELETE FROM sessions')
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  async all(callback: (err: any, obj?: { [sid: string]: session.SessionData } | null) => void): Promise<void> {
    try {
      const rows = await query('SELECT sid, sess FROM sessions WHERE expires_at > ?', [nowSql()]);
      const out: Record<string, session.SessionData> = {};
      for (const row of rows) {
        try {
          out[String(row.sid)] = JSON.parse(String(row.sess));
        } catch {
          /* skip corrupt rows */
        }
      }
      callback(null, out);
    } catch (err) {
      callback(err, null);
    }
  }

  /** Drop expired rows (runs periodically). */
  async prune(): Promise<void> {
    try {
      await execute('DELETE FROM sessions WHERE expires_at < ?', [nowSql()]);
    } catch {
      /* ignore */
    }
  }
}
