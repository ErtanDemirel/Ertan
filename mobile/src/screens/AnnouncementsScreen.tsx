import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementApi } from '../api/services';
import { colors, shadow } from '../theme';
import type { Announcement } from '../api/types';

export default function AnnouncementsScreen() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Announcement | null>(null);
  const list = useQuery({ queryKey: ['announcements'], queryFn: () => announcementApi.list() });
  const markRead = useMutation({
    mutationFn: (id: number) => announcementApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      qc.invalidateQueries({ queryKey: ['unread-mandatory'] });
    },
  });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={list.isFetching} onRefresh={() => list.refetch()} />}
    >
      {(list.data ?? []).length === 0 ? (
        <Text style={styles.empty}>Duyuru bulunmuyor.</Text>
      ) : (
        list.data!.map((a) => (
          <TouchableOpacity key={a.id} style={styles.card} onPress={() => setSelected(a)}>
            <View style={styles.cardHead}>
              <Text style={styles.title}>{a.title}</Text>
              {a.isMandatory && <Text style={styles.mandatory}>Zorunlu</Text>}
            </View>
            <Text style={styles.preview} numberOfLines={2}>{a.body}</Text>
            <View style={styles.cardFoot}>
              <Text style={styles.date}>{new Date(a.publishedAt).toLocaleDateString('tr-TR')}</Text>
              <Text style={[styles.readTag, { color: a.isRead ? colors.success : colors.warning }]}>
                {a.isRead ? '✓ Okundu' : 'Okunmadı'}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
      <View style={{ height: 30 }} />

      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <ScrollView>
              <Text style={styles.modalTitle}>{selected?.title}</Text>
              <Text style={styles.modalMeta}>{selected && new Date(selected.publishedAt).toLocaleString('tr-TR')} • {selected?.publishedByName}</Text>
              <Text style={styles.modalBody}>{selected?.body}</Text>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                <Text style={styles.closeText}>Kapat</Text>
              </TouchableOpacity>
              {selected && !selected.isRead && (
                <TouchableOpacity
                  style={styles.readBtn}
                  onPress={() => { markRead.mutate(selected.id); setSelected(null); }}
                >
                  <Text style={styles.readBtnText}>Okudum</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  empty: { color: colors.muted, fontStyle: 'italic' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, ...shadow },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: '700', color: colors.text, fontSize: 15, flex: 1 },
  mandatory: { color: colors.danger, fontSize: 11, fontWeight: '700', borderColor: colors.danger, borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  preview: { color: colors.muted, marginTop: 6, fontSize: 13 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  date: { color: colors.muted, fontSize: 12 },
  readTag: { fontSize: 12, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalMeta: { color: colors.muted, fontSize: 12, marginTop: 6 },
  modalBody: { color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  closeBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  closeText: { color: colors.muted, fontWeight: '600' },
  readBtn: { flex: 1, backgroundColor: colors.success, borderRadius: 10, padding: 14, alignItems: 'center' },
  readBtnText: { color: '#fff', fontWeight: '700' },
});
