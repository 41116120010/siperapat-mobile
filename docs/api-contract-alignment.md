# Matriks Keselarasan Kontrak API — SIPERAPAT Mobile

Dokumen ini memetakan keterhubungan aktual antara datasource klien mobile (`src/data/datasources/*`) dengan endpoint resmi REST API v1 backend Laravel (`lldikti-x/routes/api.php`). Rujukan detail payload dan validasi server berada pada `lldikti-x/API.md`.

---

## 1. Klien HTTP & Keamanan Token

| Komponen | Implementasi Aktual Mobile | Penyelarasan Backend |
|---|---|---|
| **Konfigurasi URL** | `src/core/config/apiConfig.ts` membaca `EXPO_PUBLIC_API_BASE_URL` (timeout 20 detik). | Prefix `/api/v1` pada `routes/api.php`. |
| **Transport (`apiClient.ts`)** | `fetch` native mendukung JSON, `FormData` multipart, dan respons biner (`Blob`). Log error jaringan disamarkan tanpa mencetak kredensial atau body. | Amplop respons `{ success, message, data, meta? }` dan header `Authorization: Bearer <token>`. |
| **Token (`authTokenStore.ts`)** | Disimpan terenkripsi menggunakan `expo-secure-store` (native Android/iOS); sesi non-persisten & runtime web hanya berada di memori. Respons `401` otomatis membersihkan token lokal. | Token Sanctum masa aktif 30 hari (`43.200` menit). Perubahan/reset sandi dan penonaktifan akun mencabut token lama. |

---

## 2. Matriks Keselarasan Modul Endpoint

| Modul | Pemanggilan Datasource Mobile | Status Keselarasan Sumber |
|---|---|---|
| **Autentikasi & Reset Sandi** | `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/me`, `POST /auth/logout` | **Selaras penuh.** Login biometrik lokal tidak diaktifkan tanpa sesi token server. |
| **Dashboard & Profil** | `GET /dashboard`, `GET /profile`, `PUT /profile`, `PUT /profile/password` (rotasi token), `GET /profile/logs` | **Selaras.** Catatan minor: `UserResource` mengembalikan kunci `security.last_login_at`/`last_login_label`, sedangkan `apiTypes.ts` mendeklarasikan `last_api_login_*` (atribut tersebut sudah tidak ditampilkan pada UI profil/edit pengguna). |
| **Agenda & Surat Edaran** | `GET/POST/PUT/DELETE /agendas`, `PATCH /agendas/{id}/status`, `GET/POST /agendas/{id}/surat-edaran`, serta lookup kandidat lintas unit (`/users?status=active` & `/units?all=true&status=active`) | **Selaras.** Editor naskah digital (`/surat-edaran/digital`) sengaja diarahkan ke portal Web (`CreateMeetingScreen` & `EditMeetingScreen` menampilkan notifikasi khusus Website). |
| **Notulensi & Dokumentasi** | `PUT` / multipart `POST /agendas/{id}/notulen` | **Selaras** untuk baca, simpan notulensi/kesimpulan, dan unggah foto dokumentasi. Endpoint backend `DELETE /agendas/{id}/documentations/{doc}` tersedia di server namun belum dipanggil melalui UI mobile terpisah. |
| **Presensi & Tanda Terima** | `GET /agendas/{id}/attendance-portal`, `POST /agendas/{id}/attendances`, `GET /agendas/{id}/attendances`, `GET /attendances/my-history`, `GET /attendances/{id}/receipt`, streaming media `/selfie` & `/signature` dengan header Bearer | **Selaras penuh.** Foto selfie dikompresi klien (≤ 512 KB) + tanda tangan PNG/SVG dikirim langsung ke server (tidak ada *offline queue* atau validasi GPS/geofence runtime). |
| **Pegawai & Unit Kerja** | `GET/POST/PUT/DELETE /users`, `PATCH /users/{id}/toggle-status`, `GET/POST/PUT/DELETE /units`, `PATCH /units/{id}/toggle-status` | **Selaras penuh.** `AddEmployeeScreen` meminta kata sandi awal yang divalidasi klien sebelum memanggil `POST /users`. |
| **Audit Log** | `GET /activity-logs` (Administrator) dan `GET /profile/logs` (Pribadi) | **Selaras penuh** sebagai dua layar independen (`AuditLogScreen` dan `PersonalActivityLogScreen`). |
| **Laporan & Ekspor** | `GET /reports/summary`, `GET /reports/agendas`, `GET /reports/agendas/{id}`, `GET /reports/summary/csv`, `GET /reports/agendas/{id}/export/{pdf\|word\|csv}` via `AgendaExportRepository` | **Selaras.** Pengaturan kustom kop/penandatangan Berita Acara (`report_config`) dikelola via Web; mobile melakukan pratinjau, unduh, dan bagikan berkas (`expo-sharing`). |

---

## 3. Cakupan Verifikasi

* **Verifikasi Statis:** Diperiksa langsung terhadap berkas `src/data/datasources/*.ts`, `src/data/repositories/*.ts`, `src/presentation/screens/*.tsx`, serta `lldikti-x/routes/api.php` dan `app/Http/Resources/*.php`.
* **Pengujian Runtime End-to-End:** Pengujian koneksi jaringan langsung terhadap server produksi/staging serta uji pada perangkat fisik Android/iOS dijalankan terpisah saat fase rilis APK/AAB sesuai target domain `.env`.
