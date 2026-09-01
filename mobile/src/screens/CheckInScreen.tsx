import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { attendanceApi } from '../api/services';
import { apiError } from '../api/client';
import { colors } from '../theme';
import type { AttendanceResult } from '../api/types';

type Phase = 'idle' | 'scanning' | 'submitting' | 'result';

export default function CheckInScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locStatus, setLocStatus] = useState<Location.PermissionStatus | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then((p) => setLocStatus(p.status));
  }, []);

  async function startScan() {
    setError('');
    setResult(null);
    if (!permission?.granted) {
      const p = await requestPermission();
      if (!p.granted) {
        setError('Kamera izni verilmedi.');
        return;
      }
    }
    const loc = await Location.requestForegroundPermissionsAsync();
    setLocStatus(loc.status);
    if (loc.status !== 'granted') {
      setError('Konum izni verilmedi. Mesai girişi için konum zorunludur.');
      return;
    }
    setPhase('scanning');
  }

  async function onScanned({ data }: { data: string }) {
    if (phase !== 'scanning') return;
    setPhase('submitting');
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const res = await attendanceApi.check(
        data,
        pos.coords.latitude,
        pos.coords.longitude,
        `${Platform.OS} ${Platform.Version}`
      );
      setResult(res);
      setPhase('result');
    } catch (e) {
      setError(apiError(e));
      setPhase('result');
    }
  }

  // --- Sonuç ekranı ---
  if (phase === 'result') {
    const ok = !!result?.success;
    return (
      <View style={styles.center}>
        <View style={[styles.resultIcon, { backgroundColor: ok ? colors.success : colors.danger }]}>
          <Text style={styles.resultIconText}>{ok ? '✓' : '!'}</Text>
        </View>
        <Text style={styles.resultTitle}>
          {ok ? (result?.type === 'CheckIn' ? 'Mesai Girişi' : 'Mesai Çıkışı') : 'İşlem Başarısız'}
        </Text>
        <Text style={styles.resultMsg}>{result?.message || error}</Text>
        {ok && (
          <Text style={styles.resultMeta}>
            {result?.locationName} • {new Date(result!.timestamp).toLocaleTimeString('tr-TR')} •{' '}
            {Math.round(result!.distanceMeters)} m
          </Text>
        )}
        <TouchableOpacity style={styles.button} onPress={() => setPhase('idle')}>
          <Text style={styles.buttonText}>Tamam</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Kamera / tarama ---
  if (phase === 'scanning' || phase === 'submitting') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={phase === 'scanning' ? onScanned : undefined}
        />
        <View style={styles.overlay}>
          <View style={styles.frame} />
          <Text style={styles.overlayText}>
            {phase === 'submitting' ? 'Konum doğrulanıyor...' : 'QR kodu çerçeveye getirin'}
          </Text>
          {phase === 'submitting' && <ActivityIndicator color="#fff" size="large" style={{ marginTop: 12 }} />}
          <TouchableOpacity style={styles.cancel} onPress={() => setPhase('idle')}>
            <Text style={styles.cancelText}>İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Başlangıç ---
  return (
    <View style={styles.center}>
      <Text style={styles.qrEmoji}>📷</Text>
      <Text style={styles.title}>QR ile Mesai Giriş/Çıkış</Text>
      <Text style={styles.desc}>
        İş yerindeki QR kodu okutarak giriş/çıkış yapın. Konumunuz iş yeri alanında değilse kayıt oluşturulamaz.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={startScan}>
        <Text style={styles.buttonText}>QR Kodu Okut</Text>
      </TouchableOpacity>
      {locStatus === 'denied' && (
        <Text style={styles.warn}>Konum izni reddedilmiş. Ayarlardan izin vermelisiniz.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 28 },
  qrEmoji: { fontSize: 60, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  desc: { color: colors.muted, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, paddingHorizontal: 40, marginTop: 24 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger, marginTop: 14, textAlign: 'center' },
  warn: { color: colors.warning, marginTop: 14, fontSize: 12, textAlign: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, borderWidth: 3, borderColor: '#fff', borderRadius: 20, backgroundColor: 'transparent' },
  overlayText: { color: '#fff', marginTop: 20, fontSize: 15, fontWeight: '600' },
  cancel: { position: 'absolute', bottom: 60, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20 },
  cancelText: { color: '#fff', fontWeight: '600' },
  resultIcon: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  resultIconText: { color: '#fff', fontSize: 48, fontWeight: '800' },
  resultTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 18 },
  resultMsg: { color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  resultMeta: { color: colors.muted, fontSize: 12, marginTop: 10 },
});
