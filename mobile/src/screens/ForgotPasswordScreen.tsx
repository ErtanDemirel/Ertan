import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { authApi } from '../api/services';
import { apiError } from '../api/client';
import { colors } from '../theme';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestCode() {
    setLoading(true);
    try {
      await authApi.forgot(username.trim());
      Alert.alert('Kod Gönderildi', 'Telefonunuza gelen doğrulama kodunu girin.');
      setStep(2);
    } catch (e) {
      Alert.alert('Hata', apiError(e));
    } finally {
      setLoading(false);
    }
  }

  async function reset() {
    setLoading(true);
    try {
      await authApi.reset(username.trim(), code.trim(), newPassword);
      Alert.alert('Başarılı', 'Şifreniz güncellendi.', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Hata', apiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Şifre Sıfırlama</Text>

      {step === 1 ? (
        <>
          <Text style={styles.label}>Kullanıcı Adı</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" />
          <TouchableOpacity style={styles.button} onPress={requestCode} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>SMS Kodu Gönder</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.label}>SMS Kodu</Text>
          <TextInput style={styles.input} value={code} onChangeText={setCode} keyboardType="number-pad" />
          <Text style={styles.label}>Yeni Şifre</Text>
          <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
          <TouchableOpacity style={styles.button} onPress={reset} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Şifreyi Güncelle</Text>}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Girişe dön</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 20, textAlign: 'center' },
  label: { color: colors.muted, fontSize: 13, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  buttonText: { color: '#fff', fontWeight: '700' },
  link: { color: colors.primary, textAlign: 'center', marginTop: 16 },
});
