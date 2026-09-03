import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Linking, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { directoryApi } from '../api/services';
import { colors, spacing, radius } from '../theme';
import { Screen, Card, Avatar, Empty, Pill } from '../components/ui';

/** Şirket rehberi — çalışan dizini (ad, ünvan, departman, iş telefonu). */
export default function DirectoryScreen() {
  const [search, setSearch] = useState('');
  const q = useQuery({ queryKey: ['directory', search], queryFn: () => directoryApi.list(search || undefined) });

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.faint} />
        <TextInput
          style={styles.searchInput} value={search} onChangeText={setSearch}
          placeholder="Ad, ünvan veya departman ara" placeholderTextColor={colors.faint}
        />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.faint} /></TouchableOpacity> : null}
      </View>

      {(q.data?.length ?? 0) === 0 ? (
        <Card><Empty text="Kayıt bulunamadı." icon="people-outline" /></Card>
      ) : (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {q.data!.map((p, i) => (
            <Card key={i}>
              <View style={styles.row}>
                <Avatar name={p.name} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.title}>{[p.title, p.department].filter(Boolean).join(' • ') || '—'}</Text>
                </View>
                {p.phone ? (
                  <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${p.phone}`)}>
                    <Ionicons name="call" size={16} color={colors.primary} />
                  </TouchableOpacity>
                ) : null}
              </View>
              {(p.phone || p.email) && (
                <View style={styles.contact}>
                  {p.phone ? <Pill text={p.phone} color={colors.primary} bg={colors.primaryLight} /> : null}
                  {p.email ? <Pill text={p.email} color={colors.info} bg={colors.infoBg} /> : null}
                </View>
              )}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, paddingVertical: 12, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  title: { fontSize: 13, color: colors.muted, marginTop: 2 },
  callBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  contact: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
});
