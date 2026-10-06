/**
 * Date & Time formatter tailored for Indonesian official meeting documentation
 */

const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const HARI_INDONESIA = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

export const formatTanggalIndonesia = (dateInput: Date | string | number): string => {
  const d = new Date(dateInput);
  const hari = HARI_INDONESIA[d.getDay()];
  const tanggal = d.getDate();
  const bulan = BULAN_INDONESIA[d.getMonth()];
  const tahun = d.getFullYear();
  return `${hari}, ${tanggal} ${bulan} ${tahun}`;
};

export const formatWaktuWIB = (dateInput: Date | string | number): string => {
  const d = new Date(dateInput);
  const jam = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');
  const detik = String(d.getSeconds()).padStart(2, '0');
  return `${jam}:${menit}:${detik} WIB`;
};

export const formatRentangWaktu = (start: string, end: string): string => {
  return `${start} - ${end} WIB`;
};
