import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementApi } from '../api/services';
import { colors } from '../theme';

/**
 * Okunmamış ZORUNLU duyuru varsa, kullanıcı "Okudum" demeden uygulamayı
 * kullanamaz. Modal kapatılamaz (onRequestClose yoksayılır).
 */
export default function MandatoryGate({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const unread = useQuery({
    queryKey: ['unread-mandatory'],
    queryFn: () => announcementApi.unreadMandatory(),
    refetchOnWindowFocus: true,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => announcementApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unread-mandatory'] });
      qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const current = unread.data?.[0];
  const remaining = unread.data?.length ?? 0;

  return (
    <>
      {children}
      <Modal visible={!!current} animationType="fade" transparent onRequestClose={() => {}}>
        <View style={styles.bg}>
          <View style={styles.card}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ZORUNLU DUYURU</Text>
            </View>
            {remaining > 1 && <Text style={styles.counter}>{remaining} okunmamış zorunlu duyuru</Text>}
            <Text style={styles.title}>{current?.title}</Text>
            <ScrollView style={styles.bodyScroll}>
              <Text style={styles.body}>{current?.body}</Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.button}
              disabled={markRead.isPending}
              onPress={() => current && markRead.mutate(current.id)}
            >
              {markRead.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Okudum, Onaylıyorum</Text>}
            </TouchableOpacity>
            <Text style={styles.note}>Bu duyuruyu okuduğunuzu onaylamadan devam edemezsiniz.</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.85)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 22, maxHeight: '85%' },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.danger, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  counter: { color: colors.muted, fontSize: 12, marginTop: 10 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 10 },
  bodyScroll: { marginTop: 14, maxHeight: 320 },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  button: { backgroundColor: colors.success, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  note: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 10 },
});
