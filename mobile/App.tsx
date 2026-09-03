import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import MandatoryGate from './src/components/MandatoryGate';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import MoreScreen from './src/screens/MoreScreen';
import AnnouncementsScreen from './src/screens/AnnouncementsScreen';
import LeaveScreen from './src/screens/LeaveScreen';
import MealsScreen from './src/screens/MealsScreen';
import CheckInScreen from './src/screens/CheckInScreen';
import PayrollScreen from './src/screens/PayrollScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NotesScreen from './src/screens/NotesScreen';
import DirectoryScreen from './src/screens/DirectoryScreen';
import ServiceScreen from './src/screens/ServiceScreen';
import AttendanceHistoryScreen from './src/screens/AttendanceHistoryScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import VoiceScreen from './src/screens/VoiceScreen';
import CalcScreen from './src/screens/CalcScreen';
import ContactScreen from './src/screens/ContactScreen';
import WorkCalendarScreen from './src/screens/WorkCalendarScreen';
import { colors, shadow } from './src/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

type TabMeta = { icon: keyof typeof Ionicons.glyphMap; label: string; center?: boolean };
const tabMeta: Record<string, TabMeta> = {
  AnaSayfa: { icon: 'home', label: 'Ana Sayfa' },
  Talepler: { icon: 'documents', label: 'Talepler' },
  Mesai: { icon: 'qr-code', label: 'Mesai', center: true },
  Diğer: { icon: 'grid', label: 'Diğer' },
  Profilim: { icon: 'person', label: 'Profil' },
};

/** Poliza tarzı alt bar: 4 sekme + ortada yükseltilmiş QR mesai butonu. */
function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[tb.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const meta = tabMeta[route.name] ?? { icon: 'ellipse', label: route.name };
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (meta.center) {
          return (
            <TouchableOpacity key={route.key} style={tb.centerWrap} activeOpacity={0.85} onPress={onPress}>
              <View style={tb.center}><Ionicons name={meta.icon} size={26} color="#fff" /></View>
              <Text style={tb.centerLabel}>{meta.label}</Text>
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity key={route.key} style={tb.item} activeOpacity={0.7} onPress={onPress}>
            <Ionicons name={(focused ? meta.icon : `${meta.icon}-outline`) as any} size={22} color={focused ? colors.primary : colors.faint} />
            <Text style={[tb.label, { color: focused ? colors.primary : colors.faint }]}>{meta.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen name="AnaSayfa" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Talepler" component={LeaveScreen} options={{ title: 'Taleplerim' }} />
      <Tab.Screen name="Mesai" component={CheckInScreen} options={{ title: 'QR Mesai' }} />
      <Tab.Screen name="Diğer" component={MoreScreen} options={{ title: 'Diğer' }} />
      <Tab.Screen name="Profilim" component={ProfileScreen} options={{ title: 'Profilim' }} />
    </Tab.Navigator>
  );
}

/** Sekmelerin üstünde açılan detay ekranları (başlıklı + geri butonlu). */
function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Duyurular' }} />
      <Stack.Screen name="Meals" component={MealsScreen} options={{ title: 'Yemek' }} />
      <Stack.Screen name="Payroll" component={PayrollScreen} options={{ title: 'Bordrom' }} />
      <Stack.Screen name="Service" component={ServiceScreen} options={{ title: 'Servisim' }} />
      <Stack.Screen name="Directory" component={DirectoryScreen} options={{ title: 'Şirket Rehberi' }} />
      <Stack.Screen name="Notes" component={NotesScreen} options={{ title: 'Notlarım' }} />
      <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} options={{ title: 'Mesai Geçmişi' }} />
      <Stack.Screen name="WorkCalendar" component={WorkCalendarScreen} options={{ title: 'Çalışma Takvimim' }} />
      <Stack.Screen name="Voice" component={VoiceScreen} options={{ title: 'Çalışan Sesi' }} />
      <Stack.Screen name="Calc" component={CalcScreen} options={{ title: 'Hesaplama' }} />
      <Stack.Screen name="Contact" component={ContactScreen} options={{ title: 'İletişim Bilgilerim' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Bildirimler' }} />
    </Stack.Navigator>
  );
}

function Root() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <MandatoryGate>
          <AppStack />
        </MandatoryGate>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Forgot" component={ForgotPasswordScreen} options={{ headerShown: true, title: '' }} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <Root />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});

const tb = StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: '#fff', paddingTop: 8,
    borderTopWidth: 1, borderTopColor: colors.border,
    ...shadow, shadowOffset: { width: 0, height: -3 },
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: 10, fontWeight: '600' },
  centerWrap: { flex: 1, alignItems: 'center', marginTop: -26 },
  center: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff',
    ...shadow, shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 },
  },
  centerLabel: { fontSize: 10, fontWeight: '700', color: colors.primary, marginTop: 3 },
});
