import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { RootStackParamList, MainTabParamList } from './types';

// Screens
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AgendaScreen } from '../screens/AgendaScreen';
import { RiwayatScreen } from '../screens/RiwayatScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PresensiScreen } from '../screens/PresensiScreen';
import { ReceiptScreen } from '../screens/ReceiptScreen';
import { CreateMeetingScreen } from '../screens/CreateMeetingScreen';
import { MonitoringScreen } from '../screens/MonitoringScreen';
import { EmployeeDirectoryScreen } from '../screens/EmployeeDirectoryScreen';
import { AuditLogScreen } from '../screens/AuditLogScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC<{ navigation: any }> = ({ navigation }) => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.outline,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Beranda"
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" size={size} color={color} />
          ),
        }}
      >
        {() => (
          <DashboardScreen
            onNavigatePresensi={(id) => navigation.navigate('Presensi', { meetingId: id })}
            onNavigateDetail={(id) => navigation.navigate('Monitoring', { meetingId: id })}
            onNavigateAgenda={() => navigation.navigate('Agenda')}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Agenda"
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="event-available" size={size} color={color} />
          ),
        }}
      >
        {() => (
          <AgendaScreen
            onNavigateDetail={(id) => navigation.navigate('Monitoring', { meetingId: id })}
            onNavigateCreate={() => navigation.navigate('CreateMeeting')}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Riwayat"
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="history-edu" size={size} color={color} />
          ),
        }}
      >
        {() => (
          <RiwayatScreen
            onSelectReceipt={(id) => navigation.navigate('Receipt', { attendanceId: id })}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Profil"
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="account-circle" size={size} color={color} />
          ),
        }}
      >
        {() => (
          <ProfileScreen
            onLogout={() => navigation.replace('Login')}
            onNavigateAuditLog={() => navigation.navigate('AuditLog')}
            onNavigatePegawai={() => navigation.navigate('EmployeeDirectory')}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
      }}
    >
      <Stack.Screen name="Splash">
        {({ navigation }) => (
          <SplashScreen onFinish={() => navigation.replace('Login')} />
        )}
      </Stack.Screen>

      <Stack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen onLoginSuccess={() => navigation.replace('MainTabs')} />
        )}
      </Stack.Screen>

      <Stack.Screen name="MainTabs" component={MainTabNavigator} />

      <Stack.Screen name="Presensi">
        {({ navigation, route }) => (
          <PresensiScreen
            meetingId={route.params.meetingId}
            onBack={() => navigation.goBack()}
            onSuccess={(id) => navigation.replace('Receipt', { attendanceId: id })}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Receipt">
        {({ navigation, route }) => (
          <ReceiptScreen
            attendanceId={route.params.attendanceId}
            onBack={() => navigation.goBack()}
            onDone={() => navigation.navigate('MainTabs')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="CreateMeeting">
        {({ navigation }) => (
          <CreateMeetingScreen
            onBack={() => navigation.goBack()}
            onSuccess={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Monitoring">
        {({ navigation, route }) => (
          <MonitoringScreen
            meetingId={route.params.meetingId}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="EmployeeDirectory">
        {() => <EmployeeDirectoryScreen />}
      </Stack.Screen>

      <Stack.Screen name="AuditLog">
        {() => <AuditLogScreen />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 62,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingBottom: 8,
    paddingTop: 6,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  tabBarLabel: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
  },
});
