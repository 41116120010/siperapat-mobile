# SIPERAPAT Mobile
**Sistem Informasi Presensi & Rapat Kedinasan — LLDIKTI Wilayah X**  
*Kementerian Pendidikan Tinggi, Sains, dan Teknologi Republik Indonesia*

Aplikasi klien mobile resmi **SIPERAPAT** berbasis **React Native (`0.88.0`)**, **Expo SDK (`^58.0.19`)**, dan **TypeScript (`~6.0.3`)** yang terintegrasi secara *stateless* dengan backend **Laravel 13** melalui REST API v1 (`Authorization: Bearer`).

---

## 1. Kapabilitas Utama & Paritas Antarmuka Web

* **Autentikasi & Pemulihan Sandi Mandiri:** Login multi-identifier (NIP 18 digit / Username) dan reset kata sandi mandiri via email Brevo (`ForgotPasswordScreen`), dengan penyimpanan token aman berbasis `expo-secure-store`.
* **Navigasi & Pengalaman Pengguna Final (1:1 Web UI/UX):**
  * Urutan tab utama: **Dashboard → Riwayat → Agenda** *(khusus Administrator & Admin Unit)* **→ Profil**.
  * **Standardisasi Waktu WIB (`Asia/Jakarta`):** Seluruh pemformatan tanggal, jadwal rapat, dan stempel waktu presensi diproses konsisten pada zona waktu `+07:00` melalui `src/core/utils/dateFormatter.ts` terlepas dari pengaturan timezone perangkat.
  * **Tipografi Adaptif (`AutoScrollText`):** Mencegah teks panjang atau *badge* filter terpotong dengan elipsis pada layar perangkat sempit.
  * **Identitas Loading & Transisi Tut Wuri Handayani:** Indikator muat, *pull-to-refresh* (`TutWuriRefresh`), serta overlay transisi antarhalaman (`TutWuriLoader`, `PageTransitionOverlay`).
  * **Proteksi Tombol Back Android (`BackHandler`):** Menjaga alur navigasi saat transisi/dialog aktif, mengarahkan kembali dari tab sekunder ke `Dashboard`, meminta konfirmasi pada halaman formulir & presensi (`PROTECTED_FORM_ROUTES`), serta guard keluar dua kali pada halaman utama.
* **Presensi Multimodal:** Pengambilan swafoto langsung (`FaceOvalOverlay` via `expo-camera` dengan fallback galeri dan kompresi `expo-image-manipulator` lebar `600px` JPEG `0.75` serta fallback `480px` `0.5` agar ≤ 512 KB) dan kanvas tanda tangan digital SVG (`DigitalSignaturePad`), diikuti tampilan bukti kehadiran (`ReceiptScreen` & `PerforatedTicket`).
* **Manajemen Rapat, Notulensi & Rekapitulasi:** Pembuatan/penyuntingan agenda 3-mode target peserta (disertai paginasi checkbox unit/pegawai dan prioritas kandidat terpilih untuk Pimpinan & Notulis), pratinjau/unggah Surat Edaran, workstation notulensi & dokumentasi foto, pemantauan kehadiran (`MonitoringScreen`), manajemen pegawai & unit kerja (`EmployeeDirectoryScreen`, `UnitDirectoryScreen`), log aktivitas terpisah (sistem & pribadi), serta analitik laporan + unduh/bagikan berkas **PDF, DOCX, dan CSV**.
* **Batasan Fitur Khusus Portal Web:** Penyusunan naskah **Surat Edaran Digital** (`surat_edaran_type = digital`) dan penyuntingan kustomisasi kop/penandatangan **Laporan Berita Acara** (`report_config`) disediakan secara khusus melalui portal Web SIPERAPAT; layar terkait pada mobile menampilkan pemberitahuan terarah sambil tetap mendukung mode unggah berkas dan pratinjau/ekspor dokumen.

---

## 2. Arsitektur Kode & Struktur Direktori

Menggunakan pendekatan berlapis (*Clean / Feature-Layered Architecture*) dengan manajemen state **Zustand `^5.0.15`**:

```text
src/
├── core/
│   ├── config/          # apiConfig.ts (EXPO_PUBLIC_API_BASE_URL, timeout 20s)
│   ├── theme/           # colors.ts (Slate Navy #0F172A, Emerald #047857), tokens.ts, typography.ts
│   └── utils/           # dateFormatter.ts (Asia/Jakarta), mediaUrl.ts, nipValidator.ts, geofence.ts
├── domain/
│   ├── entities/        # types.ts (entitas domain ASN, Meeting, Attendance, Report)
│   └── repositories/    # interfaces.ts
├── data/
│   ├── datasources/     # apiClient.ts, authTokenStore.ts, authApi.ts, agendaApi.ts, attendanceApi.ts, reportApi.ts, userApi.ts, apiTypes.ts
│   ├── mappers/         # agendaMapper.ts, apiMappers.ts
│   └── repositories/    # Implementasi repository + AgendaExportRepository (FileSystem + Sharing)
└── presentation/
    ├── components/      # attendance/, cards/, common/ (AutoScrollText, TutWuriLoader, TutWuriRefresh, SimpleHtmlView, Header, PaginationBar), modals/, receipt/ (PerforatedTicket), transitions/
    ├── constants/       # employeeOptions.ts, meetingOptions.ts
    ├── navigation/      # AppNavigator.tsx, types.ts (24 Stack/Tab screens + BackHandler guard)
    ├── store/           # useAuthStore, useDashboardStore, useMeetingStore, useAttendanceStore, useEmployeeStore, useFeedbackStore, useTransitionStore
    ├── utils/           # permissionUtils.ts (paritas RBAC & delegasi Pimpinan/Notulis)
    └── screens/         # 24 layar operasional:
                         # Auth & Shell : SplashScreen, LoginScreen, ForgotPasswordScreen, DashboardScreen
                         # Agenda & Absen: AgendaScreen, AgendaDetailScreen, CreateMeetingScreen, EditMeetingScreen,
                         #                 PresensiScreen, ReceiptScreen, RiwayatScreen, MonitoringScreen
                         # Admin & Audit : EmployeeDirectoryScreen, AddEmployeeScreen, EditEmployeeScreen,
                         #                 UnitDirectoryScreen, AddUnitScreen, EditUnitScreen,
                         #                 AuditLogScreen, PersonalActivityLogScreen
                         # Laporan & Akun: ReportsScreen, ReportDetailScreen, ProfileScreen, ChangePasswordScreen
```

---

## 3. Tech Stack Utama (`package.json`)

* **Framework:** Expo `^58.0.19`, React Native `0.88.0`, React `19.3.0`, TypeScript `~6.0.3`
* **Navigasi:** `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `@react-navigation/material-top-tabs`
* **State & Ikon:** `zustand ^5.0.15`, `lucide-react-native ^1.72.0`, `react-native-svg`
* **Perangkat & Berkas:** `expo-camera`, `expo-image-manipulator`, `expo-image-picker`, `expo-document-picker`, `expo-file-system`, `expo-sharing`, `expo-secure-store`

---

## 4. Instalasi & Konfigurasi Lokal

### Prasyarat
* Node.js 20 LTS & NPM
* Backend Laravel **SIPERAPAT** (`lldikti-x`) yang aktif serta dapat diakses via HTTP/HTTPS

### Langkah Setup
```bash
# 1. Instal dependensi
npm install

# 2. Konfigurasikan endpoint API v1 pada .env
cp .env.example .env
```
Sesuaikan isi `.env` dengan URL lengkap API v1 beserta skema protokol:
```env
EXPO_PUBLIC_API_BASE_URL=https://domain-siperapat-anda.go.id/api/v1
```
```bash
# 3. Jalankan server Metro / Expo
npx expo start
```

---

## 5. Verifikasi Mutu & Build Produksi

```bash
# Pemeriksaan tipe TypeScript statis
npx tsc --noEmit

# Uji bundling Metro Android (Hermes bytecode + aset)
npx expo export --platform android

# Build APK / AAB melalui EAS
eas build --platform android --profile production
```

---

## 6. Dokumentasi Terkait

* **Matriks Keselarasan Kontrak API Mobile:** [`docs/api-contract-alignment.md`](docs/api-contract-alignment.md)
* **Spesifikasi Resmi REST API v1 (Backend):** Lihat `API.md` pada repositori backend `lldikti-x` (berdasarkan `routes/api.php`)
* **Kebutuhan Produk & Skema Data:** Lihat `PRD.md` dan `ERD.md` pada repositori backend `lldikti-x`
