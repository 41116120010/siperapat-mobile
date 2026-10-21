import { IMeetingRepository } from '../../domain/repositories/interfaces';
import { Meeting } from '../../domain/entities/types';
import { agendaApi, AgendaFilters, CreateAgendaDto, UpdateAgendaDto, UploadFileRef } from '../datasources/agendaApi';
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

  async updateMinutes(id: string, minutes: UpdateMinutesDto): Promise<Meeting> {
    const response = await agendaApi.updateMinutes(id, minutes);
    if (!response.success) throw new Error(response.message || 'Gagal menyimpan notulensi.');
    return toMeeting(response.data);
  }

  async createMeeting(input: CreateAgendaDto, suratEdaran?: UploadFileRef): Promise<Meeting> {
    const response = await agendaApi.create(input, suratEdaran);
    if (!response.success) throw new Error(response.message || 'Gagal membuat agenda.');
    return toMeeting(response.data as ApiAgendaDto);
  }

  async updateMeeting(id: string, input: UpdateAgendaDto, suratEdaran?: UploadFileRef): Promise<Meeting> {
    const response = await agendaApi.update(id, input, suratEdaran);
    if (!response.success) throw new Error(response.message || 'Gagal memperbarui agenda rapat.');
    return toMeeting(response.data as ApiAgendaDto);
  }

  async deleteMeeting(id: string): Promise<boolean> {
    const response = await agendaApi.delete(id);
    if (!response.success) throw new Error(response.message || 'Gagal menghapus agenda rapat.');
    return true;
  }

  getAgendaFormOptions() { return agendaApi.formOptions(); }
}
