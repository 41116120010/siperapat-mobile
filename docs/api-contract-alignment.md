# Audit Kontrak API SIPERAPAT Mobile

Tanggal pemeriksaan source: 27 Oktober 2026

Project mobile: `main` pada `4d7d14e` (`origin/main` juga `4d7d14e`). Working tree sebelum pembaruan dokumentasi memiliki perubahan lokal pada `src/data/datasources/apiClient.ts` untuk menyamarkan log network; perubahan tersebut dipertahankan. Dua stash backup tetap ada.

Backend source yang dibandingkan: `C:\projects\meet-manager`, `main` pada `a17448a`; working tree backend memiliki sembilan perubahan lokal. Temuan kontrak di dokumen ini berasal dari source lokal tersebut, bukan dari server hosting.

## Status bukti

- **Ada di source** berarti pemanggilan API dan pemetaan/repository ditemukan di kode mobile.
- **Typecheck** berarti TypeScript lolos; ini tidak membuktikan request berhasil terhadap server.
- **Runtime belum diverifikasi** berarti belum dilakukan uji perangkat atau request end-to-end terhadap server hosting.
- Dokumentasi lama tertanggal 13 Oktober menyatakan mobile belum memiliki API client dan seluruh fungsi masih lokal. Pernyataan itu sudah usang; matriks di dokumen ini menggantikannya.
- Tidak ditemukan test script atau test runner pada `package.json`. Expo lint juga belum dapat dijalankan karena konfigurasi ESLint tidak tersedia; auto-setup sebelumnya gagal koneksi dan tidak diulang.

## 1. API client dan autentikasi

| Area | Implementasi saat ini | Status verifikasi / batas |
|---|---|---|
| Base URL | `src/core/config/apiConfig.ts` membaca `EXPO_PUBLIC_API_BASE_URL`; `.env` lokal berisi URL preview dengan prefix `/api/v1`. | Konfigurasi lokal terbaca dari source; koneksi server belum diuji. `.env.example` memakai `example.com/api/v1` tanpa skema `https://`, jadi perlu dilengkapi saat dipakai sebagai URL nyata. |
| HTTP client | `src/data/datasources/apiClient.ts` memakai `fetch`, JSON, multipart, binary/Blob, timeout 20 detik, Bearer token, dan parsing `Content-Disposition`. | Ada di source. Tidak melakukan validasi runtime terhadap schema JSON; generic TypeScript hanya pemeriksaan saat build. |
| Error | Membuat `ApiError` untuk HTTP, network, timeout, dan konfigurasi. Menyediakan pesan untuk 401/403/422/429, validation errors, serta `Retry-After`; 401 pada request terproteksi menghapus token dan memberi tahu auth store. | Ada di source; variasi respons gateway/server belum diuji runtime. Tidak ada mekanisme retry otomatis. |
| Logging | Log network error hanya mencatat method, path tanpa query, dan jenis error. Body, password, token, URL penuh, query, dan objek error tidak dicetak. | Perubahan lokal di `apiClient.ts`; `git diff --check` dan TypeScript diperiksa setelahnya. |
| Token Android/iOS | `src/data/datasources/authTokenStore.ts` menyimpan token di `expo-secure-store`; token non-persisten hanya di memori. Header `Authorization: Bearer …` ditambahkan pada request terproteksi. | Ada di source. Kegagalan SecureStore saat runtime perangkat belum diuji. |
| Web | Token tidak disimpan secara persisten untuk browser; pada runtime web token hanya berada di memori proses. | Aplikasi mobile; sesi browser tidak bertahan setelah reload. |

### Alur auth yang dicocokkan dengan source Laravel

| Alur | Mobile | Backend source | Kesesuaian |
|---|---|---|---|
| Login | `POST /auth/login` dengan `{ login, password, device_name }`; token disimpan sesuai opsi remember. | `routes/api.php` dan `AuthController::login` menerima request LoginRequest dan mengembalikan `data.token`, `token_type`, `expires_in_days`, `user`. | Cocok pada source. Login server/perangkat belum diuji. |
| Bootstrap sesi | `GET /auth/me`; `UserResource` dipetakan ke model ASN. 401 menghapus token. | Route dilindungi Sanctum dan mengembalikan `UserResource`. | Cocok pada source; runtime belum diuji. |
| Logout | `POST /auth/logout`, lalu token lokal selalu dibersihkan. | Menghapus current access token Sanctum. | Cocok pada source; runtime belum diuji. |
| Ubah kata sandi | `PUT /profile/password` dengan `current_password`, `password`, `password_confirmation`, `device_name`; token hasil respons menggantikan token lama sambil mempertahankan status persistensi. | `ProfileController::updatePassword` mencabut token lama dan mengembalikan token baru; UpdatePasswordRequest memvalidasi password. | Cocok pada source; uji rotasi token belum dilakukan terhadap server. |
| Biometrik | Repository melempar error “belum didukung API”. | Tidak ada route biometrik pada daftar route API yang diperiksa. | Belum tersedia; bukan login biometrik server. |

## 2. Inventaris pemanggilan API dari mobile

Semua path relatif di bawah menggunakan base URL dengan prefix `/api/v1`.

| Modul | Request yang ada di source mobile | Status dan batas |
|---|---|---|
| Dashboard | `GET /dashboard` melalui `DashboardRepositoryImpl`; memetakan `stats` dan `active_agendas`. | Terhubung di source. Repository tidak meneruskan `recent_attendances` ke `DashboardData`. Runtime belum diuji. |
| Agenda | `GET /agendas`, `GET /agendas/{id}`, `POST /agendas`, `PUT /agendas/{id}`, `DELETE /agendas/{id}`, `PUT` atau multipart `POST /agendas/{id}/notulen`, unggah surat edaran, serta lookup `GET /users` dan `/units`. | Repository dan mapper API tersedia. Tidak ditemukan pemanggilan khusus `PATCH /agendas/{id}/status` atau `PATCH /agendas/{id}/roles`; `UpdateAgendaDto` punya field `status`, `pimpinan_id`, dan `notulis_id`, tetapi pemetaan melalui `PUT` perlu dicocokkan dengan validasi backend sebelum dianggap setara. |
| Presensi | `GET /agendas/{id}/attendance-portal`, `POST /agendas/{id}/attendances`, `GET /attendances/my-history`, `GET /agendas/{id}/attendances`, dan `GET /attendances/{id}/receipt`. | Repository memetakan respons dan pagination. Payload submit yang diteruskan repository berupa `selfie_data` dan `signature_data`; API datasource juga mengetik alternatif file. Uji capture/upload perangkat belum dilakukan. |
| Offline presensi | `getOfflineQueue()` selalu mengembalikan `[]`; `syncOfflineQueue()` mengembalikan `0`. | Sinkronisasi offline belum diimplementasikan; UI yang menampilkan affordance sync tidak berarti ada antrean atau pengiriman offline. |
| Direktori pegawai | `GET /users` (search/filter/page), detail, update, delete, toggle status; `GET /units`, detail, create/update/delete unit. | Terhubung di source. `createEmployee()` sengaja melempar error; form tambah pegawai tidak mengirim password awal. `userApi.create()` hanya helper datasource dan tidak dipakai repository. |
| Audit log | Screen memilih `GET /activity-logs` untuk Administrator dan `GET /profile/logs` untuk role lain; memakai pencarian, kategori, dan pagination. | Pemilihan endpoint ada di source. Penolakan akses role harus tetap ditegakkan backend; pengujian langsung server belum dilakukan pada audit ini. |
| Ekspor agenda | `GET /reports/agendas/{id}/export/{pdf|word|csv}` sebagai binary, lalu simpan ke cache dan buka native share sheet. | Alur source tersedia; unduhan dan sharing belum diuji pada perangkat. |
| File agenda/presensi | API client mendukung multipart/binary; media presensi diminta melalui URL protected dan beberapa viewer menambahkan Bearer. | Perilaku file, MIME, izin storage, dan server hosting belum diverifikasi runtime. |

## 3. Matriks kompatibilitas terkini

| Fitur | Kondisi integrasi di source | Gap / catatan | Pengujian |
|---|---|---|---|
| Login, token, `/auth/me`, logout | Terhubung melalui `apiClient`, `authApi`, `AuthRepositoryImpl`, `authTokenStore`, dan `useAuthStore`. | Tidak ada login biometrik API. Respons JSON belum divalidasi schema saat runtime. | Belum ada uji server/perangkat. |
| Profil dan ubah kata sandi | GET/PUT profile dan rotasi token password terhubung. | `ApiUserDto.security` masih memakai `last_api_login_at`/`last_api_login_label`; `UserResource` Laravel source mengeluarkan `last_login_at`/`last_login_label`. UI yang bergantung pada field terakhir dapat menampilkan kosong. | Perbedaan field terverifikasi melalui source; runtime belum diuji. |
| Dashboard | API terhubung dan stats/active agendas dipetakan. | `recent_attendances` belum diteruskan oleh repository dashboard; tipe field hanya mendeskripsikan respons. | Typecheck bukan bukti data server. |
| Daftar/detail/buat/edit/hapus Agenda | Request API dan repository tersedia. | Operasi khusus PATCH status/roles tidak dipanggil. `uploadSuratEdaran()` fallback saat request apa pun gagal, bukan hanya 404; perlu perhatian agar error server tidak memicu request fallback yang tidak perlu. | Belum diuji server/perangkat. |
| Notulensi | Update notulensi dan unggah foto/caption menggunakan endpoint notulen. | Penghapusan dokumentasi memiliki route backend, tetapi tidak ditemukan method datasource/repository mobile untuk DELETE dokumentasi. | Source saja. |
| Presensi dan riwayat | Portal, submit media, riwayat, daftar hadir agenda, dan receipt memiliki datasource/repository. | Tidak ada bukti GPS/geofence atau validasi jarak di kontrak mobile ini. Offline queue stub. | Belum diuji perangkat/server. |
| Direktori pegawai/unit | List/detail/edit/delete/status dan CRUD unit terhubung. | Pembuatan pegawai diblokir karena mobile belum meminta password awal; jangan mengaktifkan helper create tanpa keputusan/alur password. `apiTypes.ts` juga mendeklarasikan `attendance_stats.completed_agendas`, sementara Resource source yang diperiksa tidak mengeluarkan field tersebut. | Source saja; create sengaja gagal terkontrol. |
| Audit log | Screen menggunakan endpoint sistem atau pribadi sesuai role mobile. | Role dari mobile hanya menentukan tampilan/pemilihan request; bukan pengganti authorization server. | Belum diuji akses langsung ke server. |
| Ekspor | Binary API client dan penyimpanan/berbagi file memiliki implementasi. | MIME, nama file, dan sharing native belum diuji runtime. | Belum diuji perangkat. |

## 4. Batas pembuatan pegawai

Form `AddEmployeeScreen` mengirim identitas, username, email, unit, role, dan status, tetapi tidak memiliki password awal. `EmployeeRepositoryImpl.createEmployee()` karena itu menolak operasi sebelum request dikirim. `userApi.create()` tersedia sebagai fungsi datasource, tetapi tidak digunakan oleh repository.

Backend source lokal yang diperiksa memakai `StoreUserRequest` bersama oleh controller web dan API, dengan password wajib minimal 8 karakter serta huruf dan angka. Karena itu, menambahkan pemanggilan `POST /users` dari form mobile saat ini akan mendapat validasi gagal dan tidak boleh disamarkan sebagai pembuatan akun berhasil. Pengaktifan fitur memerlukan keputusan produk tentang password awal atau proses undangan/set-password; kontrak undangan tidak diasumsikan di sini.

## 5. Isu dan prioritas tindak lanjut

1. **P1 — Kontrak profil:** sesuaikan nama field `security` dengan Resource backend setelah kontrak disepakati; field saat ini berbeda pada source.
2. **P1 — Pembuatan pegawai:** tentukan alur password awal/undangan sebelum menambah UI atau mengaktifkan request create.
3. **P1 — Agenda:** verifikasi apakah status dan role memang boleh diperbarui melalui `PUT /agendas/{id}`; jika harus memakai route PATCH yang tersedia, tambahkan pemanggilan khusus setelah kontrak dan UI dipastikan.
4. **P1 — Error upload surat edaran:** batasi fallback pada kondisi route yang memang tidak tersedia; jangan mengubahnya sebelum strategi error dan endpoint hosting diverifikasi.
5. **P2 — Dashboard/notulensi:** teruskan `recent_attendances` bila layar membutuhkannya dan tambahkan pemanggilan delete dokumentasi bila alur UI mendukung.
6. **P2 — Offline:** jangan menyatakan antrean tersinkron; implementasi queue memerlukan kebijakan retry dan kontrak backend.
7. **P2 — Verifikasi runtime:** uji login, sesi, rotasi token, error validasi, akses role, multipart, binary, dan pagination pada server/perangkat aktual.

## 6. Batas pemeriksaan

Pemeriksaan ini membandingkan source mobile saat ini dengan source route/controller/request/resource Laravel yang tersedia lokal. Backend lokal berada pada `a17448a` dan memiliki perubahan belum di-commit; temuan tidak otomatis menggambarkan kode yang sedang berjalan di hosting. Tidak dilakukan request ke server, login akun nyata, pengujian perangkat, atau perubahan backend.

### File mobile yang menjadi dasar

- `src/core/config/apiConfig.ts`
- `src/data/datasources/apiClient.ts`, `authApi.ts`, `authTokenStore.ts`, `apiTypes.ts`, `agendaApi.ts`, `attendanceApi.ts`, `userApi.ts`, `reportApi.ts`
- `src/data/repositories/AuthRepositoryImpl.ts`, `DashboardRepositoryImpl.ts`, `MeetingRepositoryImpl.ts`, `AttendanceRepositoryImpl.ts`, `EmployeeRepositoryImpl.ts`, `AgendaExportRepository.ts`
- `src/presentation/store/useAuthStore.ts`, `useDashboardStore.ts`, `useMeetingStore.ts`, `useAttendanceStore.ts`, `useEmployeeStore.ts`
- `src/presentation/screens/AddEmployeeScreen.tsx`, `AuditLogScreen.tsx`, serta screen yang memakai repository di atas.

### File backend yang dibandingkan

- `routes/api.php`
- `app/Http/Controllers/Api/V1/AuthController.php`, `ProfileController.php`, dan `UserController.php`
- `app/Http/Requests/Auth/LoginRequest.php`, `Profile/UpdatePasswordRequest.php`, `User/StoreUserRequest.php`
- `app/Http/Resources/UserResource.php`

Ketersediaan route dibuktikan melalui source route/controller, bukan hanya dokumentasi. Bukti source tersebut tidak menggantikan uji runtime.
