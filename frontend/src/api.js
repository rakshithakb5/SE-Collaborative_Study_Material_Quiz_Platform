// Small helper for calling the backend.
// Returns { ok, status, data } and never throws on HTTP errors.

export async function postJson(path, body) {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { error: 'Cannot reach the server. Is the backend running?' },
    };
  }
}

// The login token is kept for this browser tab only.
const TOKEN_KEY = 'csq_token';

export function saveToken(token) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage unavailable: the user just has to log in again after a reload
  }
}

export function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}
