import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { trainingApi, Training } from '../api/services';
import { colors, spacing, radius } from '../theme';
import { Screen, Card, SectionHeader, Empty, Pill } from '../components/ui';

export default function TrainingScreen() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['trainings'], queryFn: () => trainingApi.list() });
  const [active, setActive] = useState<Training | null>(null);

  const items = list.data ?? [];
  const pending = items.filter((t) => !t.completed);
  const done = items.filter((t) => t.completed);

  if (active) return <Player training={active} onClose={() => { setActive(null); qc.invalidateQueries({ queryKey: ['trainings'] }); }} />;

  return (
    <Screen refreshing={list.isFetching} onRefresh={() => list.refetch()}>
      <SectionHeader title="Bekleyen eğitimler" />
      {pending.length === 0 ? (
        <Card><Empty text="Bekleyen eğitiminiz yok. 👏" icon="school-outline" /></Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {pending.map((t) => (
            <Card key={t.id}>
              <View style={styles.head}>
                <Pill text={t.category} color={colors.primary} bg={colors.primaryLight} />
                {t.isMandatory && <Pill text="Zorunlu" color={colors.danger} bg={colors.dangerBg} />}
              </View>
              <Text style={styles.title}>{t.title}</Text>
              <View style={styles.bar}><View style={[styles.barFill, { width: `${t.progressPercent}%` }]} /></View>
              <Text style={styles.pct}>%{t.progressPercent} izlendi</Text>
              <TouchableOpacity style={styles.playBtn} onPress={() => setActive(t)}>
                <Ionicons name="play-circle" size={18} color="#fff" />
                <Text style={styles.playText}>{t.watchedSeconds > 0 ? 'Kaldığın yerden devam et' : 'İzlemeye başla'}</Text>
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      )}

      <SectionHeader title="Aldığım eğitimler" />
      {done.length === 0 ? (
        <Card><Empty text="Henüz tamamlanan eğitim yok." icon="ribbon-outline" /></Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {done.map((t) => (
            <Card key={t.id}>
              <View style={styles.doneRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{t.title}</Text>
                  <Text style={styles.doneMeta}>{t.category}{t.completedAt ? ` • ${new Date(t.completedAt).toLocaleDateString('tr-TR')}` : ''}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={26} color={colors.success} />
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

function Player({ training, onClose }: { training: Training; onClose: () => void }) {
  const ref = useRef<Video>(null);
  const maxWatched = useRef(training.watchedSeconds);
  const lastReport = useRef(0);
  const resumed = useRef(false);
  const [pct, setPct] = useState(training.progressPercent);

  function onStatus(st: any) {
    if (!st.isLoaded) return;
    const posSec = (st.positionMillis ?? 0) / 1000;
    const durSec = (st.durationMillis ?? 0) / 1000;

    // Kaldığı yerden devam (bir kez)
    if (!resumed.current && durSec > 0) {
      resumed.current = true;
      if (maxWatched.current > 1 && maxWatched.current < durSec - 1) {
        ref.current?.setPositionAsync(maxWatched.current * 1000);
      }
    }
    // İleri sarma engeli
    if (posSec > maxWatched.current + 1.5) {
      ref.current?.setPositionAsync(maxWatched.current * 1000);
      return;
    }
    if (posSec > maxWatched.current) maxWatched.current = posSec;
    if (durSec > 0) setPct(Math.min(100, Math.round((posSec / durSec) * 100)));

    // İlerleme bildirimi (5 sn'de bir)
    if (posSec - lastReport.current >= 5) {
      lastReport.current = posSec;
      trainingApi.progress(training.id, posSec, durSec).catch(() => {});
    }
    if (st.didJustFinish) {
      trainingApi.progress(training.id, durSec || 10 ** 7, durSec).catch(() => {});
    }
  }

  return (
    <Screen scroll={false}>
      <View style={styles.playerWrap}>
        <View style={styles.playerHead}>
          <Text style={styles.playerTitle} numberOfLines={1}>{training.title}</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
        </View>
        <Video
          ref={ref}
          style={styles.video}
          source={{ uri: trainingApi.videoUrl(training.id) }}
          useNativeControls={false}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          progressUpdateIntervalMillis={1000}
          onPlaybackStatusUpdate={onStatus}
        />
        <View style={styles.pbar}><View style={[styles.pbarFill, { width: `${pct}%` }]} /></View>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.ctlBtn} onPress={() => ref.current?.playAsync()}><Ionicons name="play" size={20} color="#fff" /></TouchableOpacity>
          <TouchableOpacity style={[styles.ctlBtn, { backgroundColor: '#334155' }]} onPress={() => ref.current?.pauseAsync()}><Ionicons name="pause" size={20} color="#fff" /></TouchableOpacity>
          <View style={styles.lock}><Ionicons name="lock-closed" size={13} color={colors.warning} /><Text style={styles.lockText}>ileri sarılamaz</Text></View>
        </View>
        {training.description ? <Text style={styles.desc}>{training.description}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: 8, marginBottom: spacing.sm },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  bar: { height: 8, borderRadius: 4, backgroundColor: '#e2e8f0', overflow: 'hidden', marginTop: spacing.md },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  pct: { fontSize: 12, color: colors.faint, marginTop: 4 },
  playBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, marginTop: spacing.md },
  playText: { color: '#fff', fontWeight: '700' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  doneMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  playerWrap: { flex: 1, padding: spacing.lg },
  playerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  playerTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text, marginRight: 8 },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: radius.md },
  pbar: { height: 6, borderRadius: 3, backgroundColor: '#e2e8f0', overflow: 'hidden', marginTop: spacing.md },
  pbarFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  ctlBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, padding: 10 },
  lock: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  lockText: { fontSize: 11, color: colors.warning, fontWeight: '600' },
  desc: { fontSize: 13, color: colors.subtext, marginTop: spacing.md },
});
