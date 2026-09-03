import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../auth/AuthContext';
import { attendanceApi, leaveApi, announcementApi, notificationApi } from '../api/services';
import { colors, spacing, radius, shadow, tints } from '../theme';
import { Screen, Card, SectionHeader, StatTile, Empty } from '../components/ui';

function greetByHour() {
  const h = new Date().getHours();
  if (h < 12) return 'günaydın';
  if (h < 18) return 'iyi çalışmalar';
  return 'iyi akşamlar';
}

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const firstName = (user?.fullName || user?.username || '').split(' ')[0];

  const att = useQuery({ queryKey: ['att-my-home'], queryFn: () => attendanceApi.my() });
  const leave = useQuery({ queryKey: ['leave-my'], queryFn: () => leaveApi.my() });
  const anns = useQuery({ queryKey: ['announcements'], queryFn: () => announcementApi.list() });
  const notif = useQuery({ queryKey: ['notif-my'], queryFn: () => notificationApi.my() });

  const refreshing = att.isFetching || leave.isFetching;
  const onRefresh = () => { att.refetch(); leave.refetch(); anns.refetch(); notif.refetch(); };

  const last = att.data?.[0];
  const today = new Date().toDateString();
  const lastIsToday = last && new Date(last.timestamp).toDateString() === today;
  const nextAction = lastIsToday && last?.type === 'CheckIn' ? 'çıkış' : 'giriş';
  const statusText = !lastIsToday
    ? 'Bugün henüz mesai kaydınız yok'
    : last?.type === 'CheckIn' ? 'Giriş yapıldı' : 'Mesai tamamlandı';
  const statusTime = lastIsToday ? new Date(last!.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

  const balance = leave.data?.balance;
  const pending = (leave.data?.requests ?? []).filter((r) => r.status === 'Pending').length;

  const quick: { icon: keyof typeof Ionicons.glyphMap; label: string; go: () => void }[] = [
    { icon: 'calendar-outline', label: 'İzin / Talep', go: () => nav.navigate('Talepler') },
    { icon: 'time-outline', label: 'Mesai geçmişi', go: () => nav.navigate('AttendanceHistory') },
    { icon: 'wallet-outline', label: 'Bordrom', go: () => nav.navigate('Payroll') },
    { icon: 'restaurant-outline', label: 'Yemek', go: () => nav.navigate('Meals') },
  ];

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} contentStyle={{ paddingTop: spacing.md }}>
      {/* Karşılama kartı */}
      <LinearGradient colors={[colors.primaryDark, colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroHi}>Merhaba {firstName || 'çalışan'},</Text>
            <Text style={styles.heroSub}>{greetByHour()}.</Text>
          </View>
          <TouchableOpacity style={styles.bell} onPress={() => nav.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={20} color="#fff" />
            {(notif.data?.unread ?? 0) > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{notif.data!.unread}</Text></View>}
          </TouchableOpacity>
        </View>

        {/* Bugünkü mesai */}
        <View style={styles.mesai}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mesaiLabel}>BUGÜNKÜ MESAİ</Text>
            <Text style={styles.mesaiStatus}>{statusText}</Text>
          </View>
          <Text style={styles.mesaiTime}>{statusTime}</Text>
        </View>
        <TouchableOpacity style={styles.qrBtn} activeOpacity={0.85} onPress={() => nav.navigate('Mesai')}>
          <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
          <Text style={styles.qrBtnText}>QR ile {nextAction} yap</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Özet kutuları */}
      <View style={styles.statRow}>
        <StatTile label="Kalan izin (gün)" value={balance ? balance.remainingDays : '—'} tint={colors.success} />
        <StatTile label="Bekleyen talep" value={pending} tint={colors.warning} />
        <StatTile label="Okunmamış" value={notif.data?.unread ?? 0} tint={colors.info} />
      </View>

      {/* Hızlı işlemler */}
      <SectionHeader title="Ne yapmak istersiniz?" />
      <View style={styles.quickRow}>
        {quick.map((q, i) => {
          const t = tints[i % tints.length];
          return (
            <TouchableOpacity key={q.label} style={styles.quick} activeOpacity={0.85} onPress={q.go}>
              <View style={[styles.quickIcon, { backgroundColor: t.bg }]}><Ionicons name={q.icon} size={22} color={t.fg} /></View>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Duyurular */}
      <SectionHeader title="Duyurular" action="Tümü" onAction={() => nav.navigate('Announcements')} />
      {(anns.data?.length ?? 0) === 0 ? (
        <Card><Empty text="Şu an duyuru yok." icon="megaphone-outline" /></Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {anns.data!.slice(0, 3).map((a) => (
            <Card key={a.id} onPress={() => nav.navigate('Announcements')}>
              <View style={styles.annRow}>
                <View style={[styles.annDot, { backgroundColor: a.isMandatory ? colors.danger : colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.annTitle} numberOfLines={1}>{a.title}</Text>
                  <Text style={styles.annBody} numberOfLines={2}>{a.body}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: spacing.lg, ...shadow },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroHi: { color: '#fff', fontSize: 22, fontWeight: '800' },
  heroSub: { color: '#dbeafe', fontSize: 16, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
  bell: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  mesai: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  mesaiLabel: { color: '#c7d2fe', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  mesaiStatus: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 3 },
  mesaiTime: { color: '#fff', fontSize: 24, fontWeight: '800' },
  qrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: 13, marginTop: spacing.md },
  qrBtnText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  statRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quick: { width: '23%', alignItems: 'center' },
  quickIcon: { width: 54, height: 54, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11, color: colors.subtext, marginTop: 6, textAlign: 'center', fontWeight: '600' },
  annRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  annDot: { width: 8, height: 8, borderRadius: 4 },
  annTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  annBody: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
