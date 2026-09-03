import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { Screen, Card, SectionHeader } from '../components/ui';

const num = (s: string) => { const v = parseFloat((s || '').replace(/\s/g, '').replace(',', '.')); return isNaN(v) ? 0 : v; };
const money = (v: number) => v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

export default function CalcScreen() {
  const [tab, setTab] = useState<'ot' | 'sev'>('ot');
  return (
    <Screen>
      <View style={styles.seg}>
        {([['ot', 'Fazla Mesai'], ['sev', 'Kıdem / İhbar']] as const).map(([k, l]) => (
          <TouchableOpacity key={k} style={[styles.segItem, tab === k && styles.segOn]} onPress={() => setTab(k)}>
            <Text style={[styles.segText, tab === k && styles.segTextOn]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'ot' ? <Overtime /> : <Severance />}
      <Text style={styles.disc}>Bu araç yalnızca <Text style={{ fontWeight: '700' }}>brüt tahmini</Text> verir; resmî hesap için İK/muhasebeye danışın.</Text>
    </Screen>
  );
}

// ---------------- Fazla mesai ----------------
const OT_TYPES = [
  { key: 'fazla', label: 'Fazla çalışma (%50)', mult: 1.5, desc: 'Haftalık 45 saati aşan' },
  { key: 'sure', label: 'Fazla sürelerle (%25)', mult: 1.25, desc: '45 saat altı, sözleşme üstü' },
  { key: 'tatil', label: 'Tatil çalışması (%100)', mult: 2.0, desc: 'Hafta/genel tatil' },
];
function Overtime() {
  const [wageType, setWageType] = useState<'hour' | 'month'>('month');
  const [wage, setWage] = useState('');
  const [hours, setHours] = useState('');
  const [ot, setOt] = useState(OT_TYPES[0]);

  const hourly = wageType === 'hour' ? num(wage) : num(wage) / 225; // aylık/225 (30g×7.5s)
  const paid = hourly * num(hours) * ot.mult;

  return (
    <View style={{ gap: spacing.md }}>
      <Card>
        <Text style={styles.lbl}>Ücret girişi</Text>
        <View style={styles.pillRow}>
          {([['month', 'Aylık brüt'], ['hour', 'Saatlik brüt']] as const).map(([k, l]) => (
            <TouchableOpacity key={k} style={[styles.pill, wageType === k && styles.pillOn]} onPress={() => setWageType(k)}>
              <Text style={[styles.pillText, wageType === k && styles.pillTextOn]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.lbl}>{wageType === 'hour' ? 'Saatlik brüt ücret (₺)' : 'Aylık brüt ücret (₺)'}</Text>
        <TextInput style={styles.input} value={wage} onChangeText={setWage} keyboardType="numeric" placeholder="örn. 30000" placeholderTextColor={colors.faint} />
        <Text style={styles.lbl}>Fazla mesai saati</Text>
        <TextInput style={styles.input} value={hours} onChangeText={setHours} keyboardType="numeric" placeholder="örn. 12" placeholderTextColor={colors.faint} />
        <Text style={styles.lbl}>Zam türü</Text>
        <View style={{ gap: 8 }}>
          {OT_TYPES.map((t) => (
            <TouchableOpacity key={t.key} style={[styles.opt, ot.key === t.key && styles.optOn]} onPress={() => setOt(t)}>
              <Ionicons name={ot.key === t.key ? 'radio-button-on' : 'radio-button-off'} size={18} color={ot.key === t.key ? colors.primary : colors.faint} />
              <View><Text style={styles.optTitle}>{t.label}</Text><Text style={styles.optDesc}>{t.desc}</Text></View>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
      <Card style={styles.result}>
        <Row k="Saatlik ücret" v={money(hourly)} />
        <Row k={`Zamlı saatlik (${ot.mult}×)`} v={money(hourly * ot.mult)} />
        <View style={styles.hr} />
        <Row k="Toplam fazla mesai" v={money(paid)} big />
      </Card>
    </View>
  );
}

// ---------------- Kıdem & İhbar ----------------
function noticeWeeks(days: number): number {
  const y = days / 365;
  if (y < 0.5) return 2;
  if (y < 1.5) return 4;
  if (y < 3) return 6;
  return 8;
}
function Severance() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [wage, setWage] = useState('');
  const [ceil, setCeil] = useState('');

  const s = Date.parse(start), e = Date.parse(end);
  const days = (!isNaN(s) && !isNaN(e) && e > s) ? Math.floor((e - s) / 864e5) : 0;
  const years = days / 365;
  const monthly = num(wage);
  const capped = num(ceil) > 0 ? Math.min(monthly, num(ceil)) : monthly;
  const kidem = years >= 1 ? capped * (days / 365) : 0;
  const weeks = noticeWeeks(days);
  const ihbar = (monthly / 30) * (weeks * 7);

  return (
    <View style={{ gap: spacing.md }}>
      <Card>
        <Text style={styles.lbl}>İşe giriş tarihi (YYYY-AA-GG)</Text>
        <TextInput style={styles.input} value={start} onChangeText={setStart} placeholder="2019-04-17" placeholderTextColor={colors.faint} />
        <Text style={styles.lbl}>İşten çıkış tarihi</Text>
        <TextInput style={styles.input} value={end} onChangeText={setEnd} placeholder="2026-09-03" placeholderTextColor={colors.faint} />
        <Text style={styles.lbl}>Aylık giydirilmiş brüt ücret (₺)</Text>
        <TextInput style={styles.input} value={wage} onChangeText={setWage} keyboardType="numeric" placeholder="örn. 35000" placeholderTextColor={colors.faint} />
        <Text style={styles.lbl}>Kıdem tavanı (₺) — opsiyonel</Text>
        <TextInput style={styles.input} value={ceil} onChangeText={setCeil} keyboardType="numeric" placeholder="boş bırakılabilir" placeholderTextColor={colors.faint} />
      </Card>
      <Card style={styles.result}>
        <Row k="Toplam kıdem süresi" v={days > 0 ? `${Math.floor(years)} yıl ${Math.floor((days % 365) / 30)} ay` : '—'} />
        <Row k="İhbar süresi" v={days > 0 ? `${weeks} hafta` : '—'} />
        <View style={styles.hr} />
        <Row k="Kıdem tazminatı (brüt)" v={money(kidem)} big />
        {years < 1 && days > 0 && <Text style={styles.warn}>1 yıldan az kıdemde kıdem tazminatı doğmaz.</Text>}
        <Row k="İhbar tazminatı (brüt)" v={money(ihbar)} big />
      </Card>
    </View>
  );
}

function Row({ k, v, big }: { k: string; v: string; big?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowK, big && { fontWeight: '700', color: colors.text }]}>{k}</Text>
      <Text style={[styles.rowV, big && { fontSize: 18, color: colors.primary }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: radius.md, padding: 3, marginBottom: spacing.md },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: 'center' },
  segOn: { backgroundColor: '#fff' },
  segText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  segTextOn: { color: colors.primary },
  lbl: { fontSize: 13, color: colors.muted, marginTop: spacing.md, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 9, alignItems: 'center' },
  pillOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  pillText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  pillTextOn: { color: colors.primary },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10 },
  optOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  optDesc: { fontSize: 12, color: colors.muted },
  result: { backgroundColor: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowK: { fontSize: 14, color: colors.subtext },
  rowV: { fontSize: 15, fontWeight: '600', color: colors.text },
  hr: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  warn: { fontSize: 12, color: colors.warning, marginBottom: 6 },
  disc: { fontSize: 11, color: colors.faint, marginTop: spacing.lg, lineHeight: 16 },
});
