import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { notificationApi } from '../api/services';
import { colors, spacing, radius, tints } from '../theme';
import { Screen, Card, Empty } from '../components/ui';

const typeIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  payroll: 'wallet-outline', leave: 'calendar-outline', announcement: 'megaphone-outline',
  approval: 'checkmark-done-outline', info: 'information-circle-outline',
};

export default function NotificationsScreen() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notif-my'], queryFn: () => notificationApi.my() });
  const readAll = useMutation({ mutationFn: () => notificationApi.readAll(), onSuccess: () => qc.invalidateQueries({ queryKey: ['notif-my'] }) });
  const readOne = useMutation({ mutationFn: (id: number) => notificationApi.read(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['notif-my'] }) });

  const items = q.data?.items ?? [];

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      {(q.data?.unread ?? 0) > 0 && (
        <TouchableOpacity style={styles.readAll} onPress={() => readAll.mutate()}>
          <Ionicons name="checkmark-done" size={16} color={colors.primary} />
          <Text style={styles.readAllText}>Tümünü okundu işaretle ({q.data!.unread})</Text>
        </TouchableOpacity>
      )}

      {items.length === 0 ? (
        <Card><Empty text="Bildiriminiz yok." icon="notifications-outline" /></Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {items.map((n, i) => {
            const t = tints[i % tints.length];
            return (
              <Card key={n.id} onPress={() => !n.isRead && readOne.mutate(n.id)} style={n.isRead ? undefined : styles.unread}>
                <View style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: t.bg }]}><Ionicons name={typeIcon[n.type] || 'notifications-outline'} size={18} color={t.fg} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{n.title}</Text>
                    <Text style={styles.body}>{n.body}</Text>
                    <Text style={styles.date}>{new Date(n.createdAt).toLocaleString('tr-TR')}</Text>
                  </View>
                  {!n.isRead && <View style={styles.dot} />}
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  readAll: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginBottom: spacing.md },
  readAllText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  unread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  row: { flexDirection: 'row', gap: spacing.md },
  icon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  body: { fontSize: 13, color: colors.subtext, marginTop: 2 },
  date: { fontSize: 11, color: colors.faint, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4 },
});
