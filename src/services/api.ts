/** Base URL for API calls. Empty string for dev (relative paths), full URL for production. */
const BASE = import.meta.env.VITE_API_BASE_URL || '';

interface RequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  credentials?: RequestCredentials;
}

type BodyInit = Blob | FormData | URLSearchParams | ReadableStream<Uint8Array> | string;
type RequestCredentials = 'omit' | 'same-origin' | 'include';

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
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}
