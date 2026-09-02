import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import type { AuthResponse } from './types';

const ACCESS_KEY = 'pdks_access';
const REFRESH_KEY = 'pdks_refresh';
const USER_KEY = 'pdks_user';

// İnterceptor'ın senkron çalışabilmesi için token'ı bellekte de tutuyoruz.
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

export const session = {
  async hydrate() {
    accessToken = await AsyncStorage.getItem(ACCESS_KEY);
    refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthResponse['user']) : null;
  },
  async save(auth: AuthResponse) {
    accessToken = auth.accessToken;
    refreshToken = auth.refreshToken;
    await AsyncStorage.multiSet([
      [ACCESS_KEY, auth.accessToken],
      [REFRESH_KEY, auth.refreshToken],
      [USER_KEY, JSON.stringify(auth.user)],
    ]);
  },
  async clear() {
    accessToken = null;
    refreshToken = null;
    await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY, USER_KEY]);
  },
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;
async function doRefresh(): Promise<string | null> {
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<AuthResponse>(`${API_URL}/api/auth/refresh`, { refreshToken });
    await session.save(data);
    return data.accessToken;
  } catch {
    await session.clear();
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
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

/** İndirme isteklerinde Authorization başlığı için erişim jetonu. */
export function getAccessToken(): string | null {
  return accessToken;
}

export function apiError(e: unknown): string {
  const err = e as AxiosError<{ message?: string }>;
  return err.response?.data?.message || err.message || 'Beklenmeyen bir hata oluştu.';
}
