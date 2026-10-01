import { useCallback, useEffect, useState } from 'react';
import { Download, Mail, Phone, Search, UserCheck, UserX, Users } from 'lucide-react';
import { api } from '../../api';
import type { AdminCustomer } from '../../types';
import { ghs } from '../../utils';
import { Alert, Badge, Button, DataTable, EmptyRow, IconTile, Input, PageHeader, Panel, Spinner, Td, Th } from '../../components/ui';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(
    async (term = '') => {
      setBusy(true);
      setError('');
      try {
        const res = await api.get<{ customers: AdminCustomer[] }>(`/admin/customers${term ? `?search=${encodeURIComponent(term)}` : ''}`);
        setCustomers(res.customers);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(customer: AdminCustomer) {
    const next = customer.status === 'active' ? 'disabled' : 'active';
    try {
      await api.put(`/admin/customers/${customer.id}/status`, { status: next });
      setNotice(`${customer.full_name} is now ${next}.`);
      await load(search);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function exportCsv() {
    const header = ['Name', 'Email', 'Phone', 'Orders', 'Total spent', 'Last order', 'Status', 'Joined'];
    const rows = customers.map((c) => [
      c.full_name,
      c.email,
      c.phone || '',
      String(c.orders_count),
      String(c.total_spent),
      c.last_order_at || '',
      c.status,
      c.created_at,
    ]);
    const csv = [header, ...rows].map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mayford-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalSpent = customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);

  return (
    <>
      <PageHeader
        icon={Users}
        title="Customers"
        subtitle="Everyone who created an account — with their order history and lifetime value."
        action={
          <Button variant="outline" size="md" icon={Download} onClick={exportCsv} disabled={customers.length === 0}>
            Export CSV
          </Button>
        }
      />

      {error && <Alert tone="red">{error}</Alert>}
      {notice && <Alert tone="green">{notice}</Alert>}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <div className="flex items-center gap-3">
            <IconTile icon={Users} tone="light" size="sm" />
            <div>
              <p className="text-[12px] font-semibold text-ink-400">Accounts</p>
              <p className="text-[20px] font-semibold tabular-nums text-ink-900">{customers.length}</p>
            </div>
          </div>
        </Panel>
        <Panel className="p-5">
          <div className="flex items-center gap-3">
            <IconTile icon={UserCheck} tone="light" size="sm" />
            <div>
              <p className="text-[12px] font-semibold text-ink-400">Repeat customers</p>
              <p className="text-[20px] font-semibold tabular-nums text-ink-900">{customers.filter((c) => c.orders_count > 1).length}</p>
            </div>
          </div>
        </Panel>
        <Panel className="p-5">
          <div className="flex items-center gap-3">
            <IconTile icon={UserCheck} tone="light" size="sm" />
            <div>
              <p className="text-[12px] font-semibold text-ink-400">Lifetime value</p>
              <p className="text-[20px] font-semibold tabular-nums text-ink-900">{ghs(totalSpent)}</p>
            </div>
          </div>
        </Panel>
      </div>

      <form
        className="mb-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void load(search.trim());
        }}
      >
        <div className="min-w-[240px] flex-1">
          <Input placeholder="Search by name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button type="submit" variant="primary" size="md" icon={Search}>
          Search
        </Button>
      </form>

      <Panel className="overflow-hidden">
        {busy ? (
          <Spinner className="py-16" />
        ) : (
          <DataTable
            head={
              <>
                <Th>Customer</Th>
                <Th>Contact</Th>
                <Th className="!text-right">Orders</Th>
                <Th className="!text-right">Spent</Th>
                <Th>Last order</Th>
                <Th>Status</Th>
                <Th className="!text-right">Actions</Th>
              </>
            }
          >
            <tbody>
              {customers.length === 0 && <EmptyRow colSpan={7} text="No customer accounts yet. Orders placed as a guest still appear under Orders." />}
              {customers.map((c) => (
                <tr key={c.id}>
                  <Td>
                    <span className="block font-semibold text-ink-900">{c.full_name}</span>
                    <span className="text-[12px] text-ink-500">Joined {c.created_at}</span>
                  </Td>
                  <Td>
                    <span className="flex items-center gap-1.5 text-[13px] text-ink-700">
                      <Mail className="h-3.5 w-3.5 text-ink-400" strokeWidth={2.2} />
                      {c.email}
                    </span>
                    {c.phone && (
                      <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-500">
                        <Phone className="h-3.5 w-3.5 text-ink-400" strokeWidth={2.2} />
                        {c.phone}
                      </span>
                    )}
                  </Td>
                  <Td className="!text-right tabular-nums font-semibold">{c.orders_count}</Td>
                  <Td className="!text-right tabular-nums font-semibold">{ghs(Number(c.total_spent || 0))}</Td>
                  <Td className="text-[13px] text-ink-500">{c.last_order_at || '—'}</Td>
                  <Td>
                    <Badge tone={c.status === 'active' ? 'success' : 'danger'}>{c.status}</Badge>
                    {Boolean(c.marketing_opt_in) && <Badge tone="neutral" className="ml-1">Opted in</Badge>}
                  </Td>
                  <Td className="!text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={c.status === 'active' ? UserX : UserCheck}
                      onClick={() => void toggle(c)}
                    >
                      {c.status === 'active' ? 'Disable' : 'Enable'}
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Panel>
    </>
  );
}
