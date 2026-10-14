import { create } from 'zustand';
import { DashboardData, DashboardRepositoryImpl } from '../../data/repositories/DashboardRepositoryImpl';

const repository = new DashboardRepositoryImpl();

interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  fetchDashboard: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  isLoading: false,
  error: null,
  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      set({ data: await repository.getDashboard(), error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Gagal memuat dashboard.' });
    } finally {
      set({ isLoading: false });
    }
  },
}));
