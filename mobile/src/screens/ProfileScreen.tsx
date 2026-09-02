import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { notificationApi } from '../api/services';
import { colors } from '../theme';

const roleLabels: Record<string, string> = {
  Admin: 'Yönetici', Manager: 'Amir', Personnel: 'Personel',
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const initials = (user?.fullName || user?.username || '?')
    .split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  const notifs = useQuery({ queryKey: ['notifications'], queryFn: () => notificationApi.my() });
  const read = useMutation({
    mutationFn: (id: number) => notificationApi.read(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const readAll = useMutation({
    mutationFn: () => notificationApi.readAll(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <ScrollView style={styles.container}
      refreshControl={<RefreshControl refreshing={notifs.isFetching} onRefresh={() => notifs.refetch()} />}>
      <View style={styles.top}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        <Text style={styles.name}>{user?.fullName || user?.username}</Text>
        <Text style={styles.role}>{roleLabels[user?.role || 'Personnel']}</Text>
      </View>

      {/* Bildirimler */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>
            Bildirimler {(notifs.data?.unread ?? 0) > 0 ? `(${notifs.data!.unread})` : ''}
          </Text>
          {(notifs.data?.unread ?? 0) > 0 && (
            <TouchableOpacity onPress={() => readAll.mutate()}><Text style={styles.link}>Tümünü okundu yap</Text></TouchableOpacity>
          )}
        </View>
        {(notifs.data?.items.length ?? 0) === 0 ? (
          <Text style={styles.empty}>Bildirim yok.</Text>
        ) : (
          notifs.data!.items.map((n) => (
            <TouchableOpacity key={n.id} style={[styles.notif, !n.isRead && styles.notifUnread]} onPress={() => !n.isRead && read.mutate(n.id)}>
              <Text style={styles.notifTitle}>{n.title}</Text>
              <Text style={styles.notifBody}>{n.body}</Text>
              <Text style={styles.notifDate}>{new Date(n.createdAt).toLocaleString('tr-TR')}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  top: { alignItems: 'center', paddingTop: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 14 },
  role: { color: colors.muted, marginTop: 3 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 24, borderWidth: 1, borderColor: colors.border },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontWeight: '700', color: colors.text },
  link: { color: colors.primary, fontSize: 12 },
  empty: { color: colors.muted, fontStyle: 'italic', fontSize: 13, paddingVertical: 8 },
  notif: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 10 },
  notifUnread: { backgroundColor: '#eff6ff' },
  notifTitle: { fontWeight: '700', color: colors.text, fontSize: 14 },
  notifBody: { color: colors.muted, fontSize: 13, marginTop: 2 },
  notifDate: { color: '#94a3b8', fontSize: 11, marginTop: 4 },
  logout: { backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
