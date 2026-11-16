# SIPERAPAT Mobile

**Sistem Informasi Presensi & Rapat Kedinasan - LLDIKTI Wilayah X**  
*Kementerian Pendidikan Tinggi, Sains, dan Teknologi Republik Indonesia*

Aplikasi klien mobile resmi **SIPERAPAT** berbasis **React Native (`0.88.0`)**, **Expo SDK (`^58.0.19`)**, dan **TypeScript (`~6.0.3`)** yang terintegrasi *stateless* dengan backend **Laravel 13** melalui REST API v1 (`Authorization: Bearer`).

---

## 1. Kapabilitas Utama & Matriks Akses Peran

### Akses Menu & Layar per Level Pengguna

| Fitur / Layar | Administrator | Admin Unit | Staff | Staff sebagai Pimpinan / Notulis |
|---|---|---|---|---|
| **Tab Navigasi Utama** | Dashboard, Riwayat, Agenda, Profil | Dashboard, Riwayat, Agenda, Profil | Dashboard, Riwayat, Profil | Sama seperti role akun (bisa buka `MonitoringScreen` untuk rapat tugas) |
| **Presensi Selfie & TTD Digital** | Ya (semua rapat `ongoing`) | Ya (rapat sasaran) | Ya (rapat sasaran) | Ya (rapat sasaran / tugas) |
| **Buat & Edit Agenda (`Create/EditMeetingScreen`)** | Semua unit (`all_units`, `selected_units`, `selected_users`) | Agenda unit sendiri / dibuat sendiri (`selected_units`, `selected_users`) | Tidak tersedia | Admin Unit yang ditugaskan bisa edit saat `ongoing` |
| **Pantau Hadir & Verifikasi Selfie/TTD (`MonitoringScreen`)** | Semua rapat | Rapat terkait unitnya | Tidak tersedia (`AgendaDetailScreen` tanpa daftar peserta lain) | **Pimpinan Rapat (`leaderId`)** otomatis diarahkan ke `MonitoringScreen` & dapat memverifikasi media peserta |
| **Kelola Notulensi & Foto Dokumentasi** | Semua agenda (kecuali `cancelled`) | Pembuat / Admin Unit penyelenggara | Tidak tersedia | Pimpinan atau Notulis ber-role `staff` dapat mengelola saat status `ongoing` |
| **Laporan & Ekspor (PDF / DOCX / CSV)** | Seluruh instansi | Terlingkup unit terkait | Tidak tersedia | Mengikuti role akun |
| **Kelola Pegawai (`EmployeeDirectoryScreen`)** | Semua unit | Khusus pegawai di unit sendiri | Tidak tersedia | Mengikuti role akun |
| **Unit Kerja (`UnitDirectoryScreen`) & Audit Sistem (`AuditLogScreen`)** | Ya (penuh) | Tidak tersedia | Tidak tersedia | Tidak tersedia |

### Perilaku Inti Aplikasi Mobile

* **Autentikasi, Sesi Aman & Pemulihan Sandi:** Login multi-identifier (NIP 18 digit / Username), pemulihan kata sandi via email Brevo (`ForgotPasswordScreen`), serta penyimpanan token terenkripsi di `expo-secure-store`. Saat token kedaluwarsa (`401`) atau akun dinonaktifkan (`403 ACCOUNT_INACTIVE`), aplikasi otomatis mencabut sesi, membersihkan cache berkas biometrik di perangkat, mereset seluruh store Zustand, dan mengarahkan stack navigasi kembali ke `Login`.
* **Standardisasi Waktu WIB (`Asia/Jakarta`):** Seluruh pemformatan tanggal, rentang jadwal termasuk mode **"Hingga Selesai"** (`waktu_selesai = null`), dan stempel waktu presensi diproses seragam pada zona waktu `+07:00` melalui `src/core/utils/dateFormatter.ts`.
* **Tipografi Adaptif & Indikator Tut Wuri:** `AutoScrollText` mencegah teks panjang atau badge filter terpotong elipsis pada layar sempit; indikator muat/transisi memakai `TutWuriLoader`, `TutWuriRefresh`, dan `PageTransitionOverlay`; seluruh dialog dan toast validasi memakai `GlobalFeedbackHost` (`useFeedbackStore`) tanpa `Alert.alert` native.
* **Proteksi Tombol Back Android (`BackHandler`):** Menjaga layar selama overlay transisi/modal aktif, mengarahkan tab sekunder kembali ke `Dashboard`, meminta konfirmasi sebelum keluar dari formulir & presensi (`PROTECTED_FORM_ROUTES`), serta guard keluar dua kali pada root screen.
* **Presensi Multimodal & Kompresi Lokal:** Pengambilan swafoto wajah (`FaceOvalOverlay` via `expo-camera` dengan fallback galeri dan kompresi `expo-image-manipulator`: lebar `600px` JPEG `0.75`, fallback `480px` `0.5` agar `<= 512 KB`) serta kanvas tanda tangan digital SVG (`DigitalSignaturePad`), diikuti bukti sah (`ReceiptScreen` & `PerforatedTicket`).
* **Isolasi & Cache Media Biometrik Terotentikasi:** Unduhan swafoto, TTD, dan surat edaran memakai `src/core/utils/authenticatedMediaCache.ts` (deduplikasi request, cek status `2xx` sebelum caching, anti-cache-poisoning). Bila server menandai `can_view_biometrics: false`, klien tidak memanggil endpoint media melainkan menampilkan `BiometricPrivacyPlaceholder` (ikon vektor gembok Slate) alih-alih ikon gagal muat.
* **Batasan Khusus Portal Web:** Penyusunan naskah **Surat Edaran Digital** (`surat_edaran_type = digital`) dan kustomisasi lanjutan kop/penandatangan **Berita Acara** (`report_config`) dikelola khusus melalui portal Web SIPERAPAT; layar mobile terkait menyediakan pemberitahuan terarah sambil tetap mendukung mode unggah berkas dan ekspor dokumen.

---

## 2. Arsitektur Kode & Struktur Direktori

Aplikasi menerapkan struktur berlapis dengan manajemen state **Zustand `^5.0.15`**:

```text
src/
├── core/
│   ├── config/          # apiConfig.ts (EXPO_PUBLIC_API_BASE_URL, timeout 20s)
│   ├── theme/           # colors.ts (Slate Navy #0F172A, Emerald #047857), tokens.ts, typography.ts
│   └── utils/           # authenticatedMediaCache.ts, dateFormatter.ts (WIB), mediaUrl.ts, nipValidator.ts
├── domain/
│   ├── entities/        # types.ts (ASN, Meeting, Attendance, UserOption, MeetingPermissions)
│   └── repositories/    # interfaces.ts
├── data/
│   ├── datasources/     # apiClient.ts, authTokenStore.ts, authApi.ts, agendaApi.ts, attendanceApi.ts,
│   │                    # reportApi.ts, userApi.ts, apiTypes.ts
│   ├── mappers/         # apiMappers.ts
│   └── repositories/    # Implementasi repository + AgendaExportRepository (FileSystem + Sharing)
└── presentation/
    ├── components/      # attendance/, cards/, common/ (AutoScrollText, BiometricPrivacyPlaceholder,
    │                    # GlobalFeedbackHost, Header, PaginationBar, TutWuriLoader, TutWuriRefresh, ...),
    │                    # forms/, modals/, receipt/ (PerforatedTicket), transitions/
    ├── constants/       # employeeOptions.ts, meetingOptions.ts
    ├── navigation/      # AppNavigator.tsx, types.ts (24 Stack/Tab screens + BackHandler guard)
    ├── store/           # useAuthStore, useMeetingStore, useAttendanceStore,
    │                    # useEmployeeStore, useFeedbackStore, useTransitionStore
    ├── utils/           # permissionUtils.ts (selaras dengan AgendaPolicy & API permissions)
    └── screens/         # 24 layar operasional:
                         # Auth & Shell  : SplashScreen, LoginScreen, ForgotPasswordScreen, DashboardScreen
                         # Agenda & Absen: AgendaScreen, AgendaDetailScreen, CreateMeetingScreen, EditMeetingScreen,
                         #                 PresensiScreen, ReceiptScreen, RiwayatScreen, MonitoringScreen
                         # Admin & Audit : EmployeeDirectoryScreen, AddEmployeeScreen, EditEmployeeScreen,
                         #                 UnitDirectoryScreen, AddUnitScreen, EditUnitScreen,
                         #                 AuditLogScreen, PersonalActivityLogScreen
                         # Laporan & Akun: ReportsScreen, ReportDetailScreen, ProfileScreen, ChangePasswordScreen
```

---

## 3. Tech Stack & Izin Perangkat (`package.json` & `app.json`)

* **Framework:** Expo `^58.0.19`, React Native `0.88.0`, React `19.3.0`, TypeScript `~6.0.3`
* **Navigasi:** `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `@react-navigation/material-top-tabs`
* **State & Ikon:** `zustand ^5.0.15`, `lucide-react-native ^1.72.0`, `react-native-svg`
* **Perangkat & Berkas:** `expo-camera`, `expo-image-manipulator`, `expo-image-picker`, `expo-document-picker`, `expo-file-system`, `expo-sharing`, `expo-secure-store`
* **Izin Android (`app.json`):** `CAMERA` (swafoto presensi), `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`, `USE_BIOMETRIC` / `USE_FINGERPRINT` (`allowBackup: false`, `predictiveBackGestureEnabled: false`).

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

## 5. Verifikasi Mutu & Build Android

```bash
# Pemeriksaan tipe TypeScript statis
npx tsc --noEmit

# Uji bundling Metro Android (Hermes bytecode + aset)
npx expo export --platform android
```

Untuk build binary produksi (APK/AAB) menggunakan EAS CLI (`eas build --platform android`), pastikan profil build pada `eas.json` sudah dikonfigurasi terlebih dahulu sesuai akun Expo instansi.

---

## 6. Panduan Kendala Umum (FAQ Teknis)

* **Mengapa muncul ikon gembok / keterangan "Dilindungi Privasi" pada foto atau TTD peserta rapat?**  
  Aplikasi menerima `can_view_biometrics: false` dari API untuk melindungi privasi ASN apabila akun Anda bukan pemilik presensi, Administrator, Admin Unit terkait, atau Pimpinan Rapat pada agenda tersebut.
* **Mengapa kamera selfie atau tombol pilih foto gagal / ditolak?**  
  Pastikan izin Kamera / Galeri diaktifkan pada pengaturan aplikasi perangkat, dan ukuran berkas hasil tangkapan tidak melebihi batas server 512 KB (aplikasi otomatis mengompresi foto di sisi klien sebelum kirim).
* **Mengapa sesi mendadak keluar otomatis ke layar Login?**  
  Terjadi apabila masa berlaku token Sanctum berakhir (30 hari), kata sandi akun diubah dari perangkat lain, atau akun dinonaktifkan oleh Administrator (`403 ACCOUNT_INACTIVE`).

---

## 7. Dokumentasi Terkait

* **Spesifikasi REST API v1 & Arsitektur Backend:** Lihat `README.md` dan `API.md` pada repositori backend `lldikti-x`.
