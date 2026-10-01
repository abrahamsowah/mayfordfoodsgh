import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, History, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { api } from '../../api';
import type { AuditEntry } from '../../types';
import { Alert, Badge, Button, DataTable, EmptyRow, IconTile, Input, PageHeader, Panel, Spinner, Td, Th } from '../../components/ui';

const ACTOR_TONE: Record<string, 'neutral' | 'brand' | 'flame' | 'success' | 'warning' | 'danger' | 'info'> = {
  admin: 'brand',
  customer: 'info',
  system: 'neutral',
};

/** Actions worth shouting about in the UI. */
const SENSITIVE = /(reset_all|delete|password|status|cancel|mismatch|failed|rejected)/i;

export default function AdminAuditLogs() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [action, setAction] = useState('');
  const [actorType, setActorType] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(
    async (nextLimit = limit) => {
      setBusy(true);
      setError('');
      try {
        const params = new URLSearchParams({ limit: String(nextLimit) });
        if (action) params.set('action', action);
        if (actorType) params.set('actor_type', actorType);
        if (search.trim()) params.set('search', search.trim());
        const res = await api.get<{ entries: AuditEntry[]; total: number; actions: string[] }>(`/admin/audit-logs?${params.toString()}`);
        setEntries(res.entries);
        setTotal(res.total);
        setActions(res.actions);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [action, actorType, search, limit]
  );

  useEffect(() => {
    void load(limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, actorType]);

  return (
    <>
      <PageHeader
        icon={History}
        title="Audit log"
        subtitle="Every privileged action — who did what, when and from where. Financial and staff accountability."
        action={
          <Button variant="outline" size="md" icon={RefreshCw} onClick={() => void load(limit)} loading={busy}>
            Refresh
          </Button>
        }
      />

      {error && <Alert tone="red">{error}</Alert>}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <div className="flex items-center gap-3">
            <IconTile icon={History} tone="light" size="sm" />
            <div>
              <p className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-ink-400">Entries recorded</p>
              <p className="text-[20px] font-extrabold tabular-nums text-ink-900">{total.toLocaleString()}</p>
            </div>
          </div>
        </Panel>
        <Panel className="p-5">
          <div className="flex items-center gap-3">
            <IconTile icon={ShieldCheck} tone="light" size="sm" />
            <div>
              <p className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-ink-400">Distinct actions</p>
              <p className="text-[20px] font-extrabold tabular-nums text-ink-900">{actions.length}</p>
            </div>
          </div>
        </Panel>
        <Panel className="p-5">
          <div className="flex items-center gap-3">
            <IconTile icon={AlertTriangle} tone="flame" size="sm" />
            <div>
              <p className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-ink-400">Sensitive in view</p>
              <p className="text-[20px] font-extrabold tabular-nums text-ink-900">{entries.filter((e) => SENSITIVE.test(e.action)).length}</p>
            </div>
          </div>
        </Panel>
      </div>

      <form
        className="mb-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void load(limit);
        }}
      >
        <div className="min-w-[220px] flex-1">
          <Input placeholder="Search actor, action or record" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="h-11 rounded-tile border border-ink-200 bg-white px-3.5 text-[13.5px] font-semibold text-ink-700 outline-none focus:border-mayford-500"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={actorType}
          onChange={(e) => setActorType(e.target.value)}
          className="h-11 rounded-tile border border-ink-200 bg-white px-3.5 text-[13.5px] font-semibold text-ink-700 outline-none focus:border-mayford-500"
        >
          <option value="">Everyone</option>
          <option value="admin">Admins</option>
          <option value="customer">Customers</option>
          <option value="system">System</option>
        </select>
        <Button type="submit" variant="primary" size="md" icon={Search}>
          Filter
        </Button>
      </form>

      <Panel className="overflow-hidden">
        {busy ? (
          <Spinner className="py-16" />
        ) : (
          <>
            <DataTable
              head={
                <>
                  <Th>When</Th>
                  <Th>Who</Th>
                  <Th>Action</Th>
                  <Th>Record</Th>
                  <Th>IP</Th>
                  <Th />
                </>
              }
            >
              <tbody>
                {entries.length === 0 && <EmptyRow colSpan={6} text="No audit entries match those filters." />}
                {entries.map((e) => (
                  <tr key={e.id} className={SENSITIVE.test(e.action) ? 'bg-flame-50/40' : undefined}>
                    <Td className="whitespace-nowrap text-[12.5px] text-ink-600">{e.created_at}</Td>
                    <Td>
                      <span className="block font-semibold text-ink-800">{e.actor_name || '—'}</span>
                      <Badge tone={ACTOR_TONE[e.actor_type] || 'neutral'}>{e.actor_type}</Badge>
                    </Td>
                    <Td className="font-mono text-[12.5px] font-semibold text-ink-700">{e.action}</Td>
                    <Td className="text-[12.5px] text-ink-600">
                      {e.entity ? `${e.entity}${e.entity_id ? ` #${e.entity_id}` : ''}` : '—'}
                    </Td>
                    <Td className="text-[12px] text-ink-500">{e.ip || '—'}</Td>
                    <Td className="!text-right">
                      {e.meta && (
                        <button
                          type="button"
                          onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                          className="inline-flex items-center gap-1 text-[12px] font-bold text-mayford-700 hover:underline"
                        >
                          {expanded === e.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          Details
                        </button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            {expanded !== null && (
              <div className="border-t border-ink-100 bg-ink-50/70 px-5 py-4">
                <p className="mb-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-ink-400">
                  Entry #{expanded} details
                </p>
                <pre className="overflow-x-auto rounded-tile border border-ink-200 bg-white p-3 text-[12px] text-ink-700">
                  {prettyMeta(entries.find((x) => x.id === expanded)?.meta)}
                </pre>
                {entries.find((x) => x.id === expanded)?.user_agent && (
                  <p className="mt-2 text-[11.5px] text-ink-500">Device: {entries.find((x) => x.id === expanded)?.user_agent}</p>
                )}
              </div>
            )}
          </>
        )}
      </Panel>

      {entries.length < total && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              const next = limit + 50;
              setLimit(next);
              void load(next);
            }}
            loading={busy}
          >
            Load more ({total - entries.length} remaining)
          </Button>
        </div>
      )}
    </>
  );
}

function prettyMeta(meta?: string | null): string {
  if (!meta) return 'No extra details recorded.';
  try {
    return JSON.stringify(JSON.parse(meta), null, 2);
  } catch {
    return meta;
  }
}
