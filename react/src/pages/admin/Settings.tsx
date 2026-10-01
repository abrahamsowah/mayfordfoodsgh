import { useEffect, useState, type FormEvent } from 'react';
import { Bike, Clock, Mail, MessageCircle, Save, Settings as SettingsIcon, Share2 } from 'lucide-react';
import { api } from '../../api';
import {
  Alert,
  Badge,
  Button,
  Field,
  Input,
  PageHeader,
  Panel,
  Spinner,
} from '../../components/ui';
import type { Settings as SettingsType } from '../../types';

export default function AdminSettings() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [message, setMessage] = useState<{ tone: 'green' | 'red'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<{ settings: SettingsType | null }>('/admin/settings')
      .then((d) => setSettings(d.settings))
      .catch(() => undefined);
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    setMessage(null);
    try {
      const d = await api.put<{ message: string }>('/admin/settings', fd);
      setMessage({ tone: 'green', text: d.message || 'Settings updated successfully.' });
    } catch (err) {
      setMessage({ tone: 'red', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return (
      <div className="py-24">
        <Spinner className="py-0" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={SettingsIcon}
        title="Website settings"
        subtitle="Contact details and links used across the public website"
        action={
          <Badge tone="neutral" icon={Share2}>
            Applies site-wide
          </Badge>
        }
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <form onSubmit={submit} className="space-y-5">
        <Panel title="Contact & delivery" subtitle="Shown in the header, footer, outlet pages and WhatsApp buttons" icon={MessageCircle}>
          <div className="grid gap-x-4 md:grid-cols-2">
            <Field label="Email address">
              <Input name="email" type="email" defaultValue={settings.email} required />
            </Field>
            <Field label="Opening hours">
              <Input name="opening_hours" defaultValue={settings.opening_hours} required />
            </Field>
            <Field label="Adabraka phone" hint="Used for the Adabraka WhatsApp and call buttons.">
              <Input name="adabraka_phone" defaultValue={settings.adabraka_phone} required />
            </Field>
            <Field label="Dzorwulu phone" hint="Used for the Dzorwulu WhatsApp and call buttons.">
              <Input name="dzorwulu_phone" defaultValue={settings.dzorwulu_phone} required />
            </Field>
          </div>
        </Panel>

        <Panel title="Social profiles" subtitle="Linked from the footer and contact page" icon={Share2}>
          <div className="grid gap-x-4 md:grid-cols-2">
            <Field label="Facebook page URL">
              <Input name="facebook_link" type="url" defaultValue={settings.facebook_link} required />
            </Field>
            <Field label="TikTok profile URL">
              <Input name="tiktok_link" type="url" defaultValue={settings.tiktok_link} required />
            </Field>
          </div>
        </Panel>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-ink-200 bg-white p-4 shadow-xs">
          <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-500">
            <Bike className="h-4 w-4 text-ink-400" strokeWidth={2.3} />
            Bolt Food links live in the contact and outlets pages.
            <span className="hidden items-center gap-2 text-ink-400 sm:inline-flex">
              <Clock className="h-3.5 w-3.5" strokeWidth={2.3} /> Updated {new Date().toLocaleDateString()}
            </span>
          </p>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="md" icon={Mail} onClick={() => window.open(`mailto:${settings.email}`)}>
              Test email link
            </Button>
            <Button type="submit" variant="primary" size="md" icon={Save} loading={busy}>
              {busy ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
