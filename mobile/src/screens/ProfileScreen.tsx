import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme';

const roleLabels: Record<string, string> = {
  Admin: 'Yönetici',
  Manager: 'Amir',
  Personnel: 'Personel',
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const initials = (user?.fullName || user?.username || '?')
    .split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
      <Text style={styles.name}>{user?.fullName || user?.username}</Text>
      <Text style={styles.role}>{roleLabels[user?.role || 'Personnel']}</Text>

      <View style={styles.info}>
        <Text style={styles.infoRow}>Kullanıcı adı: <Text style={styles.infoVal}>{user?.username}</Text></Text>
      </View>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', paddingTop: 60, padding: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 34, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 16 },
  role: { color: colors.muted, marginTop: 4 },
  info: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 26, width: '100%', borderWidth: 1, borderColor: colors.border },
  infoRow: { color: colors.muted },
  infoVal: { color: colors.text, fontWeight: '600' },
  logout: { backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 15, paddingHorizontal: 50, marginTop: 30 },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
