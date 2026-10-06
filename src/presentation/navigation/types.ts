export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  MainTabs: undefined;
  Presensi: { meetingId: string };
  Receipt: { attendanceId: string };
  CreateMeeting: undefined;
  Monitoring: { meetingId: string };
  EmployeeDirectory: undefined;
  AuditLog: undefined;
};

export type MainTabParamList = {
  Beranda: undefined;
  Agenda: undefined;
  Riwayat: undefined;
  Profil: undefined;
};
