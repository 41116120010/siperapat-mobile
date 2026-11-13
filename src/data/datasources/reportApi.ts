import { apiClient, ApiBinaryResponse } from './apiClient';
import { ApiAgendaDto, ApiEnvelope, ApiPaginated } from './apiTypes';

export type AgendaExportFormat = 'pdf' | 'word' | 'csv';

export interface ReportFilterParams {
  start_date?: string;
  end_date?: string;
  status?: 'all' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  tipe?: 'all' | 'offline' | 'online' | 'hybrid';
  tipe_rapat?: 'all' | 'offline' | 'online' | 'hybrid';
  unit_id?: number | string;
}

export interface ReportAgendasParams extends ReportFilterParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface ApiReportFormatStats {
  offline: number;
  online: number;
  hybrid: number;
  pct_offline: number;
  pct_online: number;
  pct_hybrid: number;
}

export interface ApiReportUnitStat {
  unit_id: number;
  kode_unit: string;
  nama_unit: string;
  attendances_count: number;
  total_users: number;
}

export interface ApiReportMemberStat {
  user_id: number;
  name: string;
  nip: string | null;
  jabatan: string | null;
  attendances_count: number;
}

export interface ApiReportSummaryDto {
  total_agendas: number;
  completed_agendas: number;
  ongoing_agendas: number;
  scheduled_agendas: number;
  total_attendances: number;
  avg_attendances_per_agenda: number;
  format_stats: ApiReportFormatStats;
  governance_rate: number;
  count_with_notulen: number;
  attendance_rate: number;
  attendance_rate_subtext: string;
  unit_stats: ApiReportUnitStat[];
  member_stats: ApiReportMemberStat[];
}

export interface ApiReportAgendaRecapDto {
  agenda: ApiAgendaDto;
  report_config: Record<string, unknown>;
  export_links: {
    pdf: string;
    word: string;
    csv: string;
  };
}

function buildReportQuery(params?: Record<string, string | number | undefined | null>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      searchParams.append(key, String(value));
    }
  });
  const encoded = searchParams.toString();
  return encoded ? `?${encoded}` : '';
}

export const reportApi = {
  getSummary: (filters?: ReportFilterParams) =>
    apiClient.get<ApiEnvelope<ApiReportSummaryDto>>(
      `/reports/summary${buildReportQuery(filters as Record<string, string | number | undefined>)}`,
    ),

  getAgendas: (params?: ReportAgendasParams) =>
    apiClient.get<ApiPaginated<ApiAgendaDto>>(
      `/reports/agendas${buildReportQuery(params as Record<string, string | number | undefined>)}`,
    ),

  getAgendaRecap: (agendaId: string) =>
    apiClient.get<ApiEnvelope<ApiReportAgendaRecapDto>>(
      `/reports/agendas/${encodeURIComponent(agendaId)}`,
    ),

  exportSummaryCsv: (filters?: ReportFilterParams) =>
    apiClient.get<ApiBinaryResponse>(
      `/reports/summary/csv${buildReportQuery(filters as Record<string, string | number | undefined>)}`,
      { responseType: 'binary' },
    ),

  exportAgenda: (agendaId: string, format: AgendaExportFormat) =>
    apiClient.get<ApiBinaryResponse>(`/reports/agendas/${encodeURIComponent(agendaId)}/export/${format}`, { responseType: 'binary' }),
};
