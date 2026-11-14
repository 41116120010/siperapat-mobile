/**
 * Date & Time formatter standardized on Asia/Jakarta (WIB / UTC+7)
 * tailored for Indonesian official meeting documentation.
 */

export const JAKARTA_TIME_ZONE = 'Asia/Jakarta';

export const BULAN_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const BULAN_SINGKAT_INDONESIA = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export const HARI_INDONESIA = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface JakartaDateParts {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  weekdayIndex: number; // 0 (Minggu) .. 6 (Sabtu)
  hour: number; // 0..23
  minute: number; // 0..59
  second: number; // 0..59
}

/**
 * Parse date strings safely so naive Laravel SQL timestamps ('YYYY-MM-DD HH:mm:ss')
 * and ISO date-only strings ('YYYY-MM-DD') are interpreted as Asia/Jakarta (+07:00).
 */
export function parseJakartaDate(dateInput: Date | string | number): Date {
  if (dateInput instanceof Date) {
    return dateInput;
  }
  if (typeof dateInput === 'number') {
    return new Date(dateInput);
  }

  const trimmed = String(dateInput).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00+07:00`);
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const normalized = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
    return new Date(`${normalized.replace(' ', 'T')}+07:00`);
  }
  return new Date(trimmed);
}

/**
 * Extract wall-clock calendar and time parts in Asia/Jakarta regardless of device OS timezone.
 */
export function getJakartaDateParts(
  dateInput: Date | string | number = new Date(),
): JakartaDateParts | null {
  const date = parseJakartaDate(dateInput);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: JAKARTA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const pick = (type: string): string =>
    parts.find((item) => item.type === type)?.value ?? '';

  const rawHour = Number(pick('hour'));
  return {
    year: Number(pick('year')),
    month: Number(pick('month')),
    day: Number(pick('day')),
    weekdayIndex: WEEKDAY_MAP[pick('weekday')] ?? 0,
    hour: rawHour === 24 ? 0 : rawHour,
    minute: Number(pick('minute')),
    second: Number(pick('second')),
  };
}

export function getJakartaDateKey(dateInput: Date | string | number = new Date()): string {
  const parts = getJakartaDateParts(dateInput);
  if (!parts) return '';
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function getJakartaCurrentYearMonth(
  dateInput: Date | string | number = new Date(),
): { year: number; monthIndex: number } {
  const parts = getJakartaDateParts(dateInput);
  if (!parts) {
    const now = new Date();
    return { year: now.getUTCFullYear(), monthIndex: now.getUTCMonth() };
  }
  return { year: parts.year, monthIndex: parts.month - 1 };
}

export const formatTanggalIndonesia = (dateInput: Date | string | number): string => {
  const parts = getJakartaDateParts(dateInput);
  if (!parts) return '-';
  const hari = HARI_INDONESIA[parts.weekdayIndex] ?? '';
  const bulan = BULAN_INDONESIA[parts.month - 1] ?? '';
  return `${hari}, ${parts.day} ${bulan} ${parts.year}`;
};

export const formatTanggalSingkat = (dateInput: Date | string | number): string => {
  const parts = getJakartaDateParts(dateInput);
  if (!parts) return '-';
  const bulan = BULAN_SINGKAT_INDONESIA[parts.month - 1] ?? '';
  return `${String(parts.day).padStart(2, '0')} ${bulan} ${parts.year}`;
};

export const formatTanggalNumerik = (dateInput: Date | string | number): string => {
  const parts = getJakartaDateParts(dateInput);
  if (!parts) return '-';
  return `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${parts.year}`;
};

export const formatWaktuWIB = (dateInput: Date | string | number): string => {
  const parts = getJakartaDateParts(dateInput);
  if (!parts) return '-';
  const jam = String(parts.hour).padStart(2, '0');
  const menit = String(parts.minute).padStart(2, '0');
  const detik = String(parts.second).padStart(2, '0');
  return `${jam}:${menit}:${detik} WIB`;
};

export const formatWaktuSingkatWIB = (dateInput: Date | string | number): string => {
  const parts = getJakartaDateParts(dateInput);
  if (!parts) return '-';
  const jam = String(parts.hour).padStart(2, '0');
  const menit = String(parts.minute).padStart(2, '0');
  return `${jam}:${menit} WIB`;
};

export const formatTanggalWaktuWIB = (dateInput: Date | string | number): string => {
  const parts = getJakartaDateParts(dateInput);
  if (!parts) return '-';
  const datePart = `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${parts.year}`;
  const timePart = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}:${String(parts.second).padStart(2, '0')} WIB`;
  return `${datePart} ${timePart}`;
};

export const formatRentangWaktu = (start: string, end: string): string => {
  return `${start} - ${end} WIB`;
};
