import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ViewStyle, TextStyle,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../theme';

/** Sayfa kabuğu: arka plan + kaydırma + isteğe bağlı yenileme. */
export function Screen({
  children, refreshing, onRefresh, style, contentStyle, scroll = true,
}: {
  children: React.ReactNode; refreshing?: boolean; onRefresh?: () => void;
  style?: ViewStyle; contentStyle?: ViewStyle; scroll?: boolean;
}) {
  if (!scroll) return <View style={[s.screen, style]}>{children}</View>;
  return (
    <ScrollView
      style={[s.screen, style]}
      contentContainerStyle={[{ padding: spacing.lg, paddingBottom: 48 }, contentStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const inner = <View style={[s.card, style]}>{children}</View>;
  if (onPress) return <TouchableOpacity activeOpacity={0.8} onPress={onPress}>{inner}</TouchableOpacity>;
  return inner;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.sectionTitle}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction}><Text style={s.sectionAction}>{action}</Text></TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Küçük istatistik kutusu (Poliza'daki "Toplam / Onaylı" kutuları gibi). */
export function StatTile({ label, value, tint = colors.primary, style }: { label: string; value: React.ReactNode; tint?: string; style?: ViewStyle }) {
  return (
    <View style={[s.stat, style]}>
      <Text style={[s.statValue, { color: tint }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export function Pill({ text, color = colors.primary, bg = colors.primaryLight }: { text: string; color?: string; bg?: string }) {
  return <Text style={[s.pill, { color, backgroundColor: bg }]}>{text}</Text>;
}

export function PrimaryButton({ title, onPress, icon, disabled, loading, variant = 'primary' }: {
  title: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  const bg = variant === 'primary' ? colors.primary : variant === 'secondary' ? '#fff' : 'transparent';
  const fg = variant === 'primary' ? '#fff' : colors.primary;
  const border = variant === 'secondary' ? { borderWidth: 1, borderColor: colors.border } : undefined;
  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: bg, opacity: disabled ? 0.6 : 1 }, border]}
      onPress={onPress} disabled={disabled || loading} activeOpacity={0.85}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={s.btnRow}>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={[s.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/** Hub ızgara kutusu: ikon + başlık + açıklama. */
export function IconTile({ icon, title, subtitle, tint, bg, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string; tint: string; bg: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.tile} activeOpacity={0.85} onPress={onPress}>
      <View style={[s.tileIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <Text style={s.tileTitle} numberOfLines={1}>{title}</Text>
      {subtitle ? <Text style={s.tileSub} numberOfLines={2}>{subtitle}</Text> : null}
    </TouchableOpacity>
  );
}

/** Liste satırı: ikon + başlık/açıklama + sağ ok. */
export function ListRow({ icon, title, subtitle, right, onPress, tint = colors.primary, bg = colors.primaryLight }: {
  icon?: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void;
  tint?: string; bg?: string;
}) {
  return (
    <TouchableOpacity activeOpacity={onPress ? 0.8 : 1} onPress={onPress} disabled={!onPress} style={s.row}>
      {icon ? <View style={[s.rowIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={18} color={tint} /></View> : null}
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {subtitle ? <Text style={s.rowSub}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.faint} /> : null)}
    </TouchableOpacity>
  );
}

export function Avatar({ name, size = 44, tint = colors.primary, bg = colors.primaryLight }: { name?: string; size?: number; tint?: string; bg?: string }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[s.avatarText, { color: tint, fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

export function Empty({ text, icon = 'file-tray-outline' }: { text: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={34} color={colors.faint} />
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

export const textStyles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800', color: colors.text } as TextStyle,
  h2: { fontSize: 17, fontWeight: '700', color: colors.text } as TextStyle,
  body: { fontSize: 14, color: colors.subtext } as TextStyle,
  muted: { fontSize: 13, color: colors.muted } as TextStyle,
});

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, ...shadow },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  sectionAction: { fontSize: 13, fontWeight: '600', color: colors.primary },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', ...shadow },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2, textAlign: 'center' },
  pill: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
  btn: { borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontWeight: '700', fontSize: 15 },
  tile: { width: '31%', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, alignItems: 'flex-start', ...shadow },
  tileIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  tileTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  tileSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { color: colors.muted, fontStyle: 'italic' },
});
