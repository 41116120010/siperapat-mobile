import { IEmployeeRepository } from '../../domain/repositories/interfaces';
import { Employee } from '../../domain/entities/types';
import { ApiPaginated, ApiUnitDto, ApiUserDto } from '../datasources/apiTypes';
import { userApi } from '../datasources/userApi';

export const computeInitials = (fullName: string): string => {
  const parts = fullName.replace(/,.*$/, '').trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : (parts[0]?.slice(0, 2) || 'AS').toUpperCase();
};

export function toEmployee(user: ApiUserDto): Employee {
  const role = user.role.value === 'administrator' ? 'Administrator' : user.role.value === 'admin' ? 'Admin Unit' : 'Staff';
  return {
    id: String(user.id), initials: computeInitials(user.name), name: user.name, role,
    nip: user.nip ?? '', username: user.username.startsWith('@') ? user.username : `@${user.username}`,
    unit: user.unit?.nama_unit ?? '', unitId: user.unit_id, status: user.is_active ? 'Aktif' : 'Nonaktif',
    email: user.email ?? '', phone: user.phone ?? '', jabatan: '', pangkatGolongan: '',
  };
}

export class EmployeeRepositoryImpl implements IEmployeeRepository {
  async getEmployeePage(page = 1, filters: { search?: string; role?: string; status?: string; unitId?: number } = {}) {
    const result = await userApi.users(page, filters);
    return { employees: result.data.map(toEmployee), currentPage: result.meta.current_page, lastPage: result.meta.last_page, total: result.meta.total };
  }
  async getUnits(page = 1): Promise<{ units: ApiUnitDto[]; currentPage: number; lastPage: number; total: number }> {
    const result: ApiPaginated<ApiUnitDto> = await userApi.units(page);
    return { units: result.data, currentPage: result.meta.current_page, lastPage: result.meta.last_page, total: result.meta.total };
  }
  async getEmployees(): Promise<Employee[]> { return (await this.getEmployeePage()).employees; }
  async getEmployeeById(id: string): Promise<Employee | null> {
    const response = await userApi.user(id);
    return response.success ? toEmployee(response.data) : null;
  }
  async createEmployee(_employee: Omit<Employee, 'id' | 'initials'>): Promise<Employee> {
    throw new Error('Pembuatan akun memerlukan password awal, sedangkan formulir mobile belum menyediakan field tersebut.');
  }
  async updateEmployee(id: string, employee: Partial<Employee>): Promise<Employee> {
    const current = await this.getEmployeeById(id);
    if (!current) throw new Error('Pegawai tidak ditemukan.');
    const username = employee.username ?? current.username;
    const role = employee.role ?? current.role;
    let unitId = employee.unitId ?? current.unitId;
    if (employee.unit && employee.unit !== current.unit && unitId === current.unitId) {
      const page = await userApi.units(1);
      const allUnits = [...page.data];
      for (let next = 2; next <= page.meta.last_page; next += 1) allUnits.push(...(await userApi.units(next)).data);
      const selected = allUnits.find((unit) => unit.nama_unit === employee.unit);
      if (!selected) throw new Error('Unit yang dipilih tidak ditemukan pada daftar unit API.');
      unitId = selected.id;
    }
    const response = await userApi.update(id, {
      name: employee.name ?? current.name, nip: current.nip,
      username: username.replace(/^@/, ''), email: employee.email ?? current.email,
      phone: (employee.phone ?? current.phone) || null,
      role: role === 'Administrator' ? 'administrator' : role === 'Admin Unit' ? 'admin' : 'staff',
      unit_id: unitId, is_active: (employee.status ?? current.status) === 'Aktif',
    });
    return toEmployee(response.data);
  }
  async deleteEmployee(id: string): Promise<boolean> { await userApi.remove(id); return true; }
  async toggleEmployeeStatus(id: string): Promise<Employee> { return toEmployee((await userApi.toggleStatus(id)).data); }
  async createUnit(payload: { kode_unit: string; nama_unit: string; deskripsi?: string | null; is_active?: boolean }): Promise<ApiUnitDto> {
    const response = await userApi.createUnit(payload);
    if (!response.success) throw new Error(response.message || 'Gagal menambahkan unit kerja.');
    return response.data;
  }
  async updateUnit(id: number | string, payload: { kode_unit?: string; nama_unit?: string; deskripsi?: string | null; is_active?: boolean }): Promise<ApiUnitDto> {
    const response = await userApi.updateUnit(id, payload);
    if (!response.success) throw new Error(response.message || 'Gagal memperbarui unit kerja.');
    return response.data;
  }
  async deleteUnit(id: number | string): Promise<boolean> {
    await userApi.deleteUnit(id);
    return true;
  }
  async getUnitById(id: number | string): Promise<ApiUnitDto | null> {
    try {
      const response = await userApi.unit(id);
      if (response?.data) return response.data;
    } catch {
      // Fallback: search in units list
    }
    try {
      const page = await userApi.units(1, undefined, 100);
      const found = page.data.find((u) => u.id === Number(id) || String(u.id) === String(id));
      return found || null;
    } catch {
      return null;
    }
  }
}
