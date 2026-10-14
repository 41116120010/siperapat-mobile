import { IMeetingRepository } from '../../domain/repositories/interfaces';
import { CreateAgendaInput, AgendaFormOptions } from '../../domain/repositories/interfaces';
import { agendaApi } from '../datasources/agendaApi';
import { toMeeting } from '../mappers/agendaMapper';

export class MeetingRepositoryImpl implements IMeetingRepository {
  async getMeetings(page = 1, type?: 'hybrid' | 'offline' | 'online') {
    const response = await agendaApi.list(page, 50, type);
    if (!response.success) throw new Error(response.message || 'Gagal memuat agenda.');
    return {
      meetings: response.data.map(toMeeting),
      currentPage: response.meta.current_page,
      lastPage: response.meta.last_page,
      total: response.meta.total,
    };
  }

  async getMeetingById(id: string) {
    const response = await agendaApi.detail(id);
    if (!response.success) throw new Error(response.message || 'Gagal memuat detail agenda.');
    return toMeeting(response.data);
  }

  async createMeeting(payload: CreateAgendaInput) {
    const response = await agendaApi.create(payload);
    if (!response.success) throw new Error(response.message || 'Gagal membuat agenda.');
    return toMeeting(response.data);
  }

  async getAgendaFormOptions(): Promise<AgendaFormOptions> {
    const response = await agendaApi.formOptions();
    return {
      users: response.users.map((user) => ({
        id: String(user.id),
        name: user.name,
        nip: user.nip,
        role: user.role.label,
        unitName: user.unit?.nama_unit ?? '',
      })),
      units: response.units.map((unit) => ({ id: String(unit.id), name: unit.nama_unit })),
    };
  }
}
