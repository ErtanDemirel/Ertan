import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { attendanceApi, holidayApi, leaveApi } from '../api/services';
import { colors, spacing, radius } from '../theme';
import { Screen, Card, SectionHeader, StatTile } from '../components/ui';

type DayState = 'present' | 'leave' | 'holiday' | 'halfholiday' | 'weekend' | 'absent' | 'future' | 'none';
const stateColor: Record<DayState, { bg: string; fg: string }> = {
  present: { bg: colors.successBg, fg: colors.success },
  leave: { bg: colors.primaryLight, fg: colors.primary },
  holiday: { bg: colors.warningBg, fg: colors.warning },
  halfholiday: { bg: colors.warningBg, fg: colors.warning },
  weekend: { bg: '#f1f5f9', fg: colors.faint },
  absent: { bg: colors.dangerBg, fg: colors.danger },
  future: { bg: '#fff', fg: colors.faint },
  none: { bg: '#fff', fg: colors.faint },
};
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function WorkCalendarScreen() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const att = useQuery({ queryKey: ['att-my'], queryFn: () => attendanceApi.my() });
  const hol = useQuery({ queryKey: ['holidays', cursor.y], queryFn: () => holidayApi.list(cursor.y) });
  const lea = useQuery({ queryKey: ['leave-my'], queryFn: () => leaveApi.my() });

  const presentDays = useMemo(() => {
    const s = new Set<string>();
    (att.data ?? []).forEach((r) => { if (r.type === 'CheckIn') s.add(new Date(r.timestamp).toDateString()); });
    return s;
  }, [att.data]);
  const holidayMap = useMemo(() => {
    const m = new Map<string, boolean>();
    (hol.data ?? []).forEach((h) => m.set(h.date.slice(0, 10), h.isHalfDay));
    return m;
  }, [hol.data]);
  const leaveDates = useMemo(() => {
    const s = new Set<string>();
    (lea.data?.requests ?? []).filter((r) => r.status === 'Approved').forEach((r) => {
      for (let d = new Date(r.startDate); iso(d) <= r.endDate; d.setDate(d.getDate() + 1)) s.add(new Date(d).toDateString());
    });
    return s;
  }, [lea.data]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const first = new Date(cursor.y, cursor.m, 1);
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const leadBlanks = (first.getDay() + 6) % 7; // Pazartesi=0

  function classify(day: number): DayState {
    const d = new Date(cursor.y, cursor.m, day);
    const key = d.toDateString();
    const isoKey = iso(d);
    if (holidayMap.has(isoKey)) return holidayMap.get(isoKey) ? 'halfholiday' : 'holiday';
    if (d.getDay() === 0 || d.getDay() === 6) return 'weekend';
    if (leaveDates.has(key)) return 'leave';
    if (presentDays.has(key)) return 'present';
    if (d < today) return 'absent';
    if (d.getTime() === today.getTime() && presentDays.has(key)) return 'present';
    return 'future';
  }

  // Devamlılık oranı (bu ay, bugüne kadar)
  let expected = 0, present = 0, leaveCount = 0, absent = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(cursor.y, cursor.m, day);
    if (d > today) continue;
    const st = classify(day);
    if (st === 'weekend' || st === 'holiday') continue;
    expected++;
    if (st === 'present') present++;
    else if (st === 'leave') leaveCount++;
    else if (st === 'absent') absent++;
  }
  const denom = expected - leaveCount;
  const rate = denom > 0 ? Math.round((present / denom) * 100) : 100;

  const monthName = first.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  const shift = (n: number) => setCursor((c) => { const d = new Date(c.y, c.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <Screen refreshing={att.isFetching} onRefresh={() => { att.refetch(); hol.refetch(); lea.refetch(); }}>
      {/* Devamlılık oranı */}
      <Card>
        <Text style={styles.rateLabel}>Devamlılık oranı ({monthName})</Text>
        <Text style={styles.rateBig}>%{rate}</Text>
        <View style={styles.bar}><View style={[styles.barFill, { width: `${rate}%` }]} /></View>
        <View style={styles.statRow}>
          <StatTile label="Geldi" value={present} tint={colors.success} />
          <StatTile label="İzinli" value={leaveCount} tint={colors.primary} />
          <StatTile label="Gelmedi" value={absent} tint={absent > 0 ? colors.danger : colors.muted} />
        </View>
      </Card>

      {/* Takvim */}
      <SectionHeader title="Çalışma Takvimim" />
      <Card>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => shift(-1)} style={styles.navBtn}><Ionicons name="chevron-back" size={20} color={colors.primary} /></TouchableOpacity>
          <Text style={styles.month}>{monthName}</Text>
          <TouchableOpacity onPress={() => shift(1)} style={styles.navBtn}><Ionicons name="chevron-forward" size={20} color={colors.primary} /></TouchableOpacity>
        </View>
        <View style={styles.grid}>
          {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((w) => <Text key={w} style={styles.wd}>{w}</Text>)}
          {Array.from({ length: leadBlanks }).map((_, i) => <View key={`b${i}`} style={styles.cell} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const c = stateColor[classify(day)];
            return (
              <View key={day} style={[styles.cell, styles.dayCell, { backgroundColor: c.bg }]}>
                <Text style={[styles.dayNum, { color: c.fg }]}>{day}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.legend}>
          {([['present', 'Geldi'], ['leave', 'İzinli'], ['absent', 'Gelmedi'], ['holiday', 'Tatil'], ['weekend', 'Hafta sonu']] as [DayState, string][]).map(([s, l]) => (
            <View key={s} style={styles.legItem}><View style={[styles.legDot, { backgroundColor: stateColor[s].bg, borderColor: stateColor[s].fg }]} /><Text style={styles.legText}>{l}</Text></View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rateLabel: { fontSize: 13, color: colors.muted },
  rateBig: { fontSize: 40, fontWeight: '800', color: colors.primary, marginTop: 2 },
  bar: { height: 10, borderRadius: 5, backgroundColor: '#e2e8f0', overflow: 'hidden', marginTop: 8 },
  barFill: { height: 10, borderRadius: 5, backgroundColor: colors.primary },
  statRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  navBtn: { padding: 6, borderRadius: radius.md, backgroundColor: colors.primaryLight },
  month: { fontSize: 16, fontWeight: '800', color: colors.text, textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  wd: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, color: colors.faint, fontWeight: '700', marginBottom: 6 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  dayCell: { borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 13, fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: spacing.md },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legDot: { width: 12, height: 12, borderRadius: 3, borderWidth: 1 },
  legText: { fontSize: 11, color: colors.muted },
});
