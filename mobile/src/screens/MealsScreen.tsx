import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { mealApi } from '../api/services';
import { colors, shadow } from '../theme';

export default function MealsScreen() {
  const meals = useQuery({ queryKey: ['meals'], queryFn: () => mealApi.list() });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={meals.isFetching} onRefresh={() => meals.refetch()} />}
    >
      {(meals.data ?? []).length === 0 ? (
        <Text style={styles.empty}>Bu dönem için menü girilmemiş.</Text>
      ) : (
        meals.data!.map((m) => (
          <View key={m.id} style={styles.card}>
            <Text style={styles.date}>
              {new Date(m.date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            {m.soup ? <Text style={styles.item}>🥣 {m.soup}</Text> : null}
            {m.mainCourse ? <Text style={styles.item}>🍲 {m.mainCourse}</Text> : null}
            {m.sideDish ? <Text style={styles.item}>🍚 {m.sideDish}</Text> : null}
            {m.complement ? <Text style={styles.item}>🥗 {m.complement}</Text> : null}
            {m.dessert ? <Text style={styles.item}>🍮 {m.dessert}</Text> : null}
            {m.alternative ? <Text style={styles.alt}>Alternatif: {m.alternative}</Text> : null}
            {m.calories ? <Text style={styles.cal}>~{m.calories} kcal</Text> : null}
          </View>
        ))
      )}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  empty: { color: colors.muted, fontStyle: 'italic' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, ...shadow },
  date: { fontWeight: '700', color: colors.primary, marginBottom: 8, textTransform: 'capitalize' },
  item: { color: colors.text, fontSize: 15, marginVertical: 2 },
  alt: { color: colors.muted, fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  cal: { color: colors.muted, fontSize: 12, marginTop: 6 },
});
