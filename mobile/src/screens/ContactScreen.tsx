import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { contactApi } from '../api/services';
import { apiError } from '../api/client';
import { colors, spacing, radius } from '../theme';
import { Screen, Card, SectionHeader, PrimaryButton, Pill } from '../components/ui';

export default function ContactScreen() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['my-contact'], queryFn: () => contactApi.mine() });
  const [form, setForm] = useState({ phoneNumber: '', email: '', address: '', emergencyContactName: '', emergencyContactPhone: '' });

  useEffect(() => {
    if (q.data) setForm({
      phoneNumber: q.data.phoneNumber ?? '', email: q.data.email ?? '', address: q.data.address ?? '',
      emergencyContactName: q.data.emergencyContactName ?? '', emergencyContactPhone: q.data.emergencyContactPhone ?? '',
    });
  }, [q.data]);

  const create = useMutation({
    mutationFn: () => contactApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-contact'] }); Alert.alert('Gönderildi', 'Güncelleme talebiniz İK onayına iletildi.'); },
    onError: (e) => Alert.alert('Hata', apiError(e)),
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const pending = q.data?.pending;

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      {pending && (
        <Card style={styles.pending}>
          <View style={styles.pendRow}>
            <Ionicons name="time-outline" size={18} color={colors.warning} />
            <Text style={styles.pendText}>Onay bekleyen bir güncelleme talebiniz var.</Text>
            <Pill text="Bekliyor" color={colors.warning} bg={colors.warningBg} />
          </View>
        </Card>
      )}

      <Text style={styles.note}>Değişiklik yapmak istediğiniz alanları güncelleyip gönderin. Talep <Text style={{ fontWeight: '700' }}>İK/amir onayından</Text> sonra kartınıza işlenir.</Text>

      <SectionHeader title="İletişim Bilgilerim" />
      <Card>
        <Field label="Telefon" value={form.phoneNumber} onChange={(v) => set('phoneNumber', v)} keyboard="phone-pad" />
        <Field label="E-posta" value={form.email} onChange={(v) => set('email', v)} keyboard="email-address" />
        <Field label="Adres" value={form.address} onChange={(v) => set('address', v)} multiline />
      </Card>

      <SectionHeader title="Acil Durum Kişisi" />
      <Card>
        <Field label="Ad Soyad" value={form.emergencyContactName} onChange={(v) => set('emergencyContactName', v)} />
        <Field label="Telefon" value={form.emergencyContactPhone} onChange={(v) => set('emergencyContactPhone', v)} keyboard="phone-pad" />
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        <PrimaryButton title={pending ? 'Bekleyen talep var' : 'İK onayına gönder'} icon="send"
          onPress={() => create.mutate()} disabled={!!pending || create.isPending} loading={create.isPending} />
      </View>
    </Screen>
  );
}

function Field({ label, value, onChange, keyboard, multiline }: {
  label: string; value: string; onChange: (v: string) => void;
  keyboard?: 'phone-pad' | 'email-address'; multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, multiline && { height: 64, textAlignVertical: 'top' }]} value={value}
        onChangeText={onChange} keyboardType={keyboard as any} multiline={multiline} placeholderTextColor={colors.faint} />
    </View>
  );
}

const styles = StyleSheet.create({
  pending: { backgroundColor: colors.warningBg, marginBottom: spacing.md },
  pendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendText: { flex: 1, fontSize: 13, color: '#92400e', fontWeight: '600' },
  note: { fontSize: 12, color: colors.muted, marginBottom: spacing.sm },
  label: { fontSize: 13, color: colors.muted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
});
