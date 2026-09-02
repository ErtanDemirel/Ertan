import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { payrollApi } from '../api/services';
import { getAccessToken } from '../api/client';
import { API_URL } from '../config';
import { colors } from '../theme';

const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function PayrollScreen() {
  const list = useQuery({ queryKey: ['my-payroll'], queryFn: () => payrollApi.my() });
  const [busyId, setBusyId] = useState<number | null>(null);

  async function openPayslip(id: number, fileName: string) {
    setBusyId(id);
    try {
      const dest = FileSystem.cacheDirectory + fileName.replace(/[^\w.\-]/g, '_');
      const token = getAccessToken();
      const res = await FileSystem.downloadAsync(`${API_URL}${payrollApi.fileUrl(id)}`, dest, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.status !== 200) throw new Error('İndirilemedi');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.uri);
      } else {
        Alert.alert('İndirildi', 'Bordro cihazınıza kaydedildi.');
      }
    } catch {
      Alert.alert('Hata', 'Bordro açılamadı.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={list.isFetching} onRefresh={() => list.refetch()} />}>
      <Text style={styles.header}>Bordrolarım</Text>
      {list.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : (list.data?.length ?? 0) === 0 ? (
        <Text style={styles.empty}>Henüz bordronuz yüklenmemiş.</Text>
      ) : (
        list.data!.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.period}>{months[p.month - 1]} {p.year}</Text>
              {p.netAmount != null ? <Text style={styles.net}>Net: {p.netAmount.toLocaleString('tr-TR')} ₺</Text> : null}
              {p.note ? <Text style={styles.note}>{p.note}</Text> : null}
            </View>
            <TouchableOpacity style={styles.btn} onPress={() => openPayslip(p.id, p.fileName)} disabled={busyId === p.id}>
              {busyId === p.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Aç / İndir</Text>}
            </TouchableOpacity>
          </View>
        ))
      )}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  header: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 14 },
  empty: { color: colors.muted, fontStyle: 'italic' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  period: { fontWeight: '700', color: colors.text, fontSize: 15 },
  net: { color: colors.muted, marginTop: 3 },
  note: { color: colors.muted, fontSize: 12, marginTop: 2 },
  btn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  btnText: { color: '#fff', fontWeight: '700' },
});
