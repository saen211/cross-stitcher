const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api';
const SESSION_KEY = 'xstitch_session_token';

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionToken(token: string): void {
  localStorage.setItem(SESSION_KEY, token);
}

export function clearSessionToken(): void {
  localStorage.removeItem(SESSION_KEY);
}

/** status 0 = network failure (server unreachable). */
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/** True when the backend can't be reached (network error, or proxy 5xx such as Caddy's 502). */
export function isOfflineError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 0 || err.status >= 500);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['X-Session-Token'] = token;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Server unreachable', 0);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError((body as { error?: string }).error ?? `HTTP ${res.status}`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
