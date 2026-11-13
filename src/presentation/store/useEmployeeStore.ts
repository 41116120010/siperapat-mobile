import { create } from 'zustand';
import { CreateEmployeeInput, Employee } from '../../domain/entities/types';
import { ApiUnitDto, ApiUserDto, ApiUserRoleValue } from '../../data/datasources/apiTypes';
import { ApiError } from '../../data/datasources/apiClient';
import {
  ApiUnitRecord,
  ApiUnitsSummary,
  ApiUsersSummary,
  userApi,
} from '../../data/datasources/userApi';
import {
  EmployeeRepositoryImpl,
  EmployeeValidationError,
  toEmployee,
} from '../../data/repositories/EmployeeRepositoryImpl';
import { useAuthStore } from './useAuthStore';

const employeeRepo = new EmployeeRepositoryImpl();

function toValidationErrors(error: unknown): Record<string, string[]> | null {
  if (error instanceof ApiError) return error.errors ?? null;
  if (error instanceof EmployeeValidationError) return error.fieldErrors;
  return null;
}

function toApiRole(role: Employee['role']): ApiUserRoleValue {
  if (role === 'Administrator') return 'administrator';
  if (role === 'Admin Unit') return 'admin';
  return 'staff';
}

function normalizeOptionalText(value?: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' || trimmed === '-' ? null : trimmed;
}

function isValidPasswordRule(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

type CreateEmployeeRequest = Omit<CreateEmployeeInput, 'password'> & { password?: string };
export type UpdateEmployeeRequest = Partial<Employee> & {
  password?: string;
  unitId?: number | null;
};

interface EmployeeState {
  employees: Employee[];
  selectedEmployee: Employee | null;
  selectedUserDetail: ApiUserDto | null;
  userSummary: ApiUsersSummary | null;
  units: ApiUnitRecord[];
  allUnits: ApiUnitRecord[];
  selectedUnit: ApiUnitDto | null;
  unitSummary: ApiUnitsSummary | null;
  currentPage: number;
  lastPage: number;
  total: number;
  unitsCurrentPage: number;
  unitsLastPage: number;
  unitsTotal: number;
  isLoading: boolean;
  error: string | null;
  validationErrors: Record<string, string[]> | null;
  employeesLoading: boolean;
  employeesError: string | null;
  unitsLoading: boolean;
  unitsError: string | null;
  fetchEmployees: (
    page?: number,
    filters?: { search?: string; role?: string; status?: string; unitId?: number | string },
    append?: boolean,
  ) => Promise<void>;
  fetchUnits: (
    page?: number,
    append?: boolean,
    filters?: { search?: string; status?: string },
  ) => Promise<void>;
  fetchAllUnits: (options?: { activeOnly?: boolean }) => Promise<ApiUnitRecord[]>;
  fetchEmployeeById: (id: string) => Promise<Employee | null>;
  fetchUnitById: (id: number | string) => Promise<ApiUnitDto | null>;
  addEmployee: (employeeData: CreateEmployeeRequest) => Promise<Employee | null>;
  updateEmployee: (id: string, employeeData: UpdateEmployeeRequest) => Promise<Employee | null>;
  deleteEmployee: (id: string) => Promise<boolean>;
  toggleEmployeeStatus: (id: string) => Promise<Employee | null>;
  addUnit: (data: { kode_unit: string; nama_unit: string; deskripsi?: string | null; is_active?: boolean }) => Promise<ApiUnitDto | null>;
  updateUnit: (id: number | string, data: { kode_unit?: string; nama_unit?: string; deskripsi?: string | null; is_active?: boolean }) => Promise<ApiUnitDto | null>;
  deleteUnit: (id: number | string) => Promise<boolean>;
  toggleUnitStatus: (id: number | string) => Promise<ApiUnitRecord | null>;
  clearError: () => void;
}

export const useEmployeeStore = create<EmployeeState>((set) => ({
  employees: [],
  selectedEmployee: null,
  selectedUserDetail: null,
  userSummary: null,
  units: [],
  allUnits: [],
  selectedUnit: null,
  unitSummary: null,
  currentPage: 0,
  lastPage: 1,
  total: 0,
  unitsCurrentPage: 0,
  unitsLastPage: 1,
  unitsTotal: 0,
  isLoading: false,
  error: null,
  validationErrors: null,
  employeesLoading: false,
  employeesError: null,
  unitsLoading: false,
  unitsError: null,
  fetchEmployees: async (page = 1, filters = {}, append = false) => {
    set({ employeesLoading: true, employeesError: null });
    try {
      const result = await userApi.users(page, filters);
      const mapped = result.data.map(toEmployee);
      set((state) => ({
        employees: append ? [...state.employees, ...mapped] : mapped,
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page,
        total: result.meta.total,
        userSummary: result.summary ?? state.userSummary,
      }));
    } catch (error) {
      set({ employeesError: error instanceof Error ? error.message : 'Gagal memuat direktori pegawai.' });
    } finally {
      set({ employeesLoading: false });
    }
  },
  fetchUnits: async (page = 1, append = false, filters = {}) => {
    set({ unitsLoading: true, unitsError: null });
    try {
      const result = await userApi.units(page, filters.search, 10, { status: filters.status });
      set((state) => ({
        units: append ? [...state.units, ...result.data] : result.data,
        unitsCurrentPage: result.meta.current_page,
        unitsLastPage: result.meta.last_page,
        unitsTotal: result.meta.total,
        unitSummary: result.summary ?? state.unitSummary,
      }));
    } catch (error) {
      set({ unitsError: error instanceof Error ? error.message : 'Gagal memuat unit kerja.' });
    } finally {
      set({ unitsLoading: false });
    }
  },
  fetchAllUnits: async (options = {}) => {
    const activeOnly = options.activeOnly ?? true;
    try {
      const result = await userApi.units(1, undefined, 100, {
        all: true,
        status: activeOnly ? 'active' : undefined,
      });
      const list = result.data ?? [];
      set({ allUnits: list });
      return list;
    } catch {
      return [];
    }
  },
  fetchEmployeeById: async (id) => {
    set({ isLoading: true, error: null, validationErrors: null, selectedUserDetail: null });
    try {
      const response = await userApi.user(id, { withStats: true });
      if (!response.success || !response.data) {
        set({ selectedEmployee: null, selectedUserDetail: null });
        return null;
      }
      const employee = toEmployee(response.data);
      set({ selectedEmployee: employee, selectedUserDetail: response.data });
      return employee;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Gagal memuat detail pegawai.' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  fetchUnitById: async (id) => {
    set({ isLoading: true, error: null, validationErrors: null });
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
    set({ isLoading: true, error: null, validationErrors: null });
    try {
      const password = data.password?.trim() ?? '';
      if (!password) {
        const message = 'Kata sandi awal wajib diisi.';
        set({ error: message, validationErrors: { password: [message] } });
        return null;
      }
      if (!isValidPasswordRule(password)) {
        const message = 'Kata sandi awal minimal 8 karakter dan harus mengandung huruf dan angka.';
        set({ error: message, validationErrors: { password: [message] } });
        return null;
      }
      const actor = useAuthStore.getState().user;
      const isAdminUnit = actor?.role === 'admin';
      const resolvedUnitId = isAdminUnit ? (actor.unitId ?? null) : (data.unitId ?? null);
      if (isAdminUnit && resolvedUnitId == null) {
        const message = 'Akun Admin Unit tidak memiliki unit kerja. Hubungi Administrator.';
        set({ error: message, validationErrors: { unit_id: [message] } });
        return null;
      }

      const payload = {
        name: data.name.trim(),
        nip: data.nip.trim(),
        username: data.username.replace(/^@+/, '').trim().toLowerCase(),
        email: data.email.trim(),
        password,
        role: isAdminUnit && data.role === 'Administrator' ? 'staff' : toApiRole(data.role),
        is_active: data.status === 'Aktif',
        phone: normalizeOptionalText(data.phone),
        jabatan: normalizeOptionalText(data.jabatan),
        pangkat_golongan: normalizeOptionalText(data.pangkatGolongan),
        ...(resolvedUnitId != null ? { unit_id: resolvedUnitId } : {}),
      };

      const response = await userApi.create(payload);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Gagal menambahkan pegawai.');
      }
      return toEmployee(response.data);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Gagal menambahkan pegawai.',
        validationErrors: toValidationErrors(error),
      });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  updateEmployee: async (id, data) => {
    set({ isLoading: true, error: null, validationErrors: null });
    try {
      const password = data.password?.trim() ?? '';
      if (password && !isValidPasswordRule(password)) {
        const message = 'Kata sandi baru minimal 8 karakter dan harus mengandung huruf dan angka.';
        set({ error: message, validationErrors: { password: [message] } });
        return null;
      }

      const actor = useAuthStore.getState().user;
      const isAdminUnit = actor?.role === 'admin';
      const isEditingSelf = String(actor?.id ?? '') === String(id);

      const payload: Record<string, unknown> = {};
      if (data.name !== undefined) payload.name = data.name.trim();
      if (data.nip !== undefined) payload.nip = data.nip.trim();
      if (data.username !== undefined) payload.username = data.username.replace(/^@+/, '').trim().toLowerCase();
      if (data.email !== undefined) payload.email = data.email.trim();
      if (data.phone !== undefined) payload.phone = normalizeOptionalText(data.phone);
      if (data.jabatan !== undefined) payload.jabatan = normalizeOptionalText(data.jabatan);
      if (data.pangkatGolongan !== undefined) payload.pangkat_golongan = normalizeOptionalText(data.pangkatGolongan);

      if (!isEditingSelf && data.role !== undefined) {
        payload.role = isAdminUnit && data.role === 'Administrator' ? 'staff' : toApiRole(data.role);
      }

      if (isAdminUnit) {
        payload.unit_id = actor.unitId ?? null;
      } else if (data.unitId !== undefined) {
        payload.unit_id = data.unitId;
      }

      if (!isEditingSelf && data.status !== undefined) {
        payload.is_active = data.status === 'Aktif';
      }

      if (password) {
        payload.password = password;
      }

      const response = await userApi.update(id, payload);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Gagal memperbarui data pegawai.');
      }
      const updated = toEmployee(response.data);
      set((state) => ({
        employees: state.employees.map((item) => (item.id === id ? updated : item)),
        selectedEmployee: updated,
        selectedUserDetail: response.data,
      }));
      return updated;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Gagal memperbarui data pegawai.',
        validationErrors: toValidationErrors(error),
      });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  deleteEmployee: async (id: string) => {
    set({ isLoading: true, error: null, validationErrors: null });
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
  toggleEmployeeStatus: async (id: string) => {
    set({ isLoading: true, error: null, validationErrors: null });
    try {
      const response = await userApi.toggleStatus(id);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Gagal mengubah status akun pegawai.');
      }
      const updated = toEmployee(response.data);
      set((state) => ({
        employees: state.employees.map((item) => (item.id === id ? updated : item)),
        selectedEmployee: state.selectedEmployee?.id === id ? updated : state.selectedEmployee,
        selectedUserDetail: state.selectedUserDetail?.id === response.data.id ? response.data : state.selectedUserDetail,
      }));
      return updated;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Gagal mengubah status akun pegawai.' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  addUnit: async (data) => {
    set({ isLoading: true, error: null, validationErrors: null });
    try {
      const result = await employeeRepo.createUnit(data);
      set((state) => ({
        units: [result, ...state.units],
        unitsTotal: state.unitsTotal + 1,
      }));
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Gagal menambahkan unit kerja.',
        validationErrors: toValidationErrors(error),
      });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  updateUnit: async (id, data) => {
    set({ isLoading: true, error: null, validationErrors: null });
    try {
      const updated = await employeeRepo.updateUnit(id, data);
      set((state) => ({
        units: state.units.map((unit) => (unit.id === Number(id) || String(unit.id) === String(id) ? { ...unit, ...updated } : unit)),
      }));
      return updated;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Gagal memperbarui unit kerja.',
        validationErrors: toValidationErrors(error),
      });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  deleteUnit: async (id) => {
    set({ isLoading: true, error: null, validationErrors: null });
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
  toggleUnitStatus: async (id) => {
    set({ isLoading: true, error: null, validationErrors: null });
    try {
      const response = await userApi.toggleUnitStatus(id);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Gagal mengubah status unit kerja.');
      }
      const updated = response.data;
      set((state) => ({
        units: state.units.map((unit) =>
          unit.id === Number(id) || String(unit.id) === String(id)
            ? { ...unit, ...updated }
            : unit,
        ),
        allUnits: state.allUnits.map((unit) =>
          unit.id === Number(id) || String(unit.id) === String(id)
            ? { ...unit, ...updated }
            : unit,
        ),
      }));
      return updated;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Gagal mengubah status unit kerja.' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  clearError: () => set({ error: null, validationErrors: null }),
}));
