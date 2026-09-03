import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { colors, spacing, tints } from '../theme';
import { Screen, SectionHeader, IconTile, Avatar, Card } from '../components/ui';

type Item = { icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string; go: string };

export default function MoreScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();

  const groups: { header: string; items: Item[] }[] = [
    {
      header: 'İşlemlerim',
      items: [
        { icon: 'calendar-outline', title: 'İzin / Talep', sub: 'İzin, avans, masraf', go: 'Talepler' },
        { icon: 'qr-code-outline', title: 'QR Mesai', sub: 'Giriş / çıkış', go: 'Mesai' },
        { icon: 'time-outline', title: 'Mesai geçmişi', sub: 'Çalışma takvimim', go: 'AttendanceHistory' },
        { icon: 'wallet-outline', title: 'Bordrom', sub: 'Maaş bordroları', go: 'Payroll' },
      ],
    },
    {
      header: 'Bilgi & Servis',
      items: [
        { icon: 'megaphone-outline', title: 'Duyurular', sub: 'Şirket duyuruları', go: 'Announcements' },
        { icon: 'restaurant-outline', title: 'Yemek', sub: 'Günün menüsü', go: 'Meals' },
        { icon: 'bus-outline', title: 'Servisim', sub: 'Güzergah & durak', go: 'Service' },
        { icon: 'people-outline', title: 'Şirket rehberi', sub: 'Çalışan dizini', go: 'Directory' },
      ],
    },
    {
      header: 'Çalışan Sesi',
      items: [
        { icon: 'megaphone-outline', title: 'Öneri / Şikayet', sub: 'Görüşünü paylaş', go: 'Voice' },
        { icon: 'warning-outline', title: 'Ramak kala', sub: 'İş güvenliği bildirimi', go: 'Voice' },
      ],
    },
    {
      header: 'Araçlar',
      items: [
        { icon: 'calculator-outline', title: 'Hesaplama', sub: 'Fazla mesai • kıdem/ihbar', go: 'Calc' },
      ],
    },
    {
      header: 'Kişisel',
      items: [
        { icon: 'call-outline', title: 'İletişim bilgilerim', sub: 'Adres & acil durum', go: 'Contact' },
        { icon: 'document-text-outline', title: 'Notlarım', sub: 'Kişisel notlar', go: 'Notes' },
        { icon: 'notifications-outline', title: 'Bildirimler', sub: 'Tüm bildirimler', go: 'Notifications' },
        { icon: 'person-outline', title: 'Profilim', sub: 'Hesap & güvenlik', go: 'Profilim' },
      ],
    },
  ];

  return (
    <Screen>
      <Card style={styles.profileCard} onPress={() => nav.navigate('Profilim')}>
        <Avatar name={user?.fullName || user?.username} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.fullName || user?.username}</Text>
          <Text style={styles.role}>{user?.role === 'Manager' ? 'Amir' : user?.role === 'Admin' ? 'Yönetici' : 'Personel'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.faint} />
      </Card>

      {groups.map((g) => (
        <View key={g.header}>
          <SectionHeader title={g.header} />
          <View style={styles.grid}>
            {g.items.map((it, i) => {
              const t = tints[i % tints.length];
              return (
                <IconTile key={it.title} icon={it.icon} title={it.title} subtitle={it.sub}
                  tint={t.fg} bg={t.bg} onPress={() => nav.navigate(it.go)} />
              );
            })}
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  role: { fontSize: 13, color: colors.muted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
