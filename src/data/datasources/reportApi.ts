import { apiClient, ApiBinaryResponse } from './apiClient';

export type AgendaExportFormat = 'pdf' | 'word' | 'csv';

export const reportApi = {
  exportAgenda: (agendaId: string, format: AgendaExportFormat) =>
    apiClient.get<ApiBinaryResponse>(`/reports/agendas/${encodeURIComponent(agendaId)}/export/${format}`, { responseType: 'binary' }),
};
