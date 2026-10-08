export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
  Presensi: { meetingId: string };
  Receipt: { attendanceId: string };
  CreateMeeting: undefined;
  Monitoring: { meetingId: string };
  EmployeeDirectory: undefined;
  AddEmployee: undefined;
  EditEmployee: { employeeId: string };
  AuditLog: undefined;
  ChangePassword: undefined;
};

export type MainTabParamList = {
  Beranda: undefined;
  Agenda: undefined;
  Riwayat: undefined;
  Profil: undefined;
};
