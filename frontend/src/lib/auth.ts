const SESSION_KEY = 'vopak_auth_session';
const ACCESS_TOKEN_KEY = 'vopak_access_token';
const REFRESH_TOKEN_KEY = 'vopak_refresh_token';

import { API_BASE_URL } from '@/lib/config';

const isBrowser = typeof window !== 'undefined';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
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
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        name: data.user.username,
        role: data.user.role === 'admin' ? 'Administrator' : data.user.role,
      }));
    }
    return true;
  } catch {
    return false;
  }
}

export function logout(): void {
  if (isBrowser) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = '/login';
  }
}

export function isAuthenticated(): boolean {
  if (!isBrowser) return false;
  return localStorage.getItem(ACCESS_TOKEN_KEY) !== null;
}

export function getAccessToken(): string | null {
  if (!isBrowser) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
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
