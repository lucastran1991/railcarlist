import { API_BASE_URL } from '@/lib/config';

const ACCESS_TOKEN_KEY = 'vopak_access_token';
const REFRESH_TOKEN_KEY = 'vopak_refresh_token';
const USER_KEY = 'vopak_user';

const isBrowser = typeof window !== 'undefined';

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url: string;
}

export async function login(username: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (isBrowser) {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      // Load user preferences and apply to localStorage for theme/mode init
      try {
        const prefsRes = await fetch(`${API_BASE_URL}/api/auth/preferences`, {
          headers: { 'Authorization': `Bearer ${data.access_token}` },
        });
        if (prefsRes.ok) {
          const prefs = await prefsRes.json();
          if (prefs.colorMode) localStorage.setItem('theme', prefs.colorMode);
          if (prefs.theme) localStorage.setItem('vopak_color_theme', prefs.theme);
        }
      } catch { /* preferences are optional */ }
    }
    return true;
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  if (!isBrowser) return;

  // Server-side logout (best effort — don't block on failure)
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    }).catch(() => {}); // fire and forget
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = '/login';
}

export function isAuthenticated(): boolean {
  if (!isBrowser) return false;
  return localStorage.getItem(ACCESS_TOKEN_KEY) !== null;
}

export function getAccessToken(): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (!isBrowser) return null;
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export interface UserPreferences {
  colorMode?: 'dark' | 'light';
  theme?: string;
}

export async function getPreferences(): Promise<UserPreferences> {
  if (!isBrowser) return {};
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return {};
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/preferences`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  if (!isBrowser) return;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return;
  fetch(`${API_BASE_URL}/api/auth/preferences`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  }).catch(() => {}); // fire and forget
}

export async function refreshTokens(): Promise<boolean> {
  if (!isBrowser) return false;
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      logout();
      return false;
    }

    const data = await res.json();
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}
