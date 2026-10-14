import { agendaApi, ApiDashboardStats } from '../datasources/agendaApi';
import { toMeeting } from '../mappers/agendaMapper';

export interface DashboardData {
  stats: ApiDashboardStats;
  activeAgendas: ReturnType<typeof toMeeting>[];
}

export class DashboardRepositoryImpl {
  async getDashboard(): Promise<DashboardData> {
    const response = await agendaApi.dashboard();
    if (!response.success) throw new Error(response.message || 'Gagal memuat dashboard.');

    return {
      stats: response.data.stats,
      activeAgendas: response.data.active_agendas.map(toMeeting),
    };
  }
}
