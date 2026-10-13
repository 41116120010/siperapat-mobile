# Audit Alignment Kontrak API Mobile SIPERAPAT

Tanggal audit: 13 Oktober 2026  
Cakupan: source pada branch `main` dari project mobile dan Laravel, bukan perilaku server yang sedang berjalan.

## 1. Ringkasan perubahan terbaru

### Verifikasi repositori

| Project | Branch / HEAD | Remote | Working tree |
|---|---|---|---|
| Mobile (`siperapat-android-baru`) | `main`, `9687b3e6e32f7422eaf05fa317ab8ed1fee4ef1c` (2026-10-08, “Patch: UI/UX Improvments.”), sama dengan `origin/main` | `origin` → `41116120010/siperapat-mobile.git` | `docs/` untracked sebelum audit; isinya `api-proposal.md` dan `backend-deep-audit.md`. Tidak ada file aplikasi yang berubah. |
| Backend (`meet-manager`) | `main`, `b3daaac7b177654dc3ca910bdf86ec391a7299b1` (2026-10-09, “Patch: Upcoming Error Possible.”), sama dengan `origin/main` | `origin` → `41116120010/lldikti-x.git` | clean saat diperiksa |

Tidak ada fetch/pull atau operasi Git yang dijalankan. Karena tidak ada informasi HEAD sebelum pull dalam workspace, “perubahan setelah pull” di sini berarti commit terbaru yang tampak dalam history lokal, bukan klaim bahwa perubahan tertentu terjadi akibat pull ini.

### Delta commit terbaru

- Mobile commit terbaru mengubah presentasi/navigation dan UX feedback: menambah `GlobalFeedbackHost`, `ToastNotification`, `FeedbackModal`, `useFeedbackStore`, serta memperbarui beberapa screen. Tidak ada repository API/client baru pada delta tersebut. App masih memakai Expo SDK 57 menurut `package.json`.
- Backend lima commit terakhir menambah/mengubah dokumentasi dan validasi login/user, migrasi database PostgreSQL, penanganan sequence PostgreSQL, serta perubahan tipe/constraint `jenis_rapat`. Perubahan terakhir secara khusus menambahkan sinkronisasi sequence dan test-nya. Tidak ditemukan perubahan route API v1 di delta lima commit itu.
- Mobile navigasinya memakai React Navigation (`AppNavigator.tsx`), bukan Expo Router. Ini kondisi proyek saat ini, tidak dinilai sebagai kontrak backend.

## 2. Temuan dasar tentang implementasi mobile

Pencarian source mobile tidak menemukan `fetch`, Axios, `XMLHttpRequest`, URL `/api/v1`, `baseURL`, atau header `Authorization`. Belum ada API client. `AuthRepositoryImpl`, `MeetingRepositoryImpl`, `AttendanceRepositoryImpl`, dan `EmployeeRepositoryImpl` menyimpan data di AsyncStorage; repository tertentu menginisialisasi data dari `mockData.ts`. Stores memanggil repository lokal tersebut.

Akibatnya, tabel di bawah membedakan **permintaan UI/domain yang disiratkan** dari **request jaringan yang benar-benar dikirim**: semua request jaringan saat ini adalah *tidak ada*. Payload “Mobile Request” adalah kebutuhan pemetaan ketika integrasi dibuat; tidak boleh dianggap sudah menjadi kontrak implementasi.

Model mobile juga mengandung field yang tidak ada dalam kontrak API: `Meeting.latitude`, `longitude`, `geofenceRadiusMeters`, invited count dan deskripsi/audience; `Attendance.distanceMeters`, koordinat GPS, status, verification token, dan field ASN; `ASN.pangkatGolongan`/`jabatan`; `Employee` menambah initials, attendance rate, login/register metadata. Backend tidak memberi/menyimpan semua field tersebut. Khususnya, API presensi backend tidak menerima koordinat GPS; requirement geofence/GPS **AMBIGUOUS** dan memerlukan keputusan bisnis sebelum dibangun.

## 3. Endpoint aktual backend

Semua route berikut dideklarasikan pada `routes/api.php`, prefix `/api/v1` Laravel. Selain login, seluruh route berada di middleware `auth:sanctum` dan `throttle:api`; endpoint mutasi presensi juga `throttle:attendance`, ekspor tertentu `throttle:export`. Response JSON umumnya `{ success, message, data, meta? }`, tetapi ekspor file mengembalikan binary/CSV. Validation Laravel lazimnya mengembalikan error HTTP 422, token tidak sah 401, otorisasi gagal 403; klien harus menangani respons non-2xx dan `errors` validasi.

### Sesi, akun, dashboard

| Method | Path | Request / hasil utama |
|---|---|---|
| POST | `/auth/login` | JSON `login` atau `identifier`, `password`, opsional `device_name` (request menerima alias `identifier`). Hasil `data.token`, `token_type: Bearer`, `expires_in_days: 30`, `user`. Login NIP angka atau username; akun inactive ditolak; throttling dan pesan kegagalan generik. |
| GET | `/auth/me` | Bearer. `data` berupa `UserResource`. |
| POST | `/auth/logout` | Bearer; mencabut current access token. |
| GET | `/dashboard` | Bearer; `data.stats`, `active_agendas`, `recent_attendances`. Stats berbeda menurut role. |
| GET/PUT | `/profile` | GET `UserResource`; PUT menerima `name`, `email`, `phone?`, `current_password?`, `password?`, `password_confirmation?`. Password baru min 8, huruf dan angka, konfirmasi; current password wajib ketika mengganti. Perubahan password mencabut token lama berdasarkan test E2E. |
| GET | `/profile/logs` | Query `type?`, `search?`, `per_page?` 1–50; activity log milik pengguna, paginasi `meta`. |

Sanctum expiration dikonfigurasi 43.200 menit (30 hari) di `config/sanctum.php`; token diberikan sebagai Bearer personal access token.

### Agenda rapat

| Method | Path | Request / hasil utama |
|---|---|---|
| GET | `/agendas` | Filter/paginasi didefinisikan di `Api\V1\AgendaController`; query role-aware; hasil `AgendaResource[]` dan `meta` (maksimal `per_page` 50). |
| POST | `/agendas` | `StoreAgendaRequest`; payload basis `judul_rapat`, jenis/tipe rapat, lokasi/link, waktu mulai/selesai, target unit atau semua unit, file opsional `surat_edaran`. Admin/Administrator saja. 201 + `AgendaResource`. Validasi konflik jadwal dan otorisasi server berlaku. |
| GET | `/agendas/{agenda}` | Detail `AgendaResource`; view atau viewStaff policy. |
| PUT | `/agendas/{agenda}` | `UpdateAgendaRequest`, struktur agenda dan kemungkinan file surat edaran; policy update. |
| DELETE | `/agendas/{agenda}` | Hapus; policy dan domain constraint; sukses tanpa resource atau 422. |
| PATCH | `/agendas/{agenda}/status` | `{ status }`; nilai `draft|scheduled|ongoing|completed|cancelled`; authorization `manageStatus`; respons status tertanam sebagai object `{value,label}`. |
| PATCH | `/agendas/{agenda}/roles` | Penetapan field `pimpinan_id`, `notulis_id` nullable ID user; authorization update. |
| PUT | `/agendas/{agenda}/notulen` | `notulensi`, `kesimpulan`, file `photos[]`, `captions[]` dan konfigurasi dokumen yang divalidasi request. Rich text disanitasi; policy manageMinutes. Multipart disarankan untuk file. |
| DELETE | `/agendas/{agenda}/documentations/{documentation}` | Hapus foto dokumentasi terkait agenda, policy `manageMinutes`. |

`AgendaResource` mengeluarkan snake_case, `status` sebagai object, `surat_edaran` sebagai object URL/extension/flags, relasi `creator`, `pimpinan`, `notulis`, `units`, attendance, `documentations`, HTML notulensi/kesimpulan, `is_eligible`, dan `has_attended`. Waktu ISO 8601; `waktu_selesai` dapat null. `jenis_rapat` adalah string dan constraint lama yang membatasi tipe sudah dijatuhkan oleh migration terbaru.

### Presensi dan media

| Method | Path | Request / hasil utama |
|---|---|---|
| GET | `/attendances/portal` | Feed agenda ongoing/upcoming dan lima presensi terbaru pengguna. |
| GET | `/agendas/{agenda}/attendance-portal` | Eligibility/status: `agenda`, `is_ongoing`, `is_eligible`, `has_attended`, `my_attendance`. |
| POST | `/agendas/{agenda}/attendances` | Salah satu dari `selfie_data` atau `selfie_file`, dan salah satu dari `signature_data` atau `signature_file`. Data URI image base64 atau file JPEG/JPG/PNG/WebP, file max 512 KB. Check-in hanya agenda ongoing dan user eligible; duplikat mengembalikan data existing, request baru 201. Backend menyimpan signed_at, selfie/signature, IP dan user-agent. |
| GET | `/attendances/my-history` | Query `per_page` 1–50 default 15; data attendance + `meta`. |
| GET | `/agendas/{agenda}/attendances` | Paginasi 1–100 default 25, admin/leader policy view. |
| GET | `/attendances/{attendance}/selfie` | Binary media terlindungi policy view; `Cache-Control` private/no-store. |
| GET | `/attendances/{attendance}/signature` | Binary media terlindungi policy view. |

`AttendanceResource` hanya mengembalikan `id`, `agenda_id`, `user_id`, optional `user`, `signed_at`, `selfie_url`, `signature_url`, `ip_address`, `user_agent`, timestamps. Tidak ada receipt/token verifikasi, status hadir/terlambat, GPS/koordinat/jarak atau sync flag pada response. GPS bukan bagian request backend saat ini. Media URL memerlukan Bearer untuk endpoint streaming.

### Direktori, unit, audit, laporan

| Method | Path | Request / hasil utama |
|---|---|---|
| GET | `/users` | Admin-scoped; query `search`, `unit_id` (Administrator), `role`, `status`, `per_page` 1–50. Paginated UserResource. |
| POST/GET/PUT/DELETE | `/users[/{user}]` | CRUD users. Create/update request memakai `name`, `nip` (8–30 digit), `username`, `email`, `password`, `role` enum backend, `unit_id`, `phone`, `is_active`; role/akses dibatasi policy dan admin scope. `PATCH /users/{user}/toggle-status` untuk status. |
| GET | `/units` | Query `search`, `status`, `all=true` (semua, tanpa meta), atau paginasi 1–50. UnitResource: `nama_unit`, `kode_unit`, `deskripsi`, `is_active`, counts. |
| POST/GET/PUT/DELETE | `/units[/{unit}]` | CRUD unit, request `nama_unit`, `kode_unit`, `deskripsi?`, `is_active?`; policies dan domain constraint. `PATCH /units/{unit}/toggle-status`. |
| GET | `/activity-logs` | Agency-wide audit, `viewAny` policy hanya Administrator; query `type`, `user_id`, `start_date`, `end_date`, `search`, `per_page` 1–100. Data ActivityLogResource + meta. |
| GET | `/reports/summary` | Query `start_date`, `end_date`, `tipe_rapat`; totals agenda/attendance. |
| GET | `/reports/agendas/{agenda}` | Recap + export links PDF/Word; policy view. |
| GET | `/reports/agendas/{agenda}/export/pdf` | File binary PDF; policy view, audit export, throttled. |
| GET | `/reports/agendas/{agenda}/export/word` | File Word; policy view, audit export, throttled. |
| GET | `/reports/summary/csv` | CSV stream; filter tanggal/status/unit/tipe; throttled dan audit. |
| POST | `/reports/agendas/{agenda}/config/reset` | Reset konfigurasi laporan; policy update. |

## 4. Matriks kompatibilitas

| Feature | Mobile Request | Actual API | Compatibility | Gap | Recommended Fix |
|---|---|---|---|---|---|
| Login, token, logout | UI identifier/password; repository hanya simulasi lokal, menerima password min 4 dan membuat user mock. Tidak mengirim request/token. | POST login dengan `login`/`identifier` + `password`; Bearer token, user resource; POST logout mencabut token. | **Tidak kompatibel (belum terintegrasi)** | Bentuk login secara konsep cocok, tetapi validasi mobile berbeda; tidak ada token persistence/header/401/logout server. Biometrics hanya mock dan tak ada endpoint biometrik. | Tambah API client/session sesuai API nyata, simpan token aman sesuai keputusan platform, implementasi login/logout dan refresh identity via `/auth/me`; biometrik tetap local gate atas session aktif. Jangan menambah API ubah password terpisah. |
| Profil / ubah password | Profile mock ASN; perubahan password lokal memeriksa kebijakan sendiri. | GET/PUT `/profile`; server mewajibkan `current_password`, `password_confirmation`, password letters+numbers; token dicabut sesudah ubah password. | **Tidak kompatibel** | Type `ASN` vs `UserResource`; UI/logic tidak mengirim email/name required atau confirmation; token stale setelah perubahan. | Mapping DTO explicit ke ASN/UI; update form dan re-login setelah token revoked. |
| Dashboard | Menampilkan nilai dari meeting/attendance store lokal. | GET `/dashboard`; stats role-based, active agendas, recent attendance. | **Belum terintegrasi** | Struktur server tak dipetakan; angka mock dan pagination/tanggal bisa keliru. | Integrasikan GET dan definisikan adapter resource ke model tampilan; jangan menganggap `stats` seragam lintas role. |
| Agenda rapat (feed/list) | `getMeetings()` baca seed; tipe status/type dan field Meeting lokal. | GET `/agendas` paginated dan GET `/dashboard`; attendance feed `/attendances/portal`; server status/resource beda format. | **Tidak kompatibel** | Tidak ada request; field `title/type/date/venue` vs `judul_rapat/tipe_rapat/waktu_mulai/lokasi_ruang`; status object; `jenis_rapat` belum tentu pilihan enum mobile. | Buat adapter `AgendaResource`→view model, parsing ISO datetime dan `{value,label}`, query pagination/filter aktual. Konfirmasi pemetaan format vs jenis rapat. |
| Pembuatan/pengelolaan rapat | Create menulis local object (`Meeting`), tak ada update/delete/status/roles API. | POST/PUT/DELETE `/agendas`, PATCH status/roles; admin-only create dan policy untuk aksi lainnya. Conflict service, unit visibility dan field server enforced. | **Tidak kompatibel** | Field geofence, invited list/audience/latitude/longitude dan form mobile bukan kolom API; bentuk field tanggal/format berbeda; authorization role belum terhubung. | Mapping hanya field backend; gunakan user/unit IDs; tampilkan 403/409/422 sesuai respons. Requirement lokasi GPS/geofence dan invited audience **AMBIGUOUS** karena belum didukung API. |
| Presensi GPS, selfie, tanda tangan | Submit Attendance mengisi objek lokal berisi NIP, koordinat, jarak, selfie URI, SVG, status, token bukti; dianggap synced. | POST agenda attendance butuh selfie + signature sebagai Data URI/file; tidak ada koordinat; hasil minimal AttendanceResource. Eligibility dan status dicek server. | **Tidak kompatibel** | Tidak ada API; GPS tidak diterima; URI/SVG bukan payload yang dijamin diterima; `signatureSvg` bukan image data/file; mock menandai tersinkron. | Implementasi upload multipart atau Data URI yang valid, mengirim agenda ID dan token. Tanyakan requirement GPS/geofence sebelum mengubah backend; jangan mengklaim jarak sudah divalidasi server. |
| Riwayat presensi & receipt | `getAttendanceHistory(nip)` filter lokal; receipt dari AsyncStorage; UI memakai status/token dan meeting detail. | GET `/attendances/my-history` paginated; `AttendanceResource` tanpa receipt fields. Endpoint media protected. | **Parsial secara konsep; tidak kompatibel data** | Tidak ada endpoint receipt terpisah/token; history difilter dari identity server; media perlu Bearer. | Gunakan history endpoint, detail attendance yang ada sebagai receipt minimum. Receipt token/format tampilan dan status keterlambatan **AMBIGUOUS**; jangan mengarang nilai API. |
| Monitoring peserta/unit | `getUnitMembers` memakai `MOCK_UNIT_MEMBERS`; screen mengasumsikan status presensi per pegawai. | GET `/agendas/{agenda}/attendances` memberikan peserta aktual dan pagination bagi pemilik role; GET `/units` menyediakan unit. | **Tidak kompatibel** | Belum ada roster/endpoint status semua anggota per unit terlepas dari agenda; `statusPresensiTerakhir` tidak disediakan. | Ganti monitor ke agenda attendance list + unit metadata. Klarifikasi definisi “monitoring” (per agenda/riwayat terakhir) bila perlu backend baru. |
| Notulensi | UI layar Monitoring / data lokal belum menyimpan backend. | PUT `/agendas/{agenda}/notulen` dengan text, photos/captions dan optional report config; policy manageMinutes, sanitizer, file upload. | **Belum terintegrasi** | Tidak ada repository/request; request content-type/file metadata perlu dimapping; mock field tak didefinisikan dalam Meeting. | Gunakan multipart sesuai request validation, sinkronkan captions/index, parse `notulensi_html`/`kesimpulan_html`, gunakan endpoint hapus dokumentasi. |
| Direktori pegawai | CRUD local AsyncStorage; model employee punya role label, jabatan/golongan, last login. | `/users` CRUD paginated dan RBAC; `/units` CRUD/list. `UserResource` tidak memuat jabatan/golongan/last login; role object; unit adalah nested resource dan ID terpisah. | **Tidak kompatibel** | Tidak ada request; field/ID dan role values berbeda; current local roles berupa label Indonesia. Form update mobile parsial sedangkan backend update mengharuskan name/NIP/username/email/role/unit. | Adapter `UserResource`/`UnitResource`; gunakan stable numeric ID dan role `value`; sesuaikan payload lengkap dan tangani scope admin. Jabatan/pangkat data **AMBIGUOUS** karena backend Resource tidak mengeksposnya. |
| Audit log | `getAuditLogs()` mock/local dan mencatat event lokal pada presensi. | GET `/activity-logs` Administrator-wide; GET `/profile/logs` milik user; event dibuat server-side. | **Tidak kompatibel** | Log mobile palsu tidak ekuivalen audit trail immutable server; bentuk field berbeda; otorisasi admin. | Baca log server sesuai cakupan pengguna; jangan mengirim/menganggap log lokal sebagai audit sistem. |
| Dokumentasi rapat | Belum ada repository API; screen data lokal tidak menyediakan upload API. | `documentations[]` di AgendaResource, `file_url/caption/sort_order`; PUT notulen multipart dan DELETE item. | **Belum terintegrasi** | Tidak ada alur file dan kontrak URL protected/public perlu diuji; model type tidak punya documentation. | Tambah DTO dokumentasi serta upload/delete yang mengikuti route; tangani URL dan kegagalan upload parsial. |
| Offline sync | Queue lokal menghitung `!isSynced`; `syncOfflineQueue()` hanya mengubah flag menjadi true tanpa request. | Tidak ada endpoint queue/bulk sync. POST check-in online idempotent per agenda-user (duplikat mengembalikan data existing), namun media wajib ada. | **Tidak kompatibel / offline belum tersedia** | UI menyatakan menunggu sync, tetapi operasi tidak mengirim apapun dan bisa kehilangan data server. | Sampai ada aturan backend, queue hanya dapat retry POST normal ketika online dengan idempotency/duplicate handling; simpan attachment dan state error. Sinkronisasi offline saat agenda tidak ongoing/eligibility berubah **AMBIGUOUS**. |

### Aspek lintas-kontrak

- **HTTP/method/URL:** seluruh API path ada sebagai `/api/v1/...`; mobile tidak membuat request apa pun. Prefix `/api` ditambahkan framework pada `routes/api.php`.
- **snake_case vs camelCase:** backend Resource dan validation memakai snake_case; mobile entities memakai camelCase. Perlu adapter/DTO, jangan pakai cast TypeScript langsung pada JSON.
- **ID:** backend model IDs integer (JSON number), mobile semua ID string; parsing dan routing perlu konsisten.
- **Response:** JSON envelope dan resource; paginasi ada di `meta`, tidak boleh menganggap `data` selalu list tanpa metadata. Media/export berupa binary.
- **Authorization:** backend adalah otoritas; visibility agenda berbasis role/unit/eligibility, audit global khusus Administrator; screen hide/show bukan pengganti policy. Akun inactive ditolak saat login.
- **Presensi:** server hanya menyimpan waktu server, identity, media, IP/user-agent. GPS/selfie geolocation, tanda tangan svg, jarak, token receipt, status sah/terlambat bukan kontrak server.
- **Dokumentasi dan file agenda:** surat edaran memiliki object metadata dan URL `/storage/...`; presensi media memakai API streaming yang terautentikasi. Jangan menganggap URL keduanya memiliki aturan akses identik.
- **Error/pagination:** mobile belum memiliki parser untuk HTTP status, Laravel validation errors, 401/403/422, rate limit, dan `meta`.

## 5. Gap berdasarkan prioritas

### P0 — blocker sebelum aplikasi dapat menggunakan API

1. **Tidak ada lapisan jaringan:** endpoint backend nyata sama sekali tidak dipanggil; seluruh fitur tampil menggunakan data lokal/mock.
2. **Session security belum ada:** login tidak memverifikasi server, token Sanctum tidak disimpan/dikirim, logout hanya membersihkan storage lokal.
3. **Tipe/shape tidak selaras:** camelCase/string IDs dan model rekaan mobile vs snake_case/numeric IDs/resources backend.
4. **Presensi tidak terkirim dan offline queue palsu:** UI menandai synced tanpa server; data media/identity server tidak dipakai.

### P1 — fungsi utama akan gagal atau menampilkan data menyesatkan

5. Agenda create/list/status dan dashboard belum terhubung serta punya field/status berbeda.
6. Profil/password tidak memenuhi required fields dan aturan backend; token revoked setelah password change.
7. Direktori pegawai/unit belum terhubung, mapping role/unit tidak cocok dan update backend membutuhkan payload wajib.
8. History, monitoring dan receipt mengharapkan status/token/jumlah/field yang tidak dikembalikan backend.
9. Notulensi dan dokumentasi upload belum dipetakan ke multipart/API.
10. Tidak ada handler untuk paginasi, 401/403/422, throttle, atau offline network failure.

### P2 — requirement/API scope perlu keputusan

11. **AMBIGUOUS:** apakah GPS/geofence harus divalidasi server dan bagaimana sumber koordinat agenda.
12. **AMBIGUOUS:** apakah receipt membutuhkan kode verifikasi/status hadir yang dapat diverifikasi pihak lain; backend belum menyediakan.
13. **AMBIGUOUS:** apakah monitoring bermakna daftar hadir per agenda atau status presensi terakhir seluruh pegawai/unit.
14. **AMBIGUOUS:** asal dan kebutuhan jabatan/pangkat/golongan, target invited list dan attendance statistics yang hanya ada di model mobile.
15. **AMBIGUOUS:** kebijakan antrean offline ketika attendance window tutup sebelum sync; backend hanya mengizinkan agenda ongoing saat record baru.
16. File photo/mobile URI, binary download/export, dan URL surat edaran belum punya alur platform di client.

## 6. Rekomendasi dan urutan implementasi

1. Tetapkan kontrak DTO dari Resource aktual (User, Unit, Agenda, Attendance, ActivityLog), termasuk numeric ID, nullability, ISO date, enum role/status, pagination, error envelope. Tandai keputusan ambiguous sebelum mengubah API/business rule.
2. Bangun API client dan session Sanctum: base URL konfigurasi environment, JSON/multipart/binary, Bearer header, timeout/network errors, 401/403/422/throttle parser. Jangan mengubah mekanisme auth backend.
3. Implementasi login, bootstrap `/auth/me`, logout, profile/password dengan aturan server dan handling token revoke.
4. Integrasikan dashboard dan agenda list/detail lebih dulu; buat adapter resource ke view model, lalu create/update/status/roles sesuai policy dan validasi.
5. Integrasikan directory users/units beserta pagination, search, RBAC dan bentuk form payload wajib.
6. Implement presensi online dan attendance history: upload media, cek portal/eligibility, hasil duplicate, receipt minimum yang tersedia. Putuskan GPS/receipt tambahan terpisah sebelum mengklaim fitur tersebut.
7. Tambahkan monitoring per agenda, notulensi, dokumentasi, protected media dan ekspor mengikuti endpoint aktual.
8. Ganti audit lokal dengan server audit feed. Rancang retry/offline hanya setelah kebijakan antrean dan masa validasi disepakati; server belum memiliki bulk-sync endpoint.

## 7. File yang kemungkinan perlu diubah

### Mobile

- `src/data/repositories/AuthRepositoryImpl.ts` — login/session/profile/logout.
- `src/data/repositories/MeetingRepositoryImpl.ts` — agenda list/detail/create/status dan adapter.
- `src/data/repositories/AttendanceRepositoryImpl.ts` — check-in, history, audit; hapus asumsi fake sync.
- `src/data/repositories/EmployeeRepositoryImpl.ts` — users/units CRUD dan pagination.
- `src/domain/entities/types.ts`, `src/domain/repositories/interfaces.ts` — DTO/API types dan pemisahan dari view models.
- `src/presentation/store/useAuthStore.ts`, `useMeetingStore.ts`, `useAttendanceStore.ts`, `useEmployeeStore.ts` — loading/error/session/pagination lifecycle.
- `src/presentation/screens/LoginScreen.tsx`, `ProfileScreen.tsx`, `ChangePasswordScreen.tsx`, `DashboardScreen.tsx`, `AgendaScreen.tsx`, `CreateMeetingScreen.tsx`, `PresensiScreen.tsx`, `RiwayatScreen.tsx`, `ReceiptScreen.tsx`, `MonitoringScreen.tsx`, `AuditLogScreen.tsx`, `EmployeeDirectoryScreen.tsx`, `AddEmployeeScreen.tsx`, `EditEmployeeScreen.tsx` — payload/field rendering dan alur request.
- `src/data/datasources/mockData.ts` — hanya bila pemakaian mock untuk alur produksi hendak dihapus/dibatasi.
- File API client/config/storage baru di luar `src/app/` (lokasi belum ada; keputusan struktur implementasi nanti).

### Backend (hanya bila keputusan requirement meminta perubahan; audit ini tidak mengubahnya)

- `routes/api.php`, `app/Http/Controllers/Api/V1/*`, `app/Http/Requests/*`, `app/Http/Resources/*`, `app/Services/*`, policies/models/migrations, serta `tests/Feature/Api/V1/*` untuk perubahan kontrak yang disepakati. Jangan memperluas GPS, receipt, atau offline sync hanya berdasarkan model mobile.

## Dasar pemeriksaan source

Mobile: `src/data/repositories/*`, `src/data/datasources/mockData.ts`, `src/domain/entities/types.ts`, `src/domain/repositories/interfaces.ts`, `src/presentation/store/*`, screen/navigation, `package.json`. Backend: `routes/api.php`, `app/Http/Controllers/Api/V1/*`, `app/Http/Requests/*`, `app/Http/Resources/*`, `app/Models/*`, `app/Policies/*`, `app/Services/AttendanceService.php`, `config/sanctum.php`, migrations, serta `tests/Feature/Api/V1/*` termasuk `MobileClientWorkflowE2ETest.php`. Keberadaan test dipakai sebagai bukti dukung, sedangkan ketersediaan endpoint ditentukan dari route dan implementasi source.
