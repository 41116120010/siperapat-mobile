import { create } from 'zustand';
import { Meeting } from '../../domain/entities/types';
import { MeetingRepositoryImpl } from '../../data/repositories/MeetingRepositoryImpl';

const meetingRepo = new MeetingRepositoryImpl();

interface MeetingState {
  meetings: Meeting[];
  activeMeeting: Meeting | null;
  isLoading: boolean;
  error: string | null;
  filterTab: 'all' | 'ongoing' | 'upcoming' | 'completed';
  setFilterTab: (tab: 'all' | 'ongoing' | 'upcoming' | 'completed') => void;
  fetchMeetings: () => Promise<void>;
  createMeeting: (meetingData: Omit<Meeting, 'id' | 'totalAttended'>) => Promise<boolean>;
  clearError: () => void;
}

export const useMeetingStore = create<MeetingState>((set, get) => ({
  meetings: [],
  activeMeeting: null,
  isLoading: false,
  error: null,
  filterTab: 'ongoing',

  setFilterTab: (tab) => set({ filterTab: tab }),

  fetchMeetings: async () => {
    // Only set loading if no existing data to avoid flashing on refetch
    const hasData = get().meetings.length > 0;
    if (!hasData) {
      set({ isLoading: true, error: null });
    }

    try {
      const meetings = await meetingRepo.getMeetings();
      const activeMeeting = await meetingRepo.getActiveMeeting();
      set({ meetings, activeMeeting, isLoading: false, error: null });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Gagal memuat daftar agenda rapat',
      });
    }
  },

  createMeeting: async (meetingData) => {
    set({ isLoading: true, error: null });
    try {
      const newMeeting = await meetingRepo.createMeeting(meetingData);
      set((state) => ({
        meetings: [newMeeting, ...state.meetings],
        isLoading: false,
      }));
      return true;
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Gagal membuat agenda rapat baru',
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
