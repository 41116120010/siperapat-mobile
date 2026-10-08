import AsyncStorage from '@react-native-async-storage/async-storage';
import { IEmployeeRepository } from '../../domain/repositories/interfaces';
import { Employee } from '../../domain/entities/types';

const EMPLOYEE_STORAGE_KEY = '@siperapat_employees_data';

export const computeInitials = (fullName: string): string => {
  const nameWithoutSuffix = fullName.replace(/,.*$/, '').trim();
  const nameParts = nameWithoutSuffix.split(/\s+/).filter(Boolean);
  if (nameParts.length >= 2) {
    return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
  }
  if (nameParts.length === 1 && nameParts[0].length >= 2) {
    return nameParts[0].substring(0, 2).toUpperCase();
  }
  return 'AS';
};

const SEED_EMPLOYEES: Employee[] = [
  {
    id: 'asn-01',
    initials: 'AF',
    name: 'Afdalisma, SH, M.Pd',
    role: 'Administrator',
    nip: '197012051992032002',
    username: '@afdalisma',
    unit: 'Pimpinan & Lintas Unit (Pusat)',
    status: 'Aktif',
    jabatan: 'Kepala Bagian Umum',
    pangkatGolongan: 'Pembina Utama Muda (IV/c)',
    email: 'afdalisma@lldikti10.kemdikbud.go.id',
    phone: '081266001122',
    lastLogin: 'Hari ini, 08:14 WIB',
  },
  {
    id: 'asn-02',
    initials: 'ES',
    name: 'Ely Susanti, SE, MM',
    role: 'Admin Unit',
    nip: '196708231991032001',
    username: '@ely_susanti',
    unit: 'Bagian Akademik & Kemahasiswaan',
    status: 'Aktif',
    jabatan: 'Ketua Tim Kerja Akademik',
    pangkatGolongan: 'Pembina (IV/a)',
    email: 'ely.susanti@lldikti10.kemdikbud.go.id',
    phone: '081267882233',
    attendanceRate: '98%',
    totalMeetings: 24,
  },
  {
    id: 'asn-03',
    initials: 'FF',
    name: 'Febrina Fitri, SE, M.Si',
    role: 'Staff',
    nip: '196502101991032002',
    username: '@febrina_fitri',
    unit: 'Bagian Sumber Daya Perguruan Tinggi',
    status: 'Aktif',
    jabatan: 'Analis Kepegawaian Ahli Muda',
    pangkatGolongan: 'Pembina (IV/a)',
    email: 'febrina.fitri@lldikti10.kemdikbud.go.id',
    phone: '081374556677',
    regDate: 'Jan 2023 · Gol. IV/a',
  },
  {
    id: 'asn-04',
    initials: 'RA',
    name: 'Reri Anton, ST, MM',
    role: 'Staff',
    nip: '197003081991031001',
    username: '@reri_anton',
    unit: 'Pokja Pendidik & Tenaga Kependidikan',
    status: 'Aktif',
    jabatan: 'Pranata Komputer Ahli Muda',
    pangkatGolongan: 'Penata Tk. I (III/d)',
    email: 'reri.anton@lldikti10.kemdikbud.go.id',
    phone: '081266889900',
    regDate: 'Mar 2023 · Gol. III/d',
  },
];

export class EmployeeRepositoryImpl implements IEmployeeRepository {
  private async loadFromStorage(): Promise<Employee[]> {
    try {
      const data = await AsyncStorage.getItem(EMPLOYEE_STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as Employee[];
      }
    } catch {
      // Fallback to seeds on storage error
    }
    // Seed initial data to persistent storage if empty
    await AsyncStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(SEED_EMPLOYEES));
    return SEED_EMPLOYEES;
  }

  private async saveToStorage(employees: Employee[]): Promise<void> {
    await AsyncStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(employees));
  }

  async getEmployees(): Promise<Employee[]> {
    return await this.loadFromStorage();
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    const list = await this.loadFromStorage();
    return list.find((item) => item.id === id) || null;
  }

  async createEmployee(employee: Omit<Employee, 'id' | 'initials'>): Promise<Employee> {
    const list = await this.loadFromStorage();
    const initials = computeInitials(employee.name);
    const newId = `asn-${Date.now().toString().slice(-4)}`;

    const newEmployee: Employee = {
      ...employee,
      id: newId,
      initials,
      regDate: employee.regDate || 'Baru didaftarkan',
    };

    const updated = [newEmployee, ...list];
    await this.saveToStorage(updated);
    return newEmployee;
  }

  async updateEmployee(id: string, employee: Partial<Employee>): Promise<Employee> {
    const list = await this.loadFromStorage();
    const index = list.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error(`Pegawai dengan ID ${id} tidak ditemukan.`);
    }

    const current = list[index];
    const updatedEmployee: Employee = {
      ...current,
      ...employee,
      id: current.id, // Preserves original id
      nip: current.nip, // Preserves immutable official NIP
      initials: employee.name ? computeInitials(employee.name) : current.initials,
    };

    list[index] = updatedEmployee;
    await this.saveToStorage(list);
    return updatedEmployee;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const list = await this.loadFromStorage();
    const filtered = list.filter((item) => item.id !== id);
    if (filtered.length === list.length) {
      return false;
    }
    await this.saveToStorage(filtered);
    return true;
  }
}
