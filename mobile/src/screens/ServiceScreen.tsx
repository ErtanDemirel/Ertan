import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { serviceApi } from '../api/services';
import { colors, spacing, radius } from '../theme';
import { Screen, Card, SectionHeader, Empty, ListRow } from '../components/ui';

export default function ServiceScreen() {
  const q = useQuery({ queryKey: ['my-service'], queryFn: () => serviceApi.mine() });
  const mine = q.data?.mine;

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      <SectionHeader title="Servisim" />
      {mine && mine.routeName ? (
        <Card>
          <View style={styles.head}>
            <View style={styles.icon}><Ionicons name="bus" size={22} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.route}>{mine.routeName}</Text>
              {mine.stop ? <Text style={styles.stop}>Durak: {mine.stop}</Text> : null}
            </View>
          </View>
          <View style={styles.grid}>
            <Info label="Kalkış" value={mine.departure || '—'} icon="sunny-outline" />
            <Info label="Dönüş" value={mine.ret || '—'} icon="moon-outline" />
            <Info label="Şoför" value={mine.driver || '—'} icon="person-outline" />
            <Info label="Plaka" value={mine.plate || '—'} icon="car-outline" />
          </View>
        </Card>
      ) : (
        <Card><Empty text="Size atanmış bir servis güzergahı yok." icon="bus-outline" /></Card>
      )}

      <SectionHeader title="Tüm Güzergahlar" />
      {(q.data?.routes.length ?? 0) === 0 ? (
        <Card><Empty text="Güzergah tanımlı değil." icon="map-outline" /></Card>
      ) : (
        <Card>
          {q.data!.routes.map((r, i) => (
            <ListRow key={i} icon="bus-outline" title={r.name}
              subtitle={[r.departure && `Kalkış ${r.departure}`, r.ret && `Dönüş ${r.ret}`, r.stops].filter(Boolean).join(' • ') || undefined} />
          ))}
        </Card>
      )}
    </Screen>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  route: { fontSize: 16, fontWeight: '800', color: colors.text },
  stop: { fontSize: 13, color: colors.muted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.lg, gap: spacing.md },
  info: { width: '46%', backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md },
  infoLabel: { fontSize: 12, color: colors.muted, marginTop: 4 },
  infoValue: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },
});
