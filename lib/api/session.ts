import { api, getSessionToken, setSessionToken } from './client';

interface SessionResponse {
  token: string;
  createdAt: string;
}

/** Ensure a session token exists, creating one if needed. */
export async function ensureSession(): Promise<string> {
  const existing = getSessionToken();
  if (existing) return existing;

  const session = await api.post<SessionResponse>('/sessions', {});
  setSessionToken(session.token);
  return session.token;
}

/**
 * Import a session by token (cross-browser sync).
 * Returns true if the token was found on the server.
 */
export async function importSession(token: string): Promise<boolean> {
  try {
    await api.post<SessionResponse>('/sessions/import', { token });
    setSessionToken(token);
    return true;
  } catch {
    return false;
  }
}
