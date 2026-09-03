import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { notificationApi } from './api/services';

/**
 * Anlık (push) bildirim kaydı. Girişten sonra çağrılır: cihazın Expo push token'ını
 * alır ve backend'e kaydeder. Böylece bordro/izin/onay bildirimleri telefona düşer.
 * İzin verilmezse veya emülatörde token alınamazsa sessizce atlanır.
 */

// Uygulama açıkken gelen bildirim davranışı
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let currentToken: string | null = null;

export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return; // emülatörde push token alınamaz

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Genel',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      (Constants.expoConfig?.extra as any)?.eas?.projectId ||
      (Constants as any)?.easConfig?.projectId;

    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResp.data;
    if (!token) return;

    currentToken = token;
    await notificationApi.registerDevice(token, Platform.OS);
  } catch {
    // Bildirim best-effort'tur; hata uygulamayı etkilemez.
  }
}

export async function unregisterForPush(): Promise<void> {
  try {
    if (currentToken) {
      await notificationApi.unregisterDevice(currentToken);
      currentToken = null;
    }
  } catch {
    // yoksay
  }
}
