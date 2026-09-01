import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse } from './types';

const baseURL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({ baseURL });

const ACCESS_KEY = 'pdks_access';
const REFRESH_KEY = 'pdks_refresh';
const USER_KEY = 'pdks_user';

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(auth: AuthResponse) {
    localStorage.setItem(ACCESS_KEY, auth.accessToken);
    localStorage.setItem(REFRESH_KEY, auth.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  },
  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// İstek: access token ekle
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Yanıt: 401'de bir kez refresh dene
let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refresh = tokenStore.refresh;
  if (!refresh) return null;
  try {
    const { data } = await axios.post<AuthResponse>(`${baseURL}/api/auth/refresh`, {
      refreshToken: refresh,
    });
    tokenStore.set(data);
    return data.accessToken;
  } catch {
    tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshing = refreshing ?? doRefresh();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      // Refresh başarısız → login'e
      if (location.pathname !== '/login') location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/** API hata mesajını okunaklı şekilde döner. */
export function apiError(e: unknown): string {
  const err = e as AxiosError<{ message?: string }>;
  return err.response?.data?.message || err.message || 'Beklenmeyen bir hata oluştu.';
}
