# PROPOSAL KONTRAK RESTful API SIPERAPAT
**Target Layanan:** SIPERAPAT Mobile Client (Android Expo / React Native)  
**Backend Host:** Laravel 11/12 (`C:\projects\meet-manager`)  
**Metode Autentikasi:** Laravel Sanctum Bearer Token (`Authorization: Bearer <token>`)  
**Status Dokumen:** Proposal Kontrak Desain Arsitektur (Menunggu Approval User)

---

## 1. STANDAR RESPONSE FORMAT & STRATEGI TRANSFORMASI

### 1.1 Format JSON Envelope Konsisten
Semua endpoint API akan mengembalikan struktur envelope standar berikut:

**Response Berhasil (200 / 201):**
```json
{
  "success": true,
  "message": "Deskripsi singkat hasil operasi kedinasan.",
  "data": { ... },
  "meta": {
    "timestamp": "2026-10-07T09:40:00+07:00",
    "pagination": {
      "current_page": 1,
      "per_page": 10,
      "total": 45,
      "last_page": 5
    }
  }
}
```

**Response Gagal / Validasi / Error (400 / 401 / 403 / 404 / 422 / 500):**
```json
{
  "success": false,
  "message": "Pesan error human-readable dalam bahasa Indonesia kedinasan.",
  "errors": {
    "field_name": [
      "Detail deskripsi kesalahan input."
    ]
  },
  "error_code": "ERR_SCHEDULE_CONFLICT"
}
```

### 1.2 Strategi Transformasi (snake_case vs camelCase)
- **Problem:** Laravel menggunakan konvensi `snake_case` di database dan Eloquent models (`judul_rapat`, `waktu_mulai`, `unit_id`), sedangkan TypeScript Mobile menggunakan `camelCase` (`meetingTitle`, `startTime`, `unitId`).
- **Rekomendasi Terbaik:** Gunakan **Laravel API Resource (`JsonResource`)**.
  - **Alasan:**
    1. Laravel Resource menjadi isolator (*boundary*) antara database schema dan API public contract. Perubahan kolom di database kelak tidak akan mematahkan aplikasi mobile yang sudah rilis di Play Store.
    2. Laravel Resource memetakan field langsung ke `camelCase` yang dibutuhkan oleh Mobile Frontend, sehingga store Zustand di mobile tidak perlu repot melakukan mapping manual.
    3. Mencegah kebocoran data sensitif (misal `password`, `remember_token`, hash internal).

---

## 2. DAFTAR LENGKAP ENDPOINT PROPOSAL

### 1. AUTHENTICATION

#### 1.1 Login Pengguna ASN
- **METHOD:** `POST`
- **PATH:** `/api/auth/login`
- **AUTH:** Guest (Tanpa Token)
- **ROLE:** Semua ASN terdaftar (`administrator`, `admin`, `staff`)
- **SCOPE:** Public Auth
- **REQUEST:**
```json
{
  "login": "197012051992032002",
  "password": "Password123!",
  "device_name": "Samsung SM-S928B (Android 15)"
}
```
- **RESPONSE (200 OK):**
```json
{
  "success": true,
  "message": "Autentikasi berhasil. Selamat datang di SIPERAPAT.",
  "data": {
    "token": "1|q6W8gHlK1xQ...",
    "user": {
      "id": 1,
      "nip": "197012051992032002",
      "name": "Dr. Ir. Hendra Prasetyo, M.T.",
      "username": "superadmin",
      "email": "admin.siperapat@lldikti.kemdikbud.go.id",
      "role": "administrator",
      "phone": "081234567890",
      "unit": null,
      "isActive": true
    }
  }
}
```
- **ERROR (422 / 429):**
  - `422 Unprocessable Content`: Kredensial tidak valid atau akun dinonaktifkan (`"Akun Anda berstatus non-aktif. Silakan hubungi Administrator."`).
  - `429 Too Many Requests`: Melebihi limit 5 kali percobaan gagal per IP/NIP.
- **BUSINESS RULE:** Mendukung input NIP (18 digit angka otomatis terdeteksi) maupun Username. Menggunakan sanitasi spasi. Merekam audit log `AUTH_LOGIN`.

---

#### 1.2 Logout Pengguna
- **METHOD:** `POST`
- **PATH:** `/api/auth/logout`
- **AUTH:** Bearer Token (`auth:sanctum`)
- **ROLE:** Authenticated User
- **SCOPE:** Current Device
- **REQUEST:** Empty body `{}`
- **RESPONSE (200 OK):**
```json
{
  "success": true,
  "message": "Anda telah berhasil keluar dari sesi sistem."
}
```
- **ERROR (401):**
  - `401 Unauthorized`: Token kedaluwarsa atau tidak valid.
- **BUSINESS RULE:** Menghapus token spesifik perangkat yang sedang digunakan (`$request->user()->currentAccessToken()->delete()`) tanpa memutus sesi di browser desktop. Merekam log `AUTH_LOGOUT`.

---

### 2. USER & PROFILE

#### 2.1 Ambil Data Profil Pengguna Login
- **METHOD:** `GET`
- **PATH:** `/api/user`
- **AUTH:** Bearer Token
- **ROLE:** Authenticated User
- **SCOPE:** Self
- **REQUEST:** None
- **RESPONSE (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nip": "197012051992032002",
    "name": "Dr. Ir. Hendra Prasetyo, M.T.",
    "username": "superadmin",
    "email": "admin.siperapat@lldikti.kemdikbud.go.id",
    "role": "administrator",
    "phone": "081234567890",
    "unitId": null,
    "unitName": "Pimpinan Lembaga",
    "isActive": true
  }
}
```
- **BUSINESS RULE:** Digunakan untuk *rehydrate* Zustand `useAuthStore` saat aplikasi mobile dibuka kembali.

---

#### 2.2 Perbarui Profil & Kata Sandi
- **METHOD:** `PUT`
- **PATH:** `/api/user/profile`
- **AUTH:** Bearer Token
- **ROLE:** Authenticated User
- **SCOPE:** Self
- **REQUEST:**
```json
{
  "name": "Dr. Ir. Hendra Prasetyo, M.T.",
  "email": "admin.siperapat@lldikti.kemdikbud.go.id",
  "phone": "081234567890",
  "password": "NewPassword123!",
  "password_confirmation": "NewPassword123!"
}
```
- **RESPONSE (200 OK):**
```json
{
  "success": true,
  "message": "Profil akun Anda berhasil diperbarui.",
  "data": { ... }
}
```
- **BUSINESS RULE:** NIP dan Username tidak boleh diubah sendiri oleh user (hanya Administrator). Transaksi DB dan audit log `UPDATE_PROFILE`.

---

#### 2.3 Riwayat Log Aktivitas Pribadi
- **METHOD:** `GET`
- **PATH:** `/api/user/activity-logs`
- **AUTH:** Bearer Token
- **ROLE:** Authenticated User
- **SCOPE:** Self (`where('user_id', $user->id)`)
- **REQUEST (Query Params):** `?page=1&type=RECORD_ATTENDANCE&search=Mutu`
- **RESPONSE (200 OK):** Paginated daftar log aktivitas milik pengguna sendiri.
- **BUSINESS RULE:** Staff hanya dapat melihat log miliknya, bukan audit log sistem global.

---

### 3. DASHBOARD

#### 3.1 Ringkasan Eksekutif & Agenda Aktif
- **METHOD:** `GET`
- **PATH:** `/api/dashboard`
- **AUTH:** Bearer Token
- **ROLE:** Semua Role
- **SCOPE:** Scoped by Role & Unit
- **REQUEST:** None
- **RESPONSE (200 OK):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalAgendas": 18,
      "ongoingAgendas": 1,
      "upcomingAgendas": 4,
      "completedAgendas": 13,
      "myAttendances": 11
    },
    "activeMeeting": {
      "id": 1,
      "title": "Rapat Koordinasi Evaluasi Pelaporan PDDikti",
      "slug": "rakor-evaluasi-pddikti-genap-2026",
      "type": "hybrid",
      "venue": "Ruang Sidang Utama Lantai 2",
      "startTime": "2026-10-07T09:00:00+07:00",
      "endTime": "2026-10-07T12:00:00+07:00",
      "status": "ongoing",
      "isAttended": false
    },
    "upcomingMeetings": [ ... ]
  }
}
```
- **BUSINESS RULE:** Diambil dari logika `DashboardController::index`, memprioritaskan rapat `ongoing` lalu rapat `upcoming` hari ini. Menghitung flag `isAttended` spesifik untuk pegawai yang sedang login.

---

### 4. UNITS (UNIT KERJA)

#### 4.1 Daftar Unit Kerja
- **METHOD:** `GET`
- **PATH:** `/api/units`
- **AUTH:** Bearer Token
- **ROLE:** Semua ASN (Read-Only)
- **SCOPE:** Active Units (`is_active = true`)
- **REQUEST (Query Params):** `?search=Akademik`
- **RESPONSE (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "kodeUnit": "POKJA-AKM",
      "namaUnit": "Pokja Akademik & Kemahasiswaan",
      "deskripsi": "Pelayanan dan pembinaan kurikulum...",
      "isActive": true
    }
  ]
}
```
- **BUSINESS RULE:** Digunakan untuk opsi dropdown saat membuat rapat atau menyaring direktori pegawai.

---

### 5. EMPLOYEES (DIREKTORI PEGAWAI)

#### 5.1 Direktori Pegawai ASN Kedinasan
- **METHOD:** `GET`
- **PATH:** `/api/employees`
- **AUTH:** Bearer Token
- **ROLE:** Semua ASN (Staf, Admin Unit, Administrator)
- **SCOPE:** Read-Only Public Directory
- **REQUEST (Query Params):** `?unitId=2&search=Rizky&page=1`
- **RESPONSE (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "nip": "199402142020121004",
      "name": "Rizky Fauzi, S.T.",
      "unitId": 2,
      "unitName": "Pokja Akademik & Kemahasiswaan",
      "email": "rizky.fauzi@lldikti.kemdikbud.go.id",
      "phone": "081234567893",
      "avatarUrl": null,
      "lastAttendanceStatus": "Hadir"
    }
  ]
}
```
- **BUSINESS RULE:** Endpoint khusus untuk memfasilitasi `EmployeeDirectoryScreen` di mobile tanpa melanggar `UserPolicy::viewAny` (yang membatasi akses edit kredensial hanya untuk Admin). Field rahasia seperti `password`, `remember_token`, dan log IP **TIDAK DI-EKSPOS**.

---

### 6. AGENDAS (AGENDA RAPAT KEDINASAN)

#### 6.1 Daftar Agenda Rapat
- **METHOD:** `GET`
- **PATH:** `/api/agendas`
- **AUTH:** Bearer Token
- **ROLE:** Semua Role
- **SCOPE:** Scoped via `Agenda::visibleTo($user)`
- **REQUEST (Query Params):** `?status=ongoing&tipe=offline&search=mutu&page=1`
- **RESPONSE (200 OK):** Daftar agenda rapat terpaginasi lengkap dengan status, pimpinan, notulis, dan unit yang diundang.
- **BUSINESS RULE:** Role `staff` tidak dapat melihat rapat bertipe `draft` atau `cancelled`. Admin Unit hanya melihat rapat yang melibatkan unitnya atau rapat Pleno.

---

#### 6.2 Buat Agenda Rapat Baru
- **METHOD:** `POST`
- **PATH:** `/api/agendas`
- **AUTH:** Bearer Token
- **ROLE:** `administrator`, `admin`
- **SCOPE:** Unit Penyelenggara
- **REQUEST (Multipart/Form-Data):**
```
judul_rapat: "Rapat Koordinasi Penjaminan Mutu PTS 2026"
jenis_rapat: "koordinasi"
tipe_rapat: "hybrid"
lokasi_ruang: "Ruang Sidang Utama Lantai 2"
link_meeting: "https://zoom.us/j/9823481239"
waktu_mulai: "2026-10-24 09:00:00"
waktu_selesai: "2026-10-24 12:00:00"
is_all_units: 0
unit_ids[0]: 2
unit_ids[1]: 5
pimpinan_id: 1
notulis_id: 4
status: "scheduled"
surat_edaran: (binary PDF/JPG, max 5MB)
```
- **RESPONSE (201 Created):** Detail agenda baru yang berhasil dibuat beserta slug uniknya.
- **ERROR (422 Unprocessable Content):**
  - Memicu 5 validasi `AgendaConflictService`:
    1. Error waktu lampau: *"Waktu mulai rapat terjadwal tidak boleh di masa lampau."*
    2. Error bentrok ruangan: *"Ruang rapat 'Ruang Sidang Utama' telah digunakan oleh agenda '...' pada jam 09:00 - 11:00 WIB."*
    3. Error bentrok pimpinan/notulis: *"Pegawai '...' telah ditugaskan sebagai Pemimpin Rapat pada agenda lain."*
    4. Error rapat pleno bentrok di jam sama.
- **BUSINESS RULE:** Dibungkus dalam `DB::transaction`. Admin Unit otomatis menyematkan unitnya sendiri. Merekam log `CREATE_AGENDA`.

---

#### 6.3 Detail Agenda Rapat
- **METHOD:** `GET`
- **PATH:** `/api/agendas/{agenda}`
- **AUTH:** Bearer Token
- **ROLE:** Semua Role (Jika eligible)
- **SCOPE:** `can:viewStaff,agenda`
- **RESPONSE (200 OK):** Detail lengkap agenda, termasuk link Zoom, URL surat edaran, daftar unit sasaran, pimpinan, notulis, dan ringkasan kuota kehadiran.

---

#### 6.4 Perbarui Informasi Agenda
- **METHOD:** `PUT` / `POST` (Multipart untuk file replacement)
- **PATH:** `/api/agendas/{agenda}`
- **AUTH:** Bearer Token
- **ROLE:** `administrator`, `admin` (Pembuat / Rekan se-unit)
- **SCOPE:** Agenda Terkait
- **BUSINESS RULE:** Menjalankan pengecekan bentrok jadwal dengan mengecualikan ID rapat saat ini. Merekam log `UPDATE_AGENDA`.

---

#### 6.5 Hapus Agenda
- **METHOD:** `DELETE`
- **PATH:** `/api/agendas/{agenda}`
- **AUTH:** Bearer Token
- **ROLE:** `administrator`, `admin`
- **SCOPE:** Agenda Terkait
- **RESPONSE (200 OK):**
```json
{
  "success": true,
  "message": "Agenda rapat berhasil dihapus."
}
```
- **ERROR (422 Unprocessable Content):**
  - Jika agenda memiliki catatan presensi: *"Agenda rapat telah memiliki catatan presensi kehadiran pegawai. Agenda tidak dapat dihapus demi integritas arsip kegiatan. Ubah status menjadi 'Dibatalkan'."*
- **BUSINESS RULE:** Menghapus seluruh berkas fisik terkait (surat edaran, dokumentasi) dari disk storage. Merekam log `DELETE_AGENDA`.

---

#### 6.6 Aksi Bisnis Perubahan Status Agenda
- **Membuka Rapat / Presensi:** `POST /api/agendas/{agenda}/start` &rarr; Mengubah status menjadi `ongoing`.
- **Menutup Rapat / Presensi:** `POST /api/agendas/{agenda}/close` &rarr; Mengubah status menjadi `completed`.
- **Membatalkan Rapat:** `POST /api/agendas/{agenda}/cancel` &rarr; Mengubah status menjadi `cancelled`.
- **AUTH & ROLE:** `administrator`, `admin` pemilik/penyelenggara rapat.
- **BUSINESS RULE:** Transaksi DB, mencatat audit log `UPDATE_AGENDA_STATUS`.

---

#### 6.7 Delegasi Peran Pimpinan & Notulis Dinamis
- **METHOD:** `PATCH`
- **PATH:** `/api/agendas/{agenda}/roles`
- **AUTH:** Bearer Token
- **ROLE:** `administrator`, `admin`
- **REQUEST:**
```json
{
  "pimpinan_id": 1,
  "notulis_id": 4
}
```
- **BUSINESS RULE:** Memperbarui penugasan secara real-time dan menyinkronkan penandatangan default pada Berita Acara Rapat. Merekam log `UPDATE_AGENDA_ROLES`.

---

### 7. ATTENDANCE (PRESENSI KEHADIRAN RAPAT)

#### 7.1 Submit Presensi Kehadiran
- **METHOD:** `POST`
- **PATH:** `/api/agendas/{agenda}/attendances`
- **AUTH:** Bearer Token
- **ROLE:** Pegawai ASN yang diundang (`can:checkIn,agenda`)
- **SCOPE:** Unit Eligible
- **REQUEST (Multipart/Form-Data ATAU JSON Base64 Data URI):**
```json
{
  "selfie_data": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "signature_data": "data:image/png;base64,iVBORw0KGgo...",
  "latitude": -0.92348,
  "longitude": 100.36214,
  "device_info": "Samsung Galaxy S24 (Android 15)"
}
```
- **RESPONSE (201 Created):**
```json
{
  "success": true,
  "message": "Presensi kehadiran rapat Anda berhasil diverifikasi dan dicatat.",
  "data": {
    "attendanceId": 142,
    "agendaId": 1,
    "agendaTitle": "Rapat Koordinasi Evaluasi Pelaporan PDDikti",
    "signedAt": "2026-10-07T09:14:22+07:00",
    "selfieUrl": "http://localhost:8000/storage/attendances/1/selfies/selfie_4_a7b8c9.jpg",
    "signatureUrl": "http://localhost:8000/storage/attendances/1/signatures/sig_4_x1y2z3.png",
    "verificationToken": "LLD10-PRES-2026-8941",
    "isSynced": true
  }
}
```
- **ERROR (403 / 422):**
  - `403 Forbidden`: Jika status agenda bukan `ongoing` (*"Sesi presensi untuk agenda rapat ini tidak sedang dibuka."*), atau unit pegawai tidak diundang.
  - `422 Unprocessable Content`: Jika berkas selfie/tanda tangan tidak valid atau melebihi kuota ukuran (selfie max 1MB, signature max 512KB).
  - Jika terjadi tabrakan ganda (*duplicate submission*), sistem menangkap `QueryException` SQLSTATE 23000 dan mengembalikan data presensi yang sudah ada secara ramah (*graceful*).
- **BUSINESS RULE:** Transaksi DB, menyimpan berkas fisik ke disk `public`, mencatat IP dan user agent perangkat, merekam log `RECORD_ATTENDANCE`.

---

#### 7.2 Detail & Tanda Terima Presensi (Receipt)
- **METHOD:** `GET`
- **PATH:** `/api/agendas/{agenda}/attendances/{attendance}`
- **AUTH:** Bearer Token
- **ROLE:** Pemilik presensi, Admin Unit terkait, Administrator
- **SCOPE:** `can:view,attendance`
- **RESPONSE (200 OK):** Detail lengkap untuk merender komponen tiket bukti kehadiran (*Perforated Ticket*).

---

#### 7.3 Riwayat Presensi Pegawai
- **METHOD:** `GET`
- **PATH:** `/api/attendances/history`
- **AUTH:** Bearer Token
- **ROLE:** Semua ASN
- **SCOPE:** Self (`where('user_id', $user->id)`)
- **REQUEST (Query Params):** `?search=Evaluasi&page=1`
- **RESPONSE (200 OK):** Daftar riwayat kehadiran terpaginasi milik pegawai yang sedang login.

---

### 8. DOCUMENTATION (FOTO DOKUMENTASI)

#### 8.1 Unggah Foto Dokumentasi Kegiatan
- **METHOD:** `POST`
- **PATH:** `/api/agendas/{agenda}/documentations`
- **AUTH:** Bearer Token
- **ROLE:** `administrator`, `admin`, atau Pimpinan/Notulis ditunjuk saat status `ongoing`
- **REQUEST (Multipart/Form-Data):**
```
photos[0]: (binary JPG/PNG, max 3MB)
captions[0]: "Suasana pembukaan rapat oleh Pimpinan"
```
- **RESPONSE (201 Created):** Daftar objek dokumentasi yang tersimpan beserta URL gambarnya.
- **BUSINESS RULE:** Maksimal 10 foto per upload, disimpan di `public/documentations/{agenda_id}/`.

---

#### 8.2 Hapus Foto Dokumentasi
- **METHOD:** `DELETE`
- **PATH:** `/api/agendas/{agenda}/documentations/{documentation}`
- **AUTH:** Bearer Token
- **ROLE:** Authorized Documentation Manager
- **BUSINESS RULE:** Menghapus file fisik dari storage dan mencatat audit log `DELETE_AGENDA_DOCUMENTATION`.

---

### 9. MONITORING (MONITORING PESERTA RAPAT)

#### 9.1 Data Monitoring Kehadiran Rapat Real-Time
- **METHOD:** `GET`
- **PATH:** `/api/agendas/{agenda}/monitoring`
- **AUTH:** Bearer Token
- **ROLE:** `administrator`, `admin`
- **SCOPE:** Authorized Unit
- **RESPONSE (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalInvited": 45,
    "totalAttended": 38,
    "verifiedAttendees": [
      {
        "id": 142,
        "name": "Afdalisma, SH, M.Pd",
        "nip": "197012051992032002",
        "unitName": "Pimpinan Lembaga",
        "signedAt": "2026-10-07T09:14:00+07:00",
        "selfieUrl": "...",
        "signatureUrl": "..."
      }
    ],
    "unverifiedAttendees": [
      {
        "id": 6,
        "name": "Ahmad Syukron, A.Md.",
        "nip": "199806102023051006",
        "unitName": "Bagian Tata Usaha & Umum"
      }
    ]
  }
}
```
- **BUSINESS RULE:** Menghitung peserta hadir dan peserta belum hadir (*unverified*) dari selisih anggota unit yang diundang dengan data tabel `attendances`.

---

### 10. MINUTES / NOTULENSI

#### 10.1 Ambil Notulensi & Risalah Rapat
- **METHOD:** `GET`
- **PATH:** `/api/agendas/{agenda}/minutes`
- **AUTH:** Bearer Token
- **ROLE:** Semua yang berhak melihat rapat
- **RESPONSE (200 OK):** Teks kaya notulensi, kesimpulan, daftar penandatangan, dan foto dokumentasi.

---

#### 10.2 Simpan Notulensi & Kesimpulan
- **METHOD:** `PUT`
- **PATH:** `/api/agendas/{agenda}/minutes`
- **AUTH:** Bearer Token
- **ROLE:** `administrator`, `admin`, atau Pimpinan/Notulis ditunjuk saat status `ongoing`
- **SCOPE:** `can:manageMinutes,agenda`
- **REQUEST:**
```json
{
  "notulensi": "<p>Rapat dibuka pukul 09.00 WIB oleh Pimpinan Rapat...</p>",
  "kesimpulan": "<p>1. Seluruh PTS wajib memperbarui data PDDIKTI sebelum akhir bulan.</p>"
}
```
- **BUSINESS RULE:** Menjalankan sanitasi HTML ketat (pembersihan `<script>`, `<iframe>`, inline JavaScript event). Ditolak jika status agenda `cancelled`. Merekam log `UPDATE_AGENDA_MINUTES`.

---

### 11. REPORTS & EXPORTS

#### 11.1 Ringkasan Eksekutif & Statistik Laporan
- **METHOD:** `GET`
- **PATH:** `/api/reports/recap`
- **AUTH:** Bearer Token
- **ROLE:** `administrator`, `admin`
- **REQUEST (Query Params):** `?startDate=2026-01-01&endDate=2026-12-31&unitId=2`
- **RESPONSE (200 OK):** Statistik persentase kehadiran per unit kerja, total rapat terlaksana, dan rata-rata partisipasi.

---

#### 11.2 Ekspor Berita Acara & Daftar Hadir (PDF / Word)
- **METHOD:** `GET`
- **PATH:** `/api/agendas/{agenda}/export/pdf` dan `/api/agendas/{agenda}/export/word`
- **AUTH:** Bearer Token
- **ROLE:** `administrator`, `admin` terkait
- **RESPONSE:** Binary Stream Berkas Dokumen Resmi (`application/pdf` atau `application/msword`).

---

### 12. AUDIT LOGS

#### 12.1 Log Audit Keamanan Sistem Global
- **METHOD:** `GET`
- **PATH:** `/api/audit-logs`
- **AUTH:** Bearer Token
- **ROLE:** `administrator` (Superadmin Only)
- **SCOPE:** `can:viewAny,App\Models\ActivityLog`
- **REQUEST (Query Params):** `?type=RECORD_ATTENDANCE&userId=4&page=1`
- **RESPONSE (200 OK):** Riwayat lengkap aktivitas sistem, target model, properti payload, alamat IP, dan user-agent perangkat.
- **ERROR (403):** Jika diakses oleh role `admin` atau `staff`.
