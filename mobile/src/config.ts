import Constants from 'expo-constants';

/**
 * Backend API adresi.
 * - Android emülatör: http://10.0.2.2:5080 (host makineye erişim)
 * - iOS simülatör / web: http://localhost:5080
 * - Gerçek cihaz: bilgisayarınızın LAN IP'si (örn. http://192.168.1.20:5080)
 * app.json -> expo.extra.apiUrl alanından okunur.
 */
export const API_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) || 'http://10.0.2.2:5080';
