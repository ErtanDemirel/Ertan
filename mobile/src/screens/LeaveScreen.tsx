import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { leaveApi, requestApi } from '../api/services';
import { apiError } from '../api/client';
import { colors } from '../theme';
import type { LeaveRequest } from '../api/types';

const statusMeta: Record<string, { label: string; color: string }> = {
  Pending: { label: 'Bekliyor', color: colors.warning },
  Approved: { label: 'Onaylandı', color: colors.success },
  Rejected: { label: 'Reddedildi', color: colors.danger },
  Cancelled: { label: 'İptal', color: colors.muted },
};

export default function LeaveScreen() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'leave' | 'advance' | 'expense'>('leave');
  const [showForm, setShowForm] = useState(false);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<{ uri: string; name: string; type: string } | null>(null);

  const types = useQuery({ queryKey: ['leave-types'], queryFn: () => leaveApi.types() });
  const mine = useQuery({ queryKey: ['leave-my'], queryFn: () => leaveApi.my() });

  const create = useMutation({
    mutationFn: async () => {
      const created = await leaveApi.create({
        leaveTypeId: typeId!,
        startDate, endDate,
        title: title || undefined,
        reason: reason || undefined,
        days: days ? Number(days) : undefined,
      });
      if (file) await leaveApi.uploadAttachment(created.id, file);
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-my'] });
      setShowForm(false);
      setTypeId(null); setTitle(''); setStartDate(''); setEndDate(''); setDays(''); setReason(''); setFile(null);
      Alert.alert('Gönderildi', 'İzin talebiniz amirinize iletildi.');
    },
    onError: (e) => Alert.alert('Hata', apiError(e)),
  });

  async function pickFile() {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      setFile({ uri: a.uri, name: a.name ?? 'dosya', type: a.mimeType ?? 'application/octet-stream' });
    }
  }

  const cancel = useMutation({
    mutationFn: (id: number) => leaveApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-my'] }),
    onError: (e) => Alert.alert('Hata', apiError(e)),
  });

  function submit() {
    if (!typeId) return Alert.alert('Eksik', 'İzin türü seçin.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
      return Alert.alert('Tarih', 'Tarihleri YYYY-AA-GG formatında girin.');
    create.mutate();
  }

  const balance = mine.data?.balance;

  if (mode !== 'leave') return <OtherRequests mode={mode} setMode={setMode} />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={mine.isFetching} onRefresh={() => mine.refetch()} />}
    >
      <Segment mode={mode} setMode={setMode} />
      {/* Bakiye kartı */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceTitle}>Yıllık İzin Bakiyesi</Text>
        {balance ? (
          <>
            <Text style={styles.balanceBig}>{balance.remainingDays} <Text style={styles.balanceUnit}>gün kaldı</Text></Text>
            <Text style={styles.balanceSub}>
              Hak: {balance.entitledDays} • Kullanılan: {balance.usedDays} • Bekleyen: {balance.pendingDays}
            </Text>
          </>
        ) : (
          <Text style={styles.balanceSub}>Bakiye tanımlı değil.</Text>
        )}
      </View>

      <TouchableOpacity style={styles.newButton} onPress={() => setShowForm((s) => !s)}>
        <Text style={styles.newButtonText}>{showForm ? '× Vazgeç' : '+ Yeni İzin Talebi'}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.form}>
          <Text style={styles.label}>İzin Türü</Text>
          <View style={styles.chips}>
            {types.data?.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.chip, typeId === t.id && styles.chipActive]}
                onPress={() => setTypeId(t.id)}
              >
                <Text style={[styles.chipText, typeId === t.id && styles.chipTextActive]}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Talep Başlığı</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="örn. Yıllık izin talebi" placeholderTextColor={colors.muted} />
          <Text style={styles.label}>Başlangıç (YYYY-AA-GG)</Text>
          <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="2026-09-10" placeholderTextColor={colors.muted} />
          <Text style={styles.label}>Bitiş (YYYY-AA-GG)</Text>
          <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="2026-09-12" placeholderTextColor={colors.muted} />
          <Text style={styles.label}>Kullanılan Gün (boşsa otomatik hesaplanır)</Text>
          <TextInput style={styles.input} value={days} onChangeText={setDays} keyboardType="number-pad" placeholder="örn. 3" placeholderTextColor={colors.muted} />
          <Text style={styles.label}>Açıklama</Text>
          <TextInput style={[styles.input, { height: 70 }]} value={reason} onChangeText={setReason} multiline placeholder="Neden..." placeholderTextColor={colors.muted} />

          <TouchableOpacity style={styles.fileBtn} onPress={pickFile}>
            <Text style={styles.fileBtnText}>{file ? `📎 ${file.name}` : '📎 Dosya ekle (rapor/foto/PDF)'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.submit} onPress={submit} disabled={create.isPending}>
            <Text style={styles.submitText}>{create.isPending ? 'Gönderiliyor...' : 'Talebi Gönder'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Taleplerim</Text>
      {(mine.data?.requests ?? []).length === 0 ? (
        <Text style={styles.empty}>Henüz izin talebiniz yok.</Text>
      ) : (
        mine.data!.requests.map((r: LeaveRequest) => {
          const meta = statusMeta[r.status];
          return (
            <View key={r.id} style={styles.reqCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reqType}>{r.title || r.leaveTypeName}</Text>
                <Text style={styles.reqDate}>{r.leaveTypeName} • {r.startDate} → {r.endDate} ({r.totalDays} gün)</Text>
                {r.managerComment ? <Text style={styles.reqComment}>Amir: {r.managerComment}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.badge, { color: meta.color, borderColor: meta.color }]}>{meta.label}</Text>
                {r.status === 'Pending' && (
                  <TouchableOpacity onPress={() => cancel.mutate(r.id)}>
                    <Text style={styles.cancelLink}>İptal et</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  balanceCard: { backgroundColor: colors.primary, borderRadius: 16, padding: 20 },
  balanceTitle: { color: '#dbeafe', fontSize: 13 },
  balanceBig: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4 },
  balanceUnit: { fontSize: 15, fontWeight: '500' },
  balanceSub: { color: '#dbeafe', marginTop: 6, fontSize: 12 },
  newButton: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  newButtonText: { color: colors.primary, fontWeight: '700' },
  form: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 12 },
  label: { color: colors.muted, fontSize: 13, marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  fileBtn: { borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 12 },
  fileBtnText: { color: colors.muted, fontSize: 13 },
  submit: { backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  submitText: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 22, marginBottom: 10 },
  empty: { color: colors.muted, fontStyle: 'italic' },
  reqCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  reqType: { fontWeight: '700', color: colors.text },
  reqDate: { color: colors.muted, fontSize: 13, marginTop: 3 },
  reqComment: { color: colors.muted, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  badge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, fontSize: 12, fontWeight: '600', overflow: 'hidden' },
  cancelLink: { color: colors.danger, fontSize: 12, marginTop: 8 },
});

// ---------------- Segment (İzin / Avans / Masraf) ----------------
function Segment({ mode, setMode }: { mode: string; setMode: (m: any) => void }) {
  const items: { k: string; label: string }[] = [
    { k: 'leave', label: 'İzin' }, { k: 'advance', label: 'Avans' }, { k: 'expense', label: 'Masraf' },
  ];
  return (
    <View style={seg.wrap}>
      {items.map((it) => (
        <TouchableOpacity key={it.k} style={[seg.item, mode === it.k && seg.itemActive]} onPress={() => setMode(it.k)}>
          <Text style={[seg.text, mode === it.k && seg.textActive]}>{it.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const statusColors: Record<string, { label: string; color: string }> = {
  Pending: { label: 'Bekliyor', color: colors.warning },
  Approved: { label: 'Onaylandı', color: colors.success },
  Rejected: { label: 'Reddedildi', color: colors.danger },
  Cancelled: { label: 'İptal', color: colors.muted },
};

// ---------------- Avans / Masraf görünümü ----------------
function OtherRequests({ mode, setMode }: { mode: 'advance' | 'expense'; setMode: (m: any) => void }) {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState<{ uri: string; name: string; type: string } | null>(null);

  const mine = useQuery({ queryKey: ['requests-my'], queryFn: () => requestApi.my() });
  const create = useMutation({
    mutationFn: () => mode === 'advance'
      ? requestApi.createAdvance(Number(amount), desc || undefined)
      : requestApi.createExpense(Number(amount), title || undefined, desc || undefined, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests-my'] });
      setShow(false); setAmount(''); setTitle(''); setDesc(''); setFile(null);
      Alert.alert('Gönderildi', 'Talebiniz onay zincirine iletildi.');
    },
    onError: (e) => Alert.alert('Hata', apiError(e)),
  });

  async function pick() {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      setFile({ uri: a.uri, name: a.name ?? 'belge', type: a.mimeType ?? 'application/octet-stream' });
    }
  }

  const list = mode === 'advance' ? (mine.data?.advances ?? []) : (mine.data?.expenses ?? []);

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={mine.isFetching} onRefresh={() => mine.refetch()} />}>
      <Segment mode={mode} setMode={setMode} />

      <TouchableOpacity style={styles.newButton} onPress={() => setShow((s) => !s)}>
        <Text style={styles.newButtonText}>{show ? '× Vazgeç' : mode === 'advance' ? '+ Yeni Avans Talebi' : '+ Yeni Masraf Talebi'}</Text>
      </TouchableOpacity>

      {show && (
        <View style={styles.form}>
          <Text style={styles.label}>Tutar (₺)</Text>
          <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="örn. 5000" placeholderTextColor={colors.muted} />
          {mode === 'expense' && (<>
            <Text style={styles.label}>Başlık</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="örn. Yol masrafı" placeholderTextColor={colors.muted} />
          </>)}
          <Text style={styles.label}>Açıklama</Text>
          <TextInput style={[styles.input, { height: 70 }]} value={desc} onChangeText={setDesc} multiline placeholder="Açıklama..." placeholderTextColor={colors.muted} />
          {mode === 'expense' && (
            <TouchableOpacity style={styles.fileBtn} onPress={pick}>
              <Text style={styles.fileBtnText}>{file ? `📎 ${file.name}` : '📎 Fiş/fatura ekle'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.submit} onPress={() => { if (!amount) return Alert.alert('Eksik', 'Tutar girin.'); create.mutate(); }} disabled={create.isPending}>
            <Text style={styles.submitText}>{create.isPending ? 'Gönderiliyor...' : 'Talebi Gönder'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Taleplerim</Text>
      {list.length === 0 ? (
        <Text style={styles.empty}>Kayıt yok.</Text>
      ) : list.map((r: any) => {
        const meta = statusColors[r.status] ?? { label: r.status, color: colors.muted };
        return (
          <View key={r.id} style={styles.reqCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reqType}>{(mode === 'expense' ? (r.title ? r.title + ' — ' : '') : '')}{Number(r.amount).toLocaleString('tr-TR')} ₺</Text>
              {r.reason ? <Text style={styles.reqDate}>{r.reason}</Text> : null}
              {r.description ? <Text style={styles.reqDate}>{r.description}</Text> : null}
              {r.managerComment ? <Text style={styles.reqComment}>Not: {r.managerComment}</Text> : null}
            </View>
            <Text style={[styles.badge, { color: meta.color, borderColor: meta.color }]}>{meta.label}</Text>
          </View>
        );
      })}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const seg = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 10, padding: 3, marginBottom: 14 },
  item: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  itemActive: { backgroundColor: '#fff' },
  text: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  textActive: { color: colors.primary },
});
