import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { postingApi, InternalPosting } from '../api/services';
import { apiError } from '../api/client';
import { colors, spacing, radius } from '../theme';
import { Screen, Card, SectionHeader, Empty, Pill, PrimaryButton } from '../components/ui';

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  New: { label: 'Yeni', color: colors.info, bg: colors.infoBg },
  Reviewing: { label: 'İnceleniyor', color: colors.warning, bg: colors.warningBg },
  Interview: { label: 'Görüşme', color: colors.primary, bg: colors.primaryLight },
  Offered: { label: 'Teklif', color: colors.accent, bg: '#f3e8ff' },
  Hired: { label: 'Alındı', color: colors.success, bg: colors.successBg },
  Rejected: { label: 'Reddedildi', color: colors.danger, bg: colors.dangerBg },
};

export default function PostingsScreen() {
  const qc = useQueryClient();
  const postings = useQuery({ queryKey: ['postings'], queryFn: () => postingApi.list() });
  const mine = useQuery({ queryKey: ['postings-mine'], queryFn: () => postingApi.myApplications() });
  const [applyTo, setApplyTo] = useState<InternalPosting | null>(null);
  const [note, setNote] = useState('');

  const apply = useMutation({
    mutationFn: () => postingApi.apply(applyTo!.id, note || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['postings'] }); qc.invalidateQueries({ queryKey: ['postings-mine'] });
      setApplyTo(null); setNote(''); Alert.alert('Gönderildi', 'Başvurunuz İK değerlendirmesine iletildi.');
    },
    onError: (e) => Alert.alert('Hata', apiError(e)),
  });

  return (
    <Screen refreshing={postings.isFetching} onRefresh={() => { postings.refetch(); mine.refetch(); }}>
      <SectionHeader title="Açık İç İlanlar" />
      {(postings.data?.length ?? 0) === 0 ? (
        <Card><Empty text="Şu an açık iç ilan yok." icon="briefcase-outline" /></Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {postings.data!.map((p) => (
            <Card key={p.id}>
              <Text style={styles.title}>{p.title}</Text>
              <View style={styles.meta}>
                {p.department ? <Text style={styles.metaItem}>🏢 {p.department}</Text> : null}
                {p.location ? <Text style={styles.metaItem}>📍 {p.location}</Text> : null}
                {p.positionCount != null ? <Text style={styles.metaItem}>👥 {p.positionCount} kişi</Text> : null}
                {p.deadline ? <Text style={styles.metaItem}>⏳ son {new Date(p.deadline).toLocaleDateString('tr-TR')}</Text> : null}
              </View>
              {p.description ? <Text style={styles.desc} numberOfLines={4}>{p.description}</Text> : null}
              {applyTo?.id === p.id ? (
                <View style={{ marginTop: spacing.md }}>
                  <TextInput style={styles.input} value={note} onChangeText={setNote} multiline placeholder="Neden uygunsunuz? (opsiyonel)" placeholderTextColor={colors.faint} />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity style={[styles.cancel]} onPress={() => setApplyTo(null)}><Text style={{ color: colors.muted, fontWeight: '600' }}>Vazgeç</Text></TouchableOpacity>
                    <View style={{ flex: 1 }}><PrimaryButton title="Başvuruyu gönder" icon="send" onPress={() => apply.mutate()} loading={apply.isPending} /></View>
                  </View>
                </View>
              ) : p.alreadyApplied ? (
                <View style={styles.appliedRow}>
                  <Text style={styles.applied}>Başvuruldu</Text>
                  {p.myStatus ? <Pill text={statusMeta[p.myStatus]?.label ?? p.myStatus} color={statusMeta[p.myStatus]?.color ?? colors.muted} bg={statusMeta[p.myStatus]?.bg ?? '#f1f5f9'} /> : null}
                </View>
              ) : (
                <TouchableOpacity style={styles.applyBtn} onPress={() => { setApplyTo(p); setNote(''); }}>
                  <Ionicons name="send" size={16} color="#fff" /><Text style={styles.applyText}>Başvur</Text>
                </TouchableOpacity>
              )}
            </Card>
          ))}
        </View>
      )}

      <SectionHeader title="Başvurularım" />
      {(mine.data?.length ?? 0) === 0 ? (
        <Card><Empty text="Henüz başvurunuz yok." icon="document-outline" /></Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {mine.data!.map((a) => {
            const sm = statusMeta[a.status];
            return (
              <Card key={a.id}>
                <View style={styles.appliedRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{a.postingTitle}</Text>
                    <Text style={styles.date}>{new Date(a.createdAt).toLocaleDateString('tr-TR')}</Text>
                    {a.handlerComment ? <Text style={styles.hcomment}>İK: {a.handlerComment}</Text> : null}
                  </View>
                  <Pill text={sm?.label ?? a.status} color={sm?.color ?? colors.muted} bg={sm?.bg ?? '#f1f5f9'} />
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  metaItem: { fontSize: 12, color: colors.muted },
  desc: { fontSize: 13, color: colors.subtext, marginTop: spacing.sm },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 11, marginTop: spacing.md },
  applyText: { color: '#fff', fontWeight: '700' },
  appliedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  applied: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10, minHeight: 64, textAlignVertical: 'top', color: colors.text },
  cancel: { paddingHorizontal: 16, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  date: { fontSize: 11, color: colors.faint, marginTop: 2 },
  hcomment: { fontSize: 12, color: colors.muted, fontStyle: 'italic', marginTop: 4 },
});
