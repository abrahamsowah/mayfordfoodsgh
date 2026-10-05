/** Typed fetch client for the Mayford Foods API (same-origin /api). */
import { refreshRuntimeImageManifest } from './lib/imageManifest';

export class ApiError extends Error {
  status: number;
  needLogin?: boolean;
  needPin?: boolean;
  constructor(status: number, message: string, needLogin = false, needPin = false) {
    super(message);
    this.status = status;
    this.needLogin = needLogin;
    this.needPin = needPin;
  }
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    ...(path === '/auth/session' ? { cache: 'no-store' as const } : {}),
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok || (data && data.ok === false)) {
    throw new ApiError(
      res.status,
      (data && (data.error || data.message)) || `Request failed (${res.status})`,
      !!(data && data.needLogin),
      !!(data && data.needPin)
    );
  }
  return data as T;
}

type MediaUploadTicket = {
  field: string;
  dir: 'images' | 'adverts' | 'videos' | 'community';
  key: string;
  signedUrl: string;
  publicUrl: string;
  contentType: string;
  apiKey?: string;
};

/**
 * Submit a multipart admin form. When Supabase Storage is configured, file bytes
 * go directly to a narrowly scoped signed Storage URL (so large videos do not
 * pass through Vercel's serverless body limit); only metadata returns to the API.
 * Local development without Storage keeps using the existing local upload route.
 */
async function uploadRequest<T = any>(path: string, formData: FormData, method: 'POST' | 'PUT'): Promise<T> {
  const entries = [...formData.entries()];
  const files = entries.flatMap(([field, value]) =>
    value instanceof File && value.size > 0 ? [{ field, file: value }] : []
  );
  entries.forEach(([field, value]) => {
    if (value instanceof File && value.size === 0) formData.delete(field);
  });
  if (files.length === 0) {
    const result = await request<T>(path, { method, body: formData });
    void refreshRuntimeImageManifest();
    return result;
  }

  const submitLocal = async () => {
    const result = await request<T>(path, { method, body: formData });
    void refreshRuntimeImageManifest();
    return result;
  };
  const signed = await request<{ mode: 'local' | 'supabase'; uploads?: MediaUploadTicket[] }>(
    '/admin/media/sign',
    {
      method: 'POST',
      body: JSON.stringify({
        target: path,
        files: files.map(({ field, file }) => ({ field, fileName: file.name, size: file.size })),
      }),
    }
  );
  if (signed.mode === 'local') return submitLocal();

  const tickets = signed.uploads || [];
  if (tickets.length !== files.length) {
    throw new Error('The media upload could not be prepared. Please try again.');
  }
  const uploaded: Array<{ dir: MediaUploadTicket['dir']; key: string }> = [];
  try {
    for (const ticket of tickets) {
      const source = files.find((item) => item.field === ticket.field)?.file;
      if (!source) throw new Error(`Missing selected file for ${ticket.field}.`);

      // Match Supabase's uploadToSignedUrl wire format: a PUT to the one-use URL,
      // with the file and long-lived cache policy in a multipart body.
      const body = new FormData();
      body.append('cacheControl', '31536000');
      body.append('', source.slice(0, source.size, ticket.contentType), source.name);
      uploaded.push({ dir: ticket.dir, key: ticket.key });
      const result = await fetch(ticket.signedUrl, {
        method: 'PUT',
        headers: {
          'x-upsert': 'false',
          ...(ticket.apiKey ? { apikey: ticket.apiKey, authorization: `Bearer ${ticket.apiKey}` } : {}),
        },
        body,
      });
      if (!result.ok) {
        const detail = (await result.text().catch(() => '')).trim();
        throw new Error(detail || `Supabase Storage upload failed (${result.status}).`);
      }

      const finalized = await request<{ publicUrl: string }>('/admin/media/finalize', {
        method: 'POST',
        body: JSON.stringify({ dir: ticket.dir, key: ticket.key }),
      });
      formData.delete(ticket.field);
      formData.set(`${ticket.field}_url`, finalized.publicUrl);
    }

    const result = await request<T>(path, { method, body: formData });
    void refreshRuntimeImageManifest();
    return result;
  } catch (error) {
    if (uploaded.length > 0) {
      await request('/admin/media/discard', {
        method: 'POST',
        body: JSON.stringify({ uploads: uploaded }),
      }).catch(() => undefined);
    }
    throw error;
  }
}

export const api = {
  get: <T = any>(path: string) => request<T>(path),
  post: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: async <T = any>(path: string) => {
    const result = await request<T>(path, { method: 'DELETE' });
    if (/^\/admin\/(menu|adverts|slides|community|videos)(\/|$)/.test(path)) {
      void refreshRuntimeImageManifest();
    }
    return result;
  },
  upload: <T = any>(path: string, formData: FormData) => uploadRequest<T>(path, formData, 'POST'),
  uploadPut: <T = any>(path: string, formData: FormData) => uploadRequest<T>(path, formData, 'PUT'),
};
