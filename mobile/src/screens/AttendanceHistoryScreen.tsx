import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { attendanceApi, AttendanceRecord } from '../api/services';
import { colors, spacing, radius } from '../theme';
import { Screen, Card, StatTile, SectionHeader, Empty } from '../components/ui';

export default function AttendanceHistoryScreen() {
  const q = useQuery({ queryKey: ['att-my'], queryFn: () => attendanceApi.my() });
  const rows = q.data ?? [];

  const now = new Date();
  const thisMonth = rows.filter((r) => {
    const d = new Date(r.timestamp);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const checkIns = thisMonth.filter((r) => r.type === 'CheckIn').length;
  const daysWorked = new Set(thisMonth.map((r) => new Date(r.timestamp).toDateString())).size;
  const outside = thisMonth.filter((r) => !r.isWithinGeofence).length;

  // Güne göre grupla
  const byDay = new Map<string, AttendanceRecord[]>();
  for (const r of rows) {
    const key = new Date(r.timestamp).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', weekday: 'long' });
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(r);
  }

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      <View style={styles.statRow}>
        <StatTile label="Bu ay giriş" value={checkIns} tint={colors.primary} />
        <StatTile label="Çalışılan gün" value={daysWorked} tint={colors.success} />
        <StatTile label="Alan dışı" value={outside} tint={outside > 0 ? colors.danger : colors.muted} />
      </View>

      <SectionHeader title="Hareketler" />
      {rows.length === 0 ? (
        <Card><Empty text="Mesai kaydınız yok." icon="time-outline" /></Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {[...byDay.entries()].map(([day, recs]) => (
            <Card key={day}>
              <Text style={styles.day}>{day}</Text>
              {recs.map((r) => (
                <View key={r.id} style={styles.rec}>
                  <View style={[styles.badge, { backgroundColor: r.type === 'CheckIn' ? colors.successBg : colors.infoBg }]}>
                    <Ionicons name={r.type === 'CheckIn' ? 'log-in-outline' : 'log-out-outline'} size={16} color={r.type === 'CheckIn' ? colors.success : colors.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recType}>{r.type === 'CheckIn' ? 'Giriş' : 'Çıkış'}</Text>
                    <Text style={styles.recLoc}>{r.workLocationName || 'Lokasyon yok'} • {Math.round(r.distanceMeters)} m</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.recTime}>{new Date(r.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
                    {!r.isWithinGeofence && <Text style={styles.outside}>alan dışı</Text>}
                  </View>
                </View>
              ))}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: spacing.md },
  day: { fontSize: 13, fontWeight: '700', color: colors.subtext, marginBottom: spacing.sm, textTransform: 'capitalize' },
  rec: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  badge: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  recType: { fontSize: 14, fontWeight: '600', color: colors.text },
  recLoc: { fontSize: 12, color: colors.muted, marginTop: 1 },
  recTime: { fontSize: 14, fontWeight: '700', color: colors.text },
  outside: { fontSize: 11, color: colors.danger, marginTop: 1 },
});
