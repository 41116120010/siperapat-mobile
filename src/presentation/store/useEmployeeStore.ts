import { create } from 'zustand';
import { Employee } from '../../domain/entities/types';
import { ApiUnitDto } from '../../data/datasources/apiTypes';
import { EmployeeRepositoryImpl } from '../../data/repositories/EmployeeRepositoryImpl';

const employeeRepo = new EmployeeRepositoryImpl();
interface EmployeeState {
  employees: Employee[]; selectedEmployee: Employee | null; units: ApiUnitDto[];
  currentPage: number; lastPage: number; total: number; unitsCurrentPage: number; unitsLastPage: number; unitsTotal: number;
  isLoading: boolean; error: string | null; employeesLoading: boolean; employeesError: string | null; unitsLoading: boolean; unitsError: string | null;
  fetchEmployees: (page?: number, filters?: { search?: string; role?: string; status?: string; unitId?: number }, append?: boolean) => Promise<void>;
  fetchUnits: (page?: number, append?: boolean) => Promise<void>;
  fetchEmployeeById: (id: string) => Promise<Employee | null>;
  addEmployee: (employeeData: Omit<Employee, 'id' | 'initials'>) => Promise<Employee | null>;
  updateEmployee: (id: string, employeeData: Partial<Employee>) => Promise<Employee | null>;
  clearError: () => void;
}

export const useEmployeeStore = create<EmployeeState>((set) => ({
  employees: [], selectedEmployee: null, units: [], currentPage: 0, lastPage: 1, total: 0, unitsCurrentPage: 0, unitsLastPage: 1, unitsTotal: 0,
  isLoading: false, error: null, employeesLoading: false, employeesError: null, unitsLoading: false, unitsError: null,
  fetchEmployees: async (page = 1, filters = {}, append = false) => {
    set({ employeesLoading: true, employeesError: null });
    try {
      const result = await employeeRepo.getEmployeePage(page, filters);
      set((state) => ({ employees: append ? [...state.employees, ...result.employees] : result.employees, currentPage: result.currentPage, lastPage: result.lastPage, total: result.total }));
    } catch (error) { set({ employeesError: error instanceof Error ? error.message : 'Gagal memuat direktori pegawai.' }); }
    finally { set({ employeesLoading: false }); }
  },
  fetchUnits: async (page = 1, append = false) => {
    set({ unitsLoading: true, unitsError: null });
    try {
      const result = await employeeRepo.getUnits(page);
      set((state) => ({ units: append ? [...state.units, ...result.units] : result.units, unitsCurrentPage: result.currentPage, unitsLastPage: result.lastPage, unitsTotal: result.total }));
    } catch (error) { set({ unitsError: error instanceof Error ? error.message : 'Gagal memuat unit kerja.' }); }
    finally { set({ unitsLoading: false }); }
  },
  fetchEmployeeById: async (id) => {
    set({ isLoading: true, error: null });
    try { const employee = await employeeRepo.getEmployeeById(id); set({ selectedEmployee: employee }); return employee; }
    catch (error) { set({ error: error instanceof Error ? error.message : 'Gagal memuat detail pegawai.' }); return null; }
    finally { set({ isLoading: false }); }
  },
  addEmployee: async (data) => {
    set({ isLoading: true, error: null });
    try { const result = await employeeRepo.createEmployee(data); return result; }
    catch (error) { set({ error: error instanceof Error ? error.message : 'Gagal menambahkan pegawai.' }); return null; }
    finally { set({ isLoading: false }); }
  },
  updateEmployee: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await employeeRepo.updateEmployee(id, data);
      set((state) => ({ employees: state.employees.map((item) => item.id === id ? updated : item), selectedEmployee: updated }));
      return updated;
    } catch (error) { set({ error: error instanceof Error ? error.message : 'Gagal memperbarui data pegawai.' }); return null; }
    finally { set({ isLoading: false }); }
  },
  clearError: () => set({ error: null }),
}));
