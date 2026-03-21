const SESSION_KEY = 'vopak_auth_session';

const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'Password@876';

const isBrowser = typeof window !== 'undefined';

export function login(username: string, password: string): boolean {
  if (username === VALID_USERNAME && password === VALID_PASSWORD) {
    if (isBrowser) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name: 'BWC Admin', role: 'Administrator' }));
    return true;
  }
  return false;
}

export function logout(): void {
  if (isBrowser) {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = '/login';
  }
}

export function isAuthenticated(): boolean {
  if (!isBrowser) return false;
  return sessionStorage.getItem(SESSION_KEY) !== null;
}

export function getUser(): { name: string; role: string } | null {
  if (!isBrowser) return null;
  const data = sessionStorage.getItem(SESSION_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
