/** Typed fetch client for the Mayford Foods API (same-origin /api). */

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

export const api = {
  get: <T = any>(path: string) => request<T>(path),
  post: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: <T = any>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T = any>(path: string, formData: FormData) => request<T>(path, { method: 'POST', body: formData }),
  uploadPut: <T = any>(path: string, formData: FormData) => request<T>(path, { method: 'PUT', body: formData }),
};
