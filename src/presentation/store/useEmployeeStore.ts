import { create } from 'zustand';
import { Employee } from '../../domain/entities/types';
import { EmployeeRepositoryImpl } from '../../data/repositories/EmployeeRepositoryImpl';

const employeeRepo = new EmployeeRepositoryImpl();

interface EmployeeState {
  employees: Employee[];
  selectedEmployee: Employee | null;
  isLoading: boolean;
  error: string | null;
  fetchEmployees: () => Promise<void>;
  fetchEmployeeById: (id: string) => Promise<Employee | null>;
  addEmployee: (employeeData: Omit<Employee, 'id' | 'initials'>) => Promise<Employee | null>;
  updateEmployee: (id: string, employeeData: Partial<Employee>) => Promise<Employee | null>;
  clearError: () => void;
}

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees: [],
  selectedEmployee: null,
  isLoading: false,
  error: null,

  fetchEmployees: async () => {
    const hasData = get().employees.length > 0;
    if (!hasData) {
      set({ isLoading: true, error: null });
    }

    try {
      const employees = await employeeRepo.getEmployees();
      set({ employees, isLoading: false, error: null });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Gagal memuat daftar pegawai ASN',
      });
    }
  },

  fetchEmployeeById: async (id: string) => {
    // Check local state first
    const existing = get().employees.find((emp) => emp.id === id);
    if (existing) {
      set({ selectedEmployee: existing });
      return existing;
    }

    set({ isLoading: true, error: null });
    try {
      const employee = await employeeRepo.getEmployeeById(id);
      set({ selectedEmployee: employee, isLoading: false, error: null });
      return employee;
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : `Gagal memuat data pegawai ID ${id}`,
      });
      return null;
    }
  },

  addEmployee: async (employeeData) => {
    set({ isLoading: true, error: null });
    try {
      const created = await employeeRepo.createEmployee(employeeData);
      set((state) => ({
        employees: [created, ...state.employees],
        isLoading: false,
      }));
      return created;
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Gagal mendaftarkan pegawai ASN baru',
      });
      return null;
    }
  },

  updateEmployee: async (id, employeeData) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await employeeRepo.updateEmployee(id, employeeData);
      set((state) => ({
        employees: state.employees.map((emp) => (emp.id === id ? updated : emp)),
        selectedEmployee: updated,
        isLoading: false,
      }));
      return updated;
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Gagal memperbarui data pegawai ASN',
      });
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));
