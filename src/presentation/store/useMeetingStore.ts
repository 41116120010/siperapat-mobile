import { create } from 'zustand';
import { Meeting } from '../../domain/entities/types';
import {
  AgendaFormOptions,
  CreateAgendaInput,
} from '../../domain/repositories/interfaces';
import { MeetingRepositoryImpl } from '../../data/repositories/MeetingRepositoryImpl';

const repository = new MeetingRepositoryImpl();

interface MeetingState {
  meetings: Meeting[];
  activeMeeting: Meeting | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  currentPage: number;
  lastPage: number;
  total: number;
  typeFilter: 'hybrid' | 'offline' | 'online' | undefined;
  formOptions: AgendaFormOptions | null;
  isFormOptionsLoading: boolean;
  formOptionsError: string | null;
  fetchMeetings: (page?: number, append?: boolean, typeFilter?: 'all' | 'hybrid' | 'offline' | 'online') => Promise<void>;
  getMeetingById: (id: string) => Promise<Meeting>;
  createMeeting: (input: CreateAgendaInput) => Promise<Meeting | null>;
  fetchAgendaFormOptions: () => Promise<void>;
  setActiveMeeting: (meeting: Meeting | null) => void;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export const useMeetingStore = create<MeetingState>((set, get) => ({
  meetings: [],
  activeMeeting: null,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  currentPage: 0,
  lastPage: 1,
  total: 0,
  typeFilter: undefined,
  formOptions: null,
  isFormOptionsLoading: false,
  formOptionsError: null,

  fetchMeetings: async (page = 1, append = false, requestedType) => {
    if (append && (get().isLoadingMore || page > get().lastPage)) return;
    const typeFilter = requestedType === undefined ? get().typeFilter : requestedType === 'all' ? undefined : requestedType;
    if (!append && page === 1) set({ typeFilter });
    set(append ? { isLoadingMore: true, error: null } : { isLoading: true, error: null });
    try {
      const result = await repository.getMeetings(page, typeFilter);
      set((state) => {
        const meetings = append
          ? [...state.meetings, ...result.meetings.filter((item) => !state.meetings.some((existing) => existing.id === item.id))]
          : result.meetings;
        const activeMeeting = meetings.find((item) => item.status === 'ongoing') ?? null;
        return {
          meetings,
          activeMeeting,
          currentPage: result.currentPage,
          lastPage: result.lastPage,
          total: result.total,
          error: null,
        };
      });
    } catch (error) {
      set({ error: errorMessage(error, 'Gagal memuat agenda dari server.') });
    } finally {
      set(append ? { isLoadingMore: false } : { isLoading: false });
    }
  },

  getMeetingById: async (id) => repository.getMeetingById(id).then((meeting) => {
    if (!meeting) throw new Error('Agenda tidak ditemukan.');
    return meeting;
  }),

  createMeeting: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const created = await repository.createMeeting(input);
      set({
        meetings: [created, ...get().meetings.filter((item) => item.id !== created.id)],
        activeMeeting: created.status === 'ongoing' ? created : get().activeMeeting,
        total: get().total + 1,
      });
      try {
        const firstPage = await repository.getMeetings(1, get().typeFilter);
        set({
          meetings: firstPage.meetings.some((item) => item.id === created.id)
            ? firstPage.meetings
            : [created, ...firstPage.meetings],
          currentPage: firstPage.currentPage,
          lastPage: firstPage.lastPage,
          total: firstPage.total,
        });
      } catch {
        set({ error: 'Agenda tersimpan, tetapi daftar agenda belum berhasil diperbarui.' });
      }
      return created;
    } catch (error) {
      set({ error: errorMessage(error, 'Gagal membuat agenda.') });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAgendaFormOptions: async () => {
    set({ isFormOptionsLoading: true, formOptionsError: null });
    try {
      set({ formOptions: await repository.getAgendaFormOptions() });
    } catch (error) {
      set({ formOptionsError: errorMessage(error, 'Gagal memuat pilihan pengguna dan unit.') });
    } finally {
      set({ isFormOptionsLoading: false });
    }
  },

  setActiveMeeting: (meeting) => set({ activeMeeting: meeting }),
}));
