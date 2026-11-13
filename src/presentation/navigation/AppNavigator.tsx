import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Clock, Home, LucideIcon, UserCircle } from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
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
import { EditMeetingScreen } from '../screens/EditMeetingScreen';
import { MonitoringScreen } from '../screens/MonitoringScreen';
import { AgendaDetailScreen } from '../screens/AgendaDetailScreen';
import { EmployeeDirectoryScreen } from '../screens/EmployeeDirectoryScreen';
import { AddEmployeeScreen } from '../screens/AddEmployeeScreen';
import { EditEmployeeScreen } from '../screens/EditEmployeeScreen';
import { AddUnitScreen } from '../screens/AddUnitScreen';
import { EditUnitScreen } from '../screens/EditUnitScreen';
import { AuditLogScreen } from '../screens/AuditLogScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { GlobalFeedbackHost } from '../components/common/GlobalFeedbackHost';
import { PageTransitionOverlay } from '../components/transitions/PageTransitionOverlay';
import { triggerPageTransition } from '../store/useTransitionStore';
import { useAuthStore } from '../store/useAuthStore';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, LucideIcon> = {
  Beranda: Home,
  Agenda: Calendar,
  Riwayat: Clock,
  Profil: UserCircle,
};

const CustomBottomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 6);

  return (
    <View style={[styles.tabBar, { paddingBottom: bottomPadding, height: 56 + bottomPadding }]}>
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

        const color = isFocused ? colors.primary : colors.textMuted;
        const IconComponent = TAB_ICONS[route.name as keyof MainTabParamList] ?? Home;

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
            <IconComponent size={22} color={color} strokeWidth={2} />
            <Text
              style={[
                styles.tabBarLabel,
                isFocused && styles.tabBarLabelActive,
                { color },
              ]}
            >
              {route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export const MainTabNavigator: React.FC<{ navigation: any }> = ({ navigation: rootStackNav }) => {
  const user = useAuthStore((state) => state.user);
  const detailRoute = user?.role === 'staff' ? 'AgendaDetail' : 'Monitoring';
  useEffect(() => {
    if (!user) rootStackNav.replace('Login');
  }, [user, rootStackNav]);
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomBottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
      }}
    >
      <Tab.Screen name="Beranda">
        {({ navigation: tabNav }) => (
          <DashboardScreen
            onNavigatePresensi={(id) => {
              triggerPageTransition();
              rootStackNav.navigate('Presensi', { meetingId: id });
            }}
            onNavigateDetail={(id) => {
              triggerPageTransition();
              rootStackNav.navigate(detailRoute, { meetingId: id });
            }}
            onNavigateAgenda={() => {
              tabNav.navigate('Agenda');
            }}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Agenda">
        {() => (
          <AgendaScreen
            onNavigateDetail={(id) => {
              triggerPageTransition();
              rootStackNav.navigate(detailRoute, { meetingId: id });
            }}
            onNavigateCreate={() => {
              triggerPageTransition();
              rootStackNav.navigate('CreateMeeting');
            }}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Riwayat">
        {() => (
          <RiwayatScreen
            onSelectReceipt={(id) => {
              triggerPageTransition();
              rootStackNav.navigate('Receipt', { attendanceId: id });
            }}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Profil">
        {() => (
          <ProfileScreen
            onLogout={() => {
              triggerPageTransition();
              rootStackNav.replace('Login');
            }}
            onNavigateAuditLog={() => {
              triggerPageTransition();
              rootStackNav.navigate('AuditLog');
            }}
            onNavigatePegawai={() => {
              triggerPageTransition();
              rootStackNav.navigate('EmployeeDirectory');
            }}
            onNavigateChangePassword={() => {
              triggerPageTransition();
              rootStackNav.navigate('ChangePassword');
            }}
            onNavigateReports={() => {
              triggerPageTransition();
              rootStackNav.navigate('Reports');
            }}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const safeGoBack = (navigation: any, fallbackRoute = 'MainTabs') => {
  triggerPageTransition(450);
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    navigation.navigate(fallbackRoute);
  }
};

export const AppNavigator: React.FC = () => {
  const role = useAuthStore((state) => state.user?.role);
  const canManageEmployees = role === 'administrator' || role === 'admin';
  const isAdministrator = role === 'administrator';

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
            onFinish={(hasSession) => {
              triggerPageTransition(650);
              navigation.replace(hasSession ? 'MainTabs' : 'Login');
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onLoginSuccess={() => {
              triggerPageTransition();
              navigation.replace('MainTabs');
            }}
            onNavigateForgotPassword={() => {
              triggerPageTransition();
              navigation.navigate('ForgotPassword');
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="ForgotPassword">
        {({ navigation }) => (
          <ForgotPasswordScreen
            onBack={() => safeGoBack(navigation, 'Login')}
            onSuccessLogin={() => {
              triggerPageTransition();
              navigation.navigate('Login');
            }}
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
                navigation.navigate(role === 'staff' ? 'AgendaDetail' : 'Monitoring', { meetingId });
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
            onNavigateEdit={(id) => {
              triggerPageTransition();
              navigation.navigate('EditMeeting', { meetingId: id });
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="AgendaDetail">
        {({ navigation, route }) => (
          <AgendaDetailScreen
            meetingId={route.params.meetingId}
            onBack={() => safeGoBack(navigation, 'MainTabs')}
            onNavigatePresensi={(id) => {
              triggerPageTransition();
              navigation.navigate('Presensi', { meetingId: id });
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="EditMeeting">
        {({ navigation, route }) => (
          <EditMeetingScreen
            meetingId={route.params.meetingId}
            onBack={() => safeGoBack(navigation, 'Monitoring')}
            onSuccess={() => safeGoBack(navigation, 'Monitoring')}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="EmployeeDirectory">
        {({ navigation }) => canManageEmployees ? (
          <EmployeeDirectoryScreen
            onBack={() => safeGoBack(navigation, 'MainTabs')}
            onNavigateAdd={() => {
              triggerPageTransition();
              navigation.navigate('AddEmployee');
            }}
            onNavigateEdit={(employeeId) => {
              triggerPageTransition();
              navigation.navigate('EditEmployee', { employeeId });
            }}
            onNavigateAddUnit={() => {
              triggerPageTransition();
              navigation.navigate('AddUnit');
            }}
            onNavigateEditUnit={(unitId) => {
              triggerPageTransition();
              navigation.navigate('EditUnit', { unitId });
            }}
          />
        ) : <RoleAccessDenied onBack={() => safeGoBack(navigation, 'MainTabs')} />}
      </Stack.Screen>

      <Stack.Screen name="AddEmployee">
        {({ navigation }) => canManageEmployees ? (
          <AddEmployeeScreen
            onBack={() => safeGoBack(navigation, 'EmployeeDirectory')}
            onSuccess={() => safeGoBack(navigation, 'EmployeeDirectory')}
          />
        ) : <RoleAccessDenied onBack={() => safeGoBack(navigation, 'MainTabs')} />}
      </Stack.Screen>

      <Stack.Screen name="EditEmployee">
        {({ navigation, route }) => canManageEmployees ? (
          <EditEmployeeScreen
            employeeId={route.params.employeeId}
            onBack={() => safeGoBack(navigation, 'EmployeeDirectory')}
            onSuccess={() => safeGoBack(navigation, 'EmployeeDirectory')}
          />
        ) : <RoleAccessDenied onBack={() => safeGoBack(navigation, 'MainTabs')} />}
      </Stack.Screen>

      <Stack.Screen name="AddUnit">
        {({ navigation }) => isAdministrator ? (
          <AddUnitScreen
            onBack={() => safeGoBack(navigation, 'EmployeeDirectory')}
            onSuccess={() => safeGoBack(navigation, 'EmployeeDirectory')}
          />
        ) : <RoleAccessDenied onBack={() => safeGoBack(navigation, 'EmployeeDirectory')} />}
      </Stack.Screen>

      <Stack.Screen name="EditUnit">
        {({ navigation, route }) => isAdministrator ? (
          <EditUnitScreen
            unitId={route.params.unitId}
            onBack={() => safeGoBack(navigation, 'EmployeeDirectory')}
            onSuccess={() => safeGoBack(navigation, 'EmployeeDirectory')}
          />
        ) : <RoleAccessDenied onBack={() => safeGoBack(navigation, 'EmployeeDirectory')} />}
      </Stack.Screen>

      <Stack.Screen name="AuditLog">
        {({ navigation }) => (
          <AuditLogScreen onBack={() => safeGoBack(navigation, 'MainTabs')} />
        )}
      </Stack.Screen>

      <Stack.Screen name="Reports">
        {({ navigation }) => canManageEmployees ? (
          <ReportsScreen
            onBack={() => safeGoBack(navigation, 'MainTabs')}
            onOpenAgenda={(id) => {
              triggerPageTransition();
              navigation.navigate('Monitoring', { meetingId: id });
            }}
          />
        ) : <RoleAccessDenied onBack={() => safeGoBack(navigation, 'MainTabs')} />}
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
    <PageTransitionOverlay />
    </>
  );
};

const RoleAccessDenied: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <View style={styles.deniedContainer}>
    <Text style={styles.deniedTitle}>Akses tidak tersedia</Text>
    <Text style={styles.deniedSubtitle}>
      Akun Anda tidak memiliki izin untuk membuka halaman ini.
    </Text>
    <Pressable onPress={onBack} accessibilityRole="button" style={styles.deniedButton}>
      <Text style={styles.deniedButtonText}>Kembali</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  tabBar: {
    height: 62,
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    gap: 2,
  },
  tabBarLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11,
  },
  tabBarLabelActive: {
    fontFamily: fontFamilies.sansBold,
  },
  deniedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  deniedTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 17,
    color: colors.onSurface,
    textAlign: 'center',
  },
  deniedSubtitle: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  deniedButton: {
    marginTop: spacing.md + 4,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deniedButtonText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
});
