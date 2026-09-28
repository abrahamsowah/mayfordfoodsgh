import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api';
import { Alert, Btn, Field, Input, Section } from '../../components/ui';
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
      setMessage({ tone: 'green', text: d.message || 'Settings Updated Successfully' });
    } catch (err) {
      setMessage({ tone: 'red', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return (
      <Section>
        <p className="text-center text-gray-500">Loading settings…</p>
      </Section>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-md">
      <h1 className="mb-6 text-center text-2xl font-bold text-mayford">Website Settings</h1>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <form onSubmit={submit} className="mx-auto max-w-2xl">
        <Field label="Email">
          <Input name="email" type="email" defaultValue={settings.email} required />
        </Field>
        <Field label="Adabraka Phone">
          <Input name="adabraka_phone" defaultValue={settings.adabraka_phone} required />
        </Field>
        <Field label="Dzorwulu Phone">
          <Input name="dzorwulu_phone" defaultValue={settings.dzorwulu_phone} required />
        </Field>
        <Field label="Facebook Link">
          <Input name="facebook_link" type="url" defaultValue={settings.facebook_link} required />
        </Field>
        <Field label="TikTok Link">
          <Input name="tiktok_link" type="url" defaultValue={settings.tiktok_link} required />
        </Field>
        <Field label="Opening Hours">
          <Input name="opening_hours" defaultValue={settings.opening_hours} required />
        </Field>
        <Btn type="submit" disabled={busy} className="w-full">
          {busy ? 'Saving…' : 'Update Settings'}
        </Btn>
      </form>
    </div>
  );
}
