import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { apiError } from '../api/client';
import { colors } from '../theme';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.logoWrap}>
        <Text style={styles.logo}>PDKS</Text>
        <Text style={styles.subtitle}>Personel Devam Kontrol Sistemi</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Kullanıcı Adı</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="kullanıcı adınız"
          placeholderTextColor={colors.muted}
        />
        <Text style={styles.label}>Şifre</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Giriş Yap</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Forgot')}>
          <Text style={styles.link}>Şifremi unuttum</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.demo}>Demo: personel / Personel123!</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primaryDark, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logo: { fontSize: 44, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  subtitle: { color: '#cbd5e1', marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 22 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  link: { color: colors.primary, textAlign: 'center', marginTop: 14 },
  error: { color: colors.danger, marginTop: 10 },
  demo: { color: '#94a3b8', textAlign: 'center', marginTop: 20, fontSize: 12 },
});
