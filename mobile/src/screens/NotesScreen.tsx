import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { Screen, Card, PrimaryButton, Empty } from '../components/ui';

/** Kişisel notlar — cihazda yerel olarak saklanır (sunucuya gitmez). */
interface Note { id: string; text: string; createdAt: number; }
const KEY = 'coko.notes.v1';

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => { if (raw) try { setNotes(JSON.parse(raw)); } catch { /* yoksay */ } });
  }, []);

  async function persist(next: Note[]) {
    setNotes(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  }
  function add() {
    if (!text.trim()) return;
    persist([{ id: String(Date.now()), text: text.trim(), createdAt: Date.now() }, ...notes]);
    setText(''); setAdding(false);
  }
  function remove(id: string) {
    Alert.alert('Notu sil', 'Bu not silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => persist(notes.filter((n) => n.id !== id)) },
    ]);
  }

  return (
    <Screen>
      <View style={styles.head}>
        <Text style={styles.sub}>Notlar yalnızca bu cihazda saklanır, sunucuya gönderilmez.</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAdding((s) => !s)}>
          <Ionicons name={adding ? 'close' : 'add'} size={18} color="#fff" />
          <Text style={styles.addText}>{adding ? 'Vazgeç' : 'Yeni not'}</Text>
        </TouchableOpacity>
      </View>

      {adding && (
        <Card style={{ marginBottom: spacing.md }}>
          <TextInput
            style={styles.input} value={text} onChangeText={setText} multiline
            placeholder="Notunuzu yazın..." placeholderTextColor={colors.faint} autoFocus
          />
          <PrimaryButton title="Kaydet" icon="checkmark" onPress={add} disabled={!text.trim()} />
        </Card>
      )}

      {notes.length === 0 ? (
        <Card><Empty text="Henüz notunuz yok." icon="document-text-outline" /></Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {notes.map((n) => (
            <Card key={n.id}>
              <View style={styles.noteRow}>
                <Text style={styles.noteText}>{n.text}</Text>
                <TouchableOpacity onPress={() => remove(n.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
              <Text style={styles.noteDate}>{new Date(n.createdAt).toLocaleString('tr-TR')}</Text>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, gap: spacing.md },
  sub: { flex: 1, fontSize: 12, color: colors.muted },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  addText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  input: { minHeight: 80, textAlignVertical: 'top', fontSize: 15, color: colors.text, marginBottom: spacing.md },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  noteText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 21 },
  noteDate: { fontSize: 11, color: colors.faint, marginTop: spacing.sm },
});
