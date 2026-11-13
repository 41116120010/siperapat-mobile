export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
  Presensi: { meetingId: string };
  Receipt: { attendanceId?: string; meetingId?: string };
  CreateMeeting: undefined;
  EditMeeting: { meetingId: string };
  Monitoring: { meetingId: string };
  AgendaDetail: { meetingId: string };
  EmployeeDirectory: undefined;
  AddEmployee: undefined;
  EditEmployee: { employeeId: string };
  AddUnit: undefined;
  EditUnit: { unitId: number | string };
  UnitDirectory: undefined;
  AuditLog: undefined;
  PersonalActivityLog: undefined;
  Reports: undefined;
  ReportDetail: { meetingId: string };
  ChangePassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Riwayat: undefined;
  Agenda: undefined;
  Profil: undefined;
};
