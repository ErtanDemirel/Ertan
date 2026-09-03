import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { voiceApi, Feedback, FeedbackKind } from '../api/services';
import { apiError } from '../api/client';
import { colors, spacing, radius, tints } from '../theme';
import { Screen, Card, SectionHeader, PrimaryButton, Empty, Pill } from '../components/ui';

const KINDS: { key: FeedbackKind; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string; tint: number }[] = [
  { key: 'Suggestion', label: 'Öneri', icon: 'bulb-outline', desc: 'İyileştirme fikri', tint: 3 },
  { key: 'Complaint', label: 'Şikayet', icon: 'alert-circle-outline', desc: 'Sorun bildir', tint: 7 },
  { key: 'NearMiss', label: 'Ramak kala', icon: 'warning-outline', desc: 'İş güvenliği', tint: 4 },
  { key: 'Request', label: 'Dilek / İstek', icon: 'chatbubble-ellipses-outline', desc: 'Talebini ilet', tint: 0 },
];

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  New: { label: 'Yeni', color: colors.info, bg: colors.infoBg },
  Reviewing: { label: 'İnceleniyor', color: colors.warning, bg: colors.warningBg },
  Resolved: { label: 'Çözüldü', color: colors.success, bg: colors.successBg },
  Closed: { label: 'Kapatıldı', color: colors.muted, bg: '#f1f5f9' },
};

export default function VoiceScreen() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [location, setLocation] = useState('');
  const [anon, setAnon] = useState(false);

  const mine = useQuery({ queryKey: ['voice-my'], queryFn: () => voiceApi.my() });
  const create = useMutation({
    mutationFn: () => voiceApi.create({ kind: kind!, title: title || undefined, body, location: location || undefined, isAnonymous: anon }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['voice-my'] });
      setKind(null); setTitle(''); setBody(''); setLocation(''); setAnon(false);
      Alert.alert('Gönderildi', 'Geri bildiriminiz iletildi. Teşekkürler!');
    },
    onError: (e) => Alert.alert('Hata', apiError(e)),
  });

  const meta = KINDS.find((k) => k.key === kind);

  return (
    <Screen refreshing={mine.isFetching} onRefresh={() => mine.refetch()}>
      {!kind ? (
        <>
          <Text style={styles.intro}>Fikrini, sorununu veya iş güvenliği gözlemini paylaş. İstersen anonim gönderebilirsin.</Text>
          <View style={styles.grid}>
            {KINDS.map((k) => {
              const t = tints[k.tint];
              return (
                <TouchableOpacity key={k.key} style={styles.tile} activeOpacity={0.85} onPress={() => setKind(k.key)}>
                  <View style={[styles.tileIcon, { backgroundColor: t.bg }]}><Ionicons name={k.icon} size={24} color={t.fg} /></View>
                  <Text style={styles.tileTitle}>{k.label}</Text>
                  <Text style={styles.tileDesc}>{k.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : (
        <Card>
          <TouchableOpacity style={styles.back} onPress={() => setKind(null)}>
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
            <Text style={styles.backText}>{meta?.label}</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Başlık</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Kısa başlık" placeholderTextColor={colors.faint} />
          {kind === 'NearMiss' && (
            <>
              <Text style={styles.label}>Olay yeri</Text>
              <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Örn. 2. hat pres bölgesi" placeholderTextColor={colors.faint} />
            </>
          )}
          <Text style={styles.label}>Açıklama *</Text>
          <TextInput style={[styles.input, { height: 110, textAlignVertical: 'top' }]} value={body} onChangeText={setBody} multiline placeholder="Detaylı yazın..." placeholderTextColor={colors.faint} />
          <View style={styles.anonRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.anonTitle}>Anonim gönder</Text>
              <Text style={styles.anonSub}>Adınız kayda geçmez.</Text>
            </View>
            <Switch value={anon} onValueChange={setAnon} trackColor={{ true: colors.primary }} />
          </View>
          <PrimaryButton title="Gönder" icon="send" onPress={() => create.mutate()} disabled={!body.trim() || create.isPending} loading={create.isPending} />
        </Card>
      )}

      <SectionHeader title="Gönderdiklerim" />
      {(mine.data?.length ?? 0) === 0 ? (
        <Card><Empty text="Henüz kayıt yok." icon="chatbubbles-outline" /></Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {mine.data!.map((f: Feedback) => {
            const sm = statusMeta[f.status];
            const km = KINDS.find((k) => k.key === f.kind);
            return (
              <Card key={f.id}>
                <View style={styles.itemHead}>
                  <Pill text={km?.label ?? f.kind} color={colors.primary} bg={colors.primaryLight} />
                  <Pill text={sm.label} color={sm.color} bg={sm.bg} />
                </View>
                {f.title ? <Text style={styles.itemTitle}>{f.title}</Text> : null}
                <Text style={styles.itemBody} numberOfLines={3}>{f.body}</Text>
                {f.handlerComment ? <Text style={styles.itemNote}>Yanıt: {f.handlerComment}</Text> : null}
                <Text style={styles.itemDate}>{new Date(f.createdAt).toLocaleDateString('tr-TR')}{f.isAnonymous ? ' • anonim' : ''}</Text>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: colors.muted, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48%', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, alignItems: 'flex-start' },
  tileIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  tileTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  tileDesc: { fontSize: 12, color: colors.muted, marginTop: 2 },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  backText: { fontSize: 16, fontWeight: '800', color: colors.primary },
  label: { fontSize: 13, color: colors.muted, marginTop: spacing.md, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  anonRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, marginVertical: spacing.md },
  anonTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  anonSub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  itemHead: { flexDirection: 'row', gap: 8, marginBottom: spacing.sm },
  itemTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  itemBody: { fontSize: 13, color: colors.subtext, marginTop: 3 },
  itemNote: { fontSize: 12, color: colors.success, marginTop: 6, fontStyle: 'italic' },
  itemDate: { fontSize: 11, color: colors.faint, marginTop: 6 },
});
