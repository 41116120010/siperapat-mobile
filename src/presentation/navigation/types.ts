export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
  Presensi: { meetingId: string };
  Receipt: { attendanceId: string };
  CreateMeeting: undefined;
  EditMeeting: { meetingId: string };
  Monitoring: { meetingId: string };
  AgendaDetail: { meetingId: string };
  EmployeeDirectory: undefined;
  AddEmployee: undefined;
  EditEmployee: { employeeId: string };
  AddUnit: undefined;
  EditUnit: { unitId: number | string };
  AuditLog: undefined;
  Reports: undefined;
  ChangePassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Riwayat: undefined;
  Agenda: undefined;
  Profil: undefined;
};
