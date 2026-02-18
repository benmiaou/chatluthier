/** Base URL for API calls. Empty string works both in dev (via Vite proxy) and prod. */
const BASE = '';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body: formData, credentials: 'include' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}
