import { create } from 'zustand';
import { Employee } from '../../domain/entities/types';
import { ApiUnitDto } from '../../data/datasources/apiTypes';
import { EmployeeRepositoryImpl } from '../../data/repositories/EmployeeRepositoryImpl';

const employeeRepo = new EmployeeRepositoryImpl();
interface EmployeeState {
  employees: Employee[]; selectedEmployee: Employee | null; units: ApiUnitDto[]; selectedUnit: ApiUnitDto | null;
  currentPage: number; lastPage: number; total: number; unitsCurrentPage: number; unitsLastPage: number; unitsTotal: number;
  isLoading: boolean; error: string | null; employeesLoading: boolean; employeesError: string | null; unitsLoading: boolean; unitsError: string | null;
  fetchEmployees: (page?: number, filters?: { search?: string; role?: string; status?: string; unitId?: number }, append?: boolean) => Promise<void>;
  fetchUnits: (page?: number, append?: boolean) => Promise<void>;
  fetchEmployeeById: (id: string) => Promise<Employee | null>;
  fetchUnitById: (id: number | string) => Promise<ApiUnitDto | null>;
  addEmployee: (employeeData: Omit<Employee, 'id' | 'initials'>) => Promise<Employee | null>;
  updateEmployee: (id: string, employeeData: Partial<Employee>) => Promise<Employee | null>;
  deleteEmployee: (id: string) => Promise<boolean>;
  addUnit: (data: { kode_unit: string; nama_unit: string; deskripsi?: string | null; is_active?: boolean }) => Promise<ApiUnitDto | null>;
  updateUnit: (id: number | string, data: { kode_unit?: string; nama_unit?: string; deskripsi?: string | null; is_active?: boolean }) => Promise<ApiUnitDto | null>;
  deleteUnit: (id: number | string) => Promise<boolean>;
  clearError: () => void;
}

export const useEmployeeStore = create<EmployeeState>((set) => ({
  employees: [], selectedEmployee: null, units: [], selectedUnit: null, currentPage: 0, lastPage: 1, total: 0, unitsCurrentPage: 0, unitsLastPage: 1, unitsTotal: 0,
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
  fetchUnitById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const unit = await employeeRepo.getUnitById(id);
      set({ selectedUnit: unit });
      return unit;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Gagal memuat detail unit kerja.' });
      return null;
    } finally {
      set({ isLoading: false });
    }
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
  deleteEmployee: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await employeeRepo.deleteEmployee(id);
      set((state) => ({
        employees: state.employees.filter((item) => item.id !== id),
        total: Math.max(0, state.total - 1),
      }));
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Gagal menghapus data pegawai.' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  addUnit: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await employeeRepo.createUnit(data);
      set((state) => ({
        units: [result, ...state.units],
        unitsTotal: state.unitsTotal + 1,
      }));
      return result;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Gagal menambahkan unit kerja.' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  updateUnit: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await employeeRepo.updateUnit(id, data);
      set((state) => ({
        units: state.units.map((unit) => (unit.id === Number(id) || String(unit.id) === String(id) ? { ...unit, ...updated } : unit)),
      }));
      return updated;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Gagal memperbarui unit kerja.' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  deleteUnit: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await employeeRepo.deleteUnit(id);
      set((state) => ({
        units: state.units.filter((unit) => unit.id !== Number(id) && String(unit.id) !== String(id)),
        unitsTotal: Math.max(0, state.unitsTotal - 1),
      }));
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Gagal menghapus unit kerja.' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  clearError: () => set({ error: null }),
}));
