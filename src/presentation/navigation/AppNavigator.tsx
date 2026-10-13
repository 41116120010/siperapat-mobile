import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabBarProps,
} from '@react-navigation/material-top-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { RootStackParamList, MainTabParamList } from './types';

// Screens
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AgendaScreen } from '../screens/AgendaScreen';
import { RiwayatScreen } from '../screens/RiwayatScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PresensiScreen } from '../screens/PresensiScreen';
import { ReceiptScreen } from '../screens/ReceiptScreen';
import { CreateMeetingScreen } from '../screens/CreateMeetingScreen';
import { MonitoringScreen } from '../screens/MonitoringScreen';
import { EmployeeDirectoryScreen } from '../screens/EmployeeDirectoryScreen';
import { AddEmployeeScreen } from '../screens/AddEmployeeScreen';
import { EditEmployeeScreen } from '../screens/EditEmployeeScreen';
import { AuditLogScreen } from '../screens/AuditLogScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { GlobalFeedbackHost } from '../components/common/GlobalFeedbackHost';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createMaterialTopTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, keyof typeof MaterialIcons.glyphMap> = {
  Beranda: 'dashboard',
  Agenda: 'event-available',
  Riwayat: 'history-edu',
  Profil: 'account-circle',
};

const CustomBottomTabBar: React.FC<MaterialTopTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const color = isFocused ? colors.primary : colors.outline;
        const iconName = TAB_ICONS[route.name as keyof MainTabParamList] || 'circle';

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? route.name}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
          >
            <MaterialIcons name={iconName} size={22} color={color} />
            <Text style={[styles.tabBarLabel, { color }]}>
              {route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export const MainTabNavigator: React.FC<{ navigation: any }> = ({ navigation: rootStackNav }) => {
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={(props) => <CustomBottomTabBar {...props} />}
      screenOptions={{
        swipeEnabled: true,
        lazy: true,
      }}
    >
      <Tab.Screen name="Beranda">
        {({ navigation: tabNav }) => (
          <DashboardScreen
            onNavigatePresensi={(id) => rootStackNav.navigate('Presensi', { meetingId: id })}
            onNavigateDetail={(id) => rootStackNav.navigate('Monitoring', { meetingId: id })}
            onNavigateAgenda={() => tabNav.navigate('Agenda')}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Agenda">
        {() => (
          <AgendaScreen
            onNavigateDetail={(id) => rootStackNav.navigate('Monitoring', { meetingId: id })}
            onNavigateCreate={() => rootStackNav.navigate('CreateMeeting')}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Riwayat">
        {() => (
          <RiwayatScreen
            onSelectReceipt={(id) => rootStackNav.navigate('Receipt', { attendanceId: id })}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Profil">
        {() => (
          <ProfileScreen
            onLogout={() => rootStackNav.replace('Login')}
            onNavigateAuditLog={() => rootStackNav.navigate('AuditLog')}
            onNavigatePegawai={() => rootStackNav.navigate('EmployeeDirectory')}
            onNavigateChangePassword={() => rootStackNav.navigate('ChangePassword')}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const safeGoBack = (navigation: any, fallbackRoute = 'MainTabs') => {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    navigation.navigate(fallbackRoute);
  }
};

export const AppNavigator: React.FC = () => {
  return (
    <>
      <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
      }}
    >
      <Stack.Screen name="Splash">
        {({ navigation }) => (
          <SplashScreen
            onFinish={(hasSession) =>
              navigation.replace(hasSession ? 'MainTabs' : 'Login')
            }
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onLoginSuccess={() => navigation.replace('MainTabs')}
            onNavigateForgotPassword={() => navigation.navigate('ForgotPassword')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="ForgotPassword">
        {({ navigation }) => (
          <ForgotPasswordScreen
            onBack={() => safeGoBack(navigation, 'Login')}
            onSuccessLogin={() => navigation.navigate('Login')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="MainTabs" component={MainTabNavigator} />

      <Stack.Screen name="Presensi">
        {({ navigation, route }) => (
          <PresensiScreen
            meetingId={route.params.meetingId}
            onBack={() => safeGoBack(navigation, 'MainTabs')}
            onSuccess={(id) => navigation.replace('Receipt', { attendanceId: id })}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Receipt">
        {({ navigation, route }) => (
          <ReceiptScreen
            attendanceId={route.params.attendanceId}
            onBack={() => safeGoBack(navigation, 'MainTabs')}
            onDone={() => navigation.navigate('MainTabs')}
            onViewAgendaDetail={(meetingId) => {
              if (meetingId) {
                navigation.navigate('Monitoring', { meetingId });
              } else {
                navigation.navigate('MainTabs');
              }
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="CreateMeeting">
        {({ navigation }) => (
          <CreateMeetingScreen
            onBack={() => safeGoBack(navigation, 'MainTabs')}
            onSuccess={() => safeGoBack(navigation, 'MainTabs')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Monitoring">
        {({ navigation, route }) => (
          <MonitoringScreen
            meetingId={route.params.meetingId}
            onBack={() => safeGoBack(navigation, 'MainTabs')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="EmployeeDirectory">
        {({ navigation }) => (
          <EmployeeDirectoryScreen
            onBack={() => safeGoBack(navigation, 'MainTabs')}
            onNavigateAdd={() => navigation.navigate('AddEmployee')}
            onNavigateEdit={(employeeId) =>
              navigation.navigate('EditEmployee', { employeeId })
            }
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="AddEmployee">
        {({ navigation }) => (
          <AddEmployeeScreen
            onBack={() => safeGoBack(navigation, 'EmployeeDirectory')}
            onSuccess={() => safeGoBack(navigation, 'EmployeeDirectory')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="EditEmployee">
        {({ navigation, route }) => (
          <EditEmployeeScreen
            employeeId={route.params.employeeId}
            onBack={() => safeGoBack(navigation, 'EmployeeDirectory')}
            onSuccess={() => safeGoBack(navigation, 'EmployeeDirectory')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="AuditLog">
        {({ navigation }) => (
          <AuditLogScreen onBack={() => safeGoBack(navigation, 'MainTabs')} />
        )}
      </Stack.Screen>

      <Stack.Screen name="ChangePassword">
        {({ navigation }) => (
          <ChangePasswordScreen
            onBack={() => safeGoBack(navigation, 'MainTabs')}
            onSuccess={() => safeGoBack(navigation, 'MainTabs')}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
    <GlobalFeedbackHost />
    </>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 62,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 6,
    paddingTop: 6,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    gap: 2,
  },
  tabBarLabel: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
  },
});
