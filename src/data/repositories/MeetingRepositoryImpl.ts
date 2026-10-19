import { IMeetingRepository } from '../../domain/repositories/interfaces';
import { Meeting } from '../../domain/entities/types';
import { agendaApi, AgendaFilters, CreateAgendaDto, UploadFileRef } from '../datasources/agendaApi';
import { ApiAgendaDto } from '../datasources/apiTypes';
import { toMeeting } from '../mappers/apiMappers';

export class MeetingRepositoryImpl implements IMeetingRepository {
  async getDashboard() {
    const response = await agendaApi.dashboard();
    if (!response.success) throw new Error(response.message || 'Gagal memuat dashboard.');
    return { stats: response.data.stats, agendas: response.data.active_agendas.map(toMeeting) };
  }

  async getMeetings(page = 1, filters: AgendaFilters = {}) {
    const response = await agendaApi.list(page, 10, filters);
    return { meetings: response.data.map(toMeeting), currentPage: response.meta.current_page, lastPage: response.meta.last_page, total: response.meta.total };
  }

  async getMeetingById(id: string): Promise<Meeting | null> {
    const response = await agendaApi.detail(id);
    if (!response.success) throw new Error(response.message || 'Gagal memuat detail agenda.');
    return toMeeting(response.data);
  }

  async createMeeting(input: CreateAgendaDto, suratEdaran?: UploadFileRef): Promise<Meeting> {
    const response = await agendaApi.create(input, suratEdaran);
    if (!response.success) throw new Error(response.message || 'Gagal membuat agenda.');
    return toMeeting(response.data as ApiAgendaDto);
  }

  getAgendaFormOptions() { return agendaApi.formOptions(); }
}
