/**
 * Audit trail — every privileged action is recorded with who/what/when/where.
 * Required for a business system: disputes, staff accountability, forensics.
 */
import type { Request } from 'express';
import { execute, nowSql, query } from './db';
import { clientIp } from './security';

export interface AuditInput {
  action: string;
  entity?: string;
  entityId?: string | number | null;
  meta?: Record<string, any> | null;
}

export async function recordAudit(req: Request, input: AuditInput): Promise<void> {
  try {
    const actorType = req.session?.admin_id ? 'admin' : req.session?.customer_id ? 'customer' : 'system';
    await execute(
      `INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity, entity_id, meta, ip, user_agent, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        actorType,
        req.session?.admin_id ?? req.session?.customer_id ?? null,
        req.session?.admin_name ?? req.session?.customer_name ?? null,
        input.action,
        input.entity ?? null,
        input.entityId !== undefined && input.entityId !== null ? String(input.entityId) : null,
        input.meta ? JSON.stringify(input.meta).slice(0, 4000) : null,
        clientIp(req),
        String(req.headers['user-agent'] || '').slice(0, 300),
        nowSql(),
      ]
    );
  } catch (err) {
    // Auditing must never take the request down with it.
    console.warn('[audit] failed to record entry:', (err as Error).message);
  }
}

/** Records a non-request event (jobs, webhooks, migrations). */
export async function recordSystemEvent(input: AuditInput & { actorName?: string; ip?: string }): Promise<void> {
  try {
    await execute(
      `INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity, entity_id, meta, ip, user_agent, created_at)
       VALUES ('system', NULL, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [
        input.actorName ?? 'system',
        input.action,
        input.entity ?? null,
        input.entityId !== undefined && input.entityId !== null ? String(input.entityId) : null,
        input.meta ? JSON.stringify(input.meta).slice(0, 4000) : null,
        input.ip ?? null,
        nowSql(),
      ]
    );
  } catch {
    /* ignore */
  }
}

export async function listAudit({
  limit = 100,
  offset = 0,
  action,
  actorType,
  search,
}: {
  limit?: number;
  offset?: number;
  action?: string;
  actorType?: string;
  search?: string;
}) {
  const where: string[] = ['1=1'];
  const params: any[] = [];
  if (action) {
    where.push('action = ?');
    params.push(action);
  }
  if (actorType) {
    where.push('actor_type = ?');
    params.push(actorType);
  }
  if (search) {
    where.push('(actor_name LIKE ? OR entity LIKE ? OR action LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const rows = await query(
    `SELECT * FROM audit_logs WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );
  const total = await query(`SELECT COUNT(*) AS c FROM audit_logs WHERE ${where.join(' AND ')}`, params);
  const actions = await query('SELECT DISTINCT action FROM audit_logs ORDER BY action');
  return { entries: rows, total: Number(total[0]?.c || 0), actions: actions.map((a) => String(a.action)) };
}
