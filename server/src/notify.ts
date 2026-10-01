/**
 * Notification pipeline.
 *
 * Every customer-facing notification is first written to the `notifications`
 * table (durable audit + retry) and then handed to the configured transport:
 *  - SMTP via nodemailer when SMTP_HOST is configured
 *  - otherwise a logged "demo" transport so flows never silently fail
 *
 * This is what makes the system *confirm things*: order received, payment
 * confirmed, status changes, password resets.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { execute, nowSql, query, queryOne } from './db';

let transporter: Transporter | null = null;
let smtpChecked = false;

function mailer(): Transporter | null {
  if (smtpChecked) return transporter;
  smtpChecked = true;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export function emailEnabled(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

export async function settings(): Promise<{ email: string; adabraka_phone: string; dzorwulu_phone: string }> {
  const row = await queryOne('SELECT email, adabraka_phone, dzorwulu_phone FROM website_settings WHERE id = 1');
  return {
    email: String(row?.email || process.env.STORE_EMAIL || 'mayfordfoods@gmail.com'),
    adabraka_phone: String(row?.adabraka_phone || '0244143271'),
    dzorwulu_phone: String(row?.dzorwulu_phone || '0533634378'),
  };
}

export interface MailInput {
  to: string;
  subject: string;
  body: string;
  relatedType?: string;
  relatedId?: string | number;
}

/** Queue + attempt delivery. Never throws into the request path. */
export async function sendMail(input: MailInput): Promise<boolean> {
  const to = String(input.to || '').trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return false;
  let notificationId: number | null = null;
  try {
    const res = await execute(
      `INSERT INTO notifications (channel, recipient, subject, body, related_type, related_id, status, attempts, created_at)
       VALUES ('email', ?, ?, ?, ?, ?, 'queued', 0, ?)`,
      [to, input.subject, input.body, input.relatedType ?? null, input.relatedId != null ? String(input.relatedId) : null, nowSql()]
    );
    notificationId = res.insertId;
  } catch {
    /* keep going — the message still gets logged below */
  }

  const tx = mailer();
  if (!tx) {
    console.log(`[notify:demo] ${input.subject} -> ${to}\n${input.body.slice(0, 500)}`);
    if (notificationId) {
      await execute(`UPDATE notifications SET status = 'skipped', error = ?, sent_at = ? WHERE id = ?`, [
        'SMTP not configured (demo transport)',
        nowSql(),
        notificationId,
      ]).catch(() => undefined);
    }
    return false;
  }

  try {
    await tx.sendMail({
      from: process.env.SMTP_FROM || `Mayford Foods GH <${process.env.SMTP_USER || 'no-reply@mayfordfoods.gh'}>`,
      to,
      subject: input.subject,
      text: input.body,
    });
    if (notificationId) {
      await execute(`UPDATE notifications SET status = 'sent', attempts = attempts + 1, sent_at = ? WHERE id = ?`, [nowSql(), notificationId]);
    }
    return true;
  } catch (err) {
    const message = String((err as Error).message || 'send failed').slice(0, 400);
    console.warn(`[notify] send failed for ${to}: ${message}`);
    if (notificationId) {
      await execute(`UPDATE notifications SET status = 'failed', attempts = attempts + 1, error = ? WHERE id = ?`, [message, notificationId]);
    }
    return false;
  }
}

export async function notificationStats() {
  const rows = await query(
    `SELECT status, COUNT(*) AS c FROM notifications GROUP BY status`
  );
  const out: Record<string, number> = { queued: 0, sent: 0, failed: 0, skipped: 0 };
  for (const row of rows) out[String(row.status)] = Number(row.c);
  return out;
}

/* ------------------------------------------------------------------
   Branded message templates (plain text — deliverable to every inbox)
------------------------------------------------------------------ */
export function brandWrap(title: string, lines: string[]): string {
  return [
    'MAYFORD FOODS GH',
    '===================',
    title,
    '',
    ...lines,
    '',
    'Adabraka: 0244143271  |  Dzorwulu: 0533634378',
    'Open Monday - Sunday, 9:00 AM - 9:30 PM',
    'mayfordfoods@gmail.com',
  ].join('\n');
}
