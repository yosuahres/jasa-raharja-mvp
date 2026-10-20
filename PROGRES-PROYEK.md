# Progres Proyek — Sistem Rujukan Rumah Sakit Jasa Raharja

> Ringkasan progres untuk presentasi ke supervisor · Oktober 2026

---

## 1. Ringkasan Singkat

Sistem ini membantu petugas Jasa Raharja **memilih rumah sakit rujukan untuk korban kecelakaan lalu lintas**, berdasarkan **dokumen tarif resmi** rumah sakit (Perda, Pergub, atau buku tarif rekanan dalam bentuk PDF).

Sistem punya dua bagian:

| Bagian | Fungsinya |
|---|---|
| **Extractor** (Python) | Membaca PDF dokumen tarif dan mengubahnya menjadi data terstruktur: profil RS, semua baris tarif beserta harganya, kategori layanan, fasilitas, dan dokter spesialis. |
| **Dashboard** (web) | Tempat petugas mengunggah dokumen, memeriksa hasil bacaan, lalu **mencari rujukan berdasarkan kasus kecelakaan**, melihat peringkat RS, membandingkan RS, dan melihat peta. |

**Prinsip utama:** semua data berasal dari dokumen yang diunggah. Tidak ada input manual atau data karangan. Kalau suatu informasi tidak tercetak di dokumen, sistem membiarkannya kosong dan tidak menebak.

---

## 2. Masalah yang Diselesaikan

- Tarif RS tersebar di dokumen PDF yang panjang dan formatnya berbeda-beda. Satu Pergub bisa hampir **3.000 halaman** dan memuat banyak RS sekaligus.
- Tindakan yang sama ditulis dengan cara berbeda di tiap RS, misalnya *"Necrotomi"*, *"NECROTOMY"*, dan *"Nekrotomi"*, sehingga sulit dibandingkan.
- Petugas perlu cepat tahu: **untuk kasus ini, di kota ini, RS mana yang sanggup menangani dan harganya wajar?**

---

## 3. Gambaran Arsitektur

```
 Petugas
   │  (1) unggah PDF
   ▼
┌──────────────────────┐   (2) simpan file     ┌──────────────────────────┐
│  Dashboard (Next.js) │ ────────────────────▶ │  Supabase                │
│  - Input Data        │   (3) "bangunkan"     │  - Login petugas         │
│  - Cari Rujukan      │ ──────────┐           │  - Database (Postgres)   │
│  - Rumah Sakit       │           │           │  - Penyimpanan file PDF  │
│  - Bandingkan        │ ◀──────── │ ───────── │                          │
│  - Peta              │  (6) tampil hasil     └──────────────────────────┘
└──────────────────────┘           │                 ▲          │
                                   ▼                 │ (5) tulis │ (4) ambil
                          ┌──────────────────────┐   │   hasil   │   antrean
                          │  Extractor (Python)  │ ──┘           │   + PDF
                          │  worker di VPS       │ ◀─────────────┘
                          └──────────────────────┘
```

- **Dashboard:** Next.js 16, Tailwind, shadcn/ui.
- **Database, login, dan penyimpanan file:** Supabase.
- **Extractor:** Python dengan library `pymupdf`. **Tidak memakai AI/LLM atau API berbayar**, semuanya aturan yang bisa ditelusuri.
- **Deploy:** Docker di VPS. Setiap push ke `main` otomatis menjalankan tes, membangun image, lalu memperbaruinya di server.

---

## 4. Extractor: Apa yang Diekstrak dan Bagaimana

### 4.1 Input

Satu file PDF dokumen tarif (maks. 50 MB). Bentuk yang sudah diuji:

| Dokumen sampel | Jenis | Hasil uji |
|---|---|---|
| Buku Tarif Rekanan **RS Ubaya** 2025 | Buku tarif milik RS sendiri | ±446 baris tarif |
| Perda No. 1/2025 Tarif **RSUD dr. Iskak** Tulungagung | Peraturan daerah, satu RS | ±796 baris tarif |
| Pergub Jatim, Tarif **RSUD dr. Soedono** Madiun | Peraturan berisi banyak RS (±2.954 halaman) | ±4.483 baris tarif, sekitar 2 menit |

*(Angka dari uji coba extractor pada sampel. Bisa sedikit berbeda setelah aturan diperbarui.)*

### 4.2 Data yang Diekstrak

**A. Profil rumah sakit.** Setiap nilai disertai sumbernya (dibaca dari bagian mana dokumen):

| Data | Dibaca dari |
|---|---|
| Nama RS | Judul bagian di dokumen, atau nama file |
| Kota/kabupaten dan provinsi | Nama RS, nama file, judul bagian, halaman depan |
| Tahun berlaku | "TAHUN 2025" di judul/nama file |
| Alamat | Halaman depan ("Jl. …") |
| Kepemilikan | Pemerintah / Swasta / BUMN / TNI-Polri, dari kata kunci (RSUD, Perda, Bhayangkara, Yayasan, dll.) |
| Status rekanan | Kata "Rekanan" di dokumen |

**B. Semua baris tarif.** Tidak ada baris yang dibuang. Tiap baris menyimpan:

| Field | Contoh |
|---|---|
| Nama tindakan/layanan (persis seperti tercetak) | `VISUM PERKOSAAN` |
| Halaman | 1041 |
| Judul bagian (hierarki) | `I. RAWAT DARURAT` |
| Induk daftar | `Rawat Inap Kelas III › a. Kamar` |
| Satuan | `/tindakan`, `/kunjungan` |
| **Harga per kolom kelas** | `TARIF BARU / EKSEKUTIF`, `KELAS PERAWATAN / VIP`, `NON. PAV` / `PAV` |
| Tarif lama vs baru | Harga di kolom "TARIF LAMA" ditandai *lama* dan tidak dipakai di perhitungan |
| Anggota kelompok | Daftar tindakan tanpa harga di bawah satu harga kelompok, misalnya isi "Kelompok Bedah F" |

**C. Kategori layanan.** Setiap baris dimasukkan ke satu dari 11 kategori, berdasarkan nama baris lalu judul bagian di atasnya:

> Tindakan operatif · Tindakan non-operatif · Gawat darurat (IGD) · Kamar & rawat inap · Konsultasi & visite · Laboratorium · Radiologi · Rehabilitasi medik · Obat & BHP · Administrasi · Lainnya

**D. Fasilitas dan dokter spesialis yang terdeteksi.** Dikenali dari baris tarif, beserta bukti (halaman dan teks yang cocok):

- **11 fasilitas:** IGD, Ambulans, Kamar Operasi, C-Arm, ICU, HCU, Rontgen, CT Scan, MRI, Laboratorium, Bank Darah
- **7 spesialisasi:** Ortopedi & Traumatologi, Bedah Saraf, Bedah Umum, Anestesiologi, Neurologi, Radiologi, Kedokteran Emergensi

*(Jumlah unit dan jam operasional tidak tercetak di dokumen tarif, jadi dibiarkan kosong.)*

**E. Nama tindakan yang diseragamkan (kunci pencocokan).** Agar tindakan yang sama bisa dibandingkan antar-RS, setiap tindakan diberi "kunci":
- ejaan Inggris/Latin diubah ke ejaan Indonesia (*Necrotomy* → *Nekrotomi*, *Catheter* → *Kateter*)
- kata pengisi, kode ICD-9, dan urutan kata diabaikan
- ukuran/tingkat/anestesi (*kecil, sedang, besar, GA, lokal*) dianggap **varian** dari tindakan yang sama

Contoh: *"Pasang Catheter"* dan *"PEMASANGAN KATETER"* menghasilkan kunci yang sama, yaitu `KATETER PASANG`.

### 4.3 Alur Kerja Extractor

```
PDF masuk antrean
   │
   ├─ 1. Pindai cepat: RS apa saja yang ada di dokumen ini?
   │     → pilih RS yang disebut di nama file, kalau tidak ada pilih yang halamannya paling banyak
   │
   ├─ 2. Baca tabel bergaris per halaman (hanya bagian RS yang dipilih)
   │     → rekonstruksi judul kolom, nomor/huruf daftar, baris yang terpotong antar halaman
   │     → laporkan progres halaman ke dashboard
   │
   ├─ 3. Ubah harga ke angka rupiah ("1.250.000", "76,000", "1,5jt")
   │
   ├─ 4. Kategorikan tiap baris dan buat kunci tindakan
   │
   ├─ 5. Baca profil RS, deteksi fasilitas dan spesialis
   │
   └─ 6. Simpan ke database → status "review" (menunggu diperiksa petugas)
```

### 4.4 Kontrol Kualitas: Tidak Menebak

Baris yang meragukan **ditandai** untuk dicek manusia:
- harga yang bukan angka biasa (teks, salah ketik, `0`)
- nama yang tersambung melewati batas halaman
- tabel tanpa baris judul kolom
- **halaman hasil scan** (tanpa lapisan teks) dicatat dan tidak dibaca

Dashboard menampilkan berapa baris yang "kurang jelas di PDF" untuk setiap RS.

### 4.5 Keandalan Operasional

- Dashboard **langsung membangunkan** extractor saat ada unggahan. Kalau gagal tersambung, extractor tetap mengecek antrean setiap 60 detik.
- Jika server restart di tengah proses, dokumen otomatis masuk antrean lagi.
- Unggahan yang dibatalkan dari dashboard langsung menghentikan proses.
- **39 tes otomatis** pada extractor, termasuk uji terhadap ketiga dokumen sampel.

---

## 5. Dashboard: Menu dan Alur

Menu di sidebar:

```
Rujukan
  ├─ Cari Rujukan        ← halaman utama
  ├─ Rumah Sakit
  └─ Peta Rumah Sakit
Entri
  └─ Input Data
```

Semua halaman memerlukan login petugas (daftar dan masuk lewat email).

### 5.1 Input Data: Unggah Dokumen Tarif

Tiga langkah, tanpa mengetik apa pun:

```
① Unggah  ──▶  ② Baca dokumen  ──▶  ③ Periksa & simpan
```

1. **Unggah:** seret PDF ke kotak unggah. File besar dikirim bertahap dan bisa dilanjutkan jika koneksi putus. Unggahan lama yang belum disimpan bisa dibuka lagi.
2. **Baca dokumen:** progres halaman tampil secara langsung (mis. 1.200 / 2.954 halaman). Jika gagal, alasannya ditampilkan dan bisa **dicoba lagi**.
3. **Periksa & simpan:** pratinjau menampilkan:
   - profil RS **beserta sumbernya** (mis. *Kota: "KABUPATEN TULUNGAGUNG" di halaman depan*)
   - jika dokumen memuat banyak RS: daftar RS lain yang bisa **dipilih untuk dibaca ulang**
   - semua baris tarif, dikelompokkan per kategori
   - fasilitas dan spesialis yang terdeteksi, beserta buktinya
   - jumlah baris yang perlu dicek dan halaman hasil scan

   Klik **Simpan** untuk membuat RS baru, atau memperbarui RS dengan nama yang sama, lalu menerbitkan tarifnya. Lokasi RS di peta dicari otomatis setelah disimpan.

### 5.2 Cari Rujukan (Halaman Utama)

**Input:** pilih **kasus kecelakaan** + **lokasi (kota)**.

Kasus yang tersedia saat ini (14):
> Cedera kepala berat · Cedera tulang belakang · Trauma dada · Trauma perut · Patah tulang paha · Patah tulang lengan · Patah tulang panggul · Patah tulang terbuka · Dislokasi sendi panggul · Patah tulang wajah dan rahang · Luka robek di wajah · Luka robek ringan · Cedera tendon tangan · Luka bakar

Setiap kasus dipecah menjadi tahapan perawatan beserta tindakannya, misalnya **Cedera kepala berat**:

| Tahap | Contoh tindakan |
|---|---|
| Gawat darurat | Intubasi endotrakeal, pasang infus, pasang kateter |
| Operasi | Kraniotomi (trepanasi), evakuasi EDH |
| Perawatan lanjutan | Trakeostomi, perawatan trakeostomi, pasang NGT |

**Output:** daftar RS di kota tersebut, diurutkan dari yang paling direkomendasikan. Setiap kartu RS menampilkan:
- tipe RS (A–D) dan peringkatnya
- berapa tahap kasus yang bisa ditangani
- daftar tindakan dan **harganya per tahap** (bisa dibuka/tutup)

**Alat bantu:**
- **Filter:** tier hasil, harga (≤ median / ≤ 1,2× median), hanya mitra PKS, hanya data tarif yang masih berlaku, hanya yang menangani semua tahap
- **Urutkan:** Rekomendasi · Terlengkap · Termurah
- **Telusuri per tindakan:** klik satu tindakan untuk melihat semua RS yang punya tindakan itu, harganya dibandingkan dengan **median pasar** (murah / wajar / mahal)
- **Bandingkan 3 teratas:** langsung ke halaman perbandingan

### 5.3 Rumah Sakit: Daftar dan Detail

**Daftar:** tabel semua RS, diurutkan berdasarkan peringkat. Kolomnya: nama, kota, kepemilikan, mitra PKS, **Tipe A–D**, penilaian **Harga** (murah/wajar/mahal), penilaian **Layanan** (lengkap/cukup/terbatas), dan status data tarif (berlaku/kedaluwarsa/belum ada). Tabel bisa dicari, difilter, diurutkan, dan diatur kolomnya. Beberapa RS bisa dipilih untuk dibandingkan.

**Detail RS:**
- **Panel profil:** tipe, penilaian harga dan layanan beserta alasannya, RS pembanding terdekat, dan **kelengkapan data** (tarif berlaku? baris terbaca jelas? semua jenis layanan ada?)
- **Tab Overview:** gambaran data RS
- **Tab Tarif:** semua baris tarif, bisa difilter per kategori dan dicari per nama
- **Tab Fasilitas** dan **Tab Tenaga Medis:** ada atau tidak

### 5.4 Bandingkan

Membandingkan 2–3 RS berdampingan. Bisa ditambahkan pencarian tindakan (mis. "kraniotomi"):
- tarif tindakan tersebut di tiap RS + penilaian terhadap median, beserta baris dan halaman asalnya di dokumen
- penilaian Harga dan Layanan
- profil (kepemilikan, kota, mitra PKS)
- fasilitas dan tenaga medis (✓ / ✗)
- versi dan masa berlaku data tarif
- nilai terbaik di tiap baris diberi tanda ✓ hijau

### 5.5 Peta Rumah Sakit

Peta lokasi semua RS, bisa difilter per **kota** dan **tipe**. Koordinat dicari dari nama dan alamat RS lewat OpenStreetMap. RS yang belum ketemu lokasinya ditampilkan dalam daftar terpisah.

---

## 6. Cara Sistem Menilai Rumah Sakit

Semua penilaian bersifat **relatif**: RS dibandingkan satu sama lain, bukan diukur terhadap standar baku.

### 6.1 Penilaian Harga (Murah / Wajar / Mahal)

1. Ambil baris tarif yang namanya sama di dokumen ≥ 2 RS.
2. Hitung median harganya di seluruh RS.
3. **Indeks harga RS** = rata-rata (harga RS ÷ median). Contoh: 0,92 berarti 8% lebih murah dari RS lain.
4. RS dibagi tiga kelompok: sepertiga termurah **murah**, tengah **wajar**, termahal **mahal**.

### 6.2 Penilaian Layanan (Lengkap / Cukup / Terbatas)

| Komponen | Bobot | Diukur dari |
|---|---|---|
| Klinis | 30% | Spesialis yang terdeteksi (dari 7) |
| Fasilitas | 25% | Fasilitas yang terdeteksi (dari 11) |
| Jenis layanan | 25% | Kategori layanan yang punya tarif (dari 8) |
| Akses darurat | 20% | Ada IGD (50) + ada ambulans (50) |

### 6.3 Tipe RS (A–D)

Gabungan peringkat Harga dan Layanan (bobot sama), lalu dibagi empat: **seperempat teratas = Tipe A**, berikutnya B, C, D.

> Tipe ini adalah **hasil peringkat sistem**, bukan klasifikasi resmi Kemenkes.

### 6.4 Peringkat untuk Kasus Kecelakaan

| Faktor | Bobot |
|---|---|
| Cakupan kasus: berapa tahap yang bisa ditangani (70%) + ragam tindakan (30%) | 45% |
| Skor umum RS (Harga + Layanan) | 35% |
| Akses darurat (IGD, ambulans) | 8% |

RS yang mampu menangani **tahap operasi** diutamakan dibanding RS yang hanya punya banyak tindakan kecil.

---

## 7. Infrastruktur dan Deploy

- **Server:** VPS (Docker), di belakang reverse proxy Traefik dengan HTTPS, proteksi CrowdSec, dan rate limiting.
- **Alamat:** `jasaraharja.majorsaleshub.com`
- **CI/CD:** setiap push ke `main` menjalankan tes extractor dan lint dashboard, membangun image Docker, lalu server otomatis memperbarui dalam ±30 detik.
- **Keamanan data:** hanya petugas yang login yang bisa membaca dan mengubah data. File PDF disimpan di bucket privat.

---

## 8. Status Progres

### ✅ Sudah Selesai

- [x] Extractor PDF untuk 3 bentuk dokumen (buku tarif RS, Perda, Pergub berisi banyak RS)
- [x] Ekstraksi profil RS, semua baris tarif, harga per kelas, tarif lama vs baru
- [x] Kategorisasi otomatis ke 11 jenis layanan
- [x] Penyeragaman nama tindakan antar-RS (ejaan, varian, kode ICD-9)
- [x] Deteksi fasilitas dan spesialis beserta bukti
- [x] Penandaan baris meragukan dan halaman scan
- [x] Alur unggah 3 langkah dengan progres langsung, coba ulang, batal, dan pilih RS lain dari dokumen
- [x] Cari Rujukan berdasarkan kasus kecelakaan + kota, dengan filter dan pengurutan
- [x] Daftar dan detail RS, Bandingkan, Peta
- [x] Penilaian Harga, Layanan, dan Tipe A–D
- [x] Login petugas, deploy otomatis ke VPS, 39 tes otomatis

### ⚠️ Keterbatasan Saat Ini (Perlu Disampaikan)

| Hal | Keterangan |
|---|---|
| **Daftar kasus kecelakaan masih contoh (dummy)** | 14 kasus dibuat sementara dari tindakan yang ada di 3 dokumen sampel. **Sumber kasus resmi belum ditentukan.** |
| Jumlah dan jam fasilitas/dokter | Tidak tercetak di dokumen tarif, jadi hanya terdeteksi "ada / tidak ada". |
| Halaman hasil scan | Belum dibaca (belum ada OCR), hanya ditandai. |
| Data masih 3 RS sampel | Penilaian relatif akan lebih bermakna setelah lebih banyak RS diunggah. |
| Daftar kota yang dikenali | Fokus Jawa Timur + kota besar. Perlu ditambah jika cakupan meluas. |
| Lokasi peta | Satu-satunya data dari luar dokumen (OpenStreetMap). |

### 🔜 Usulan Langkah Berikutnya

1. **Menetapkan sumber daftar kasus kecelakaan resmi** (mis. dari data klaim Jasa Raharja) untuk menggantikan data contoh.
2. **Mengunggah lebih banyak dokumen tarif RS** agar perbandingan harga dan tipe lebih akurat.
3. Menambahkan **OCR** untuk dokumen hasil scan.
4. Menambahkan **jarak dari lokasi kejadian** ke dalam peringkat rujukan.
5. Sumber data tambahan untuk kapasitas (jumlah tempat tidur, dokter jaga 24 jam), jika tersedia.

---

## 9. Skenario Demo (Usulan untuk Presentasi)

1. **Input Data:** unggah PDF Perda RSUD Iskak, tunjukkan progres baca, lalu pratinjau: profil beserta sumbernya, baris per kategori, fasilitas terdeteksi. Klik Simpan.
2. **Cari Rujukan:** pilih *"Cedera kepala berat"* + *Semua lokasi*, tunjukkan peringkat RS, buka rincian tindakan per tahap, lalu klik satu tindakan (mis. kraniotomi) untuk melihat perbandingan harga dengan median.
3. **Bandingkan 3 teratas:** tunjukkan tabel berdampingan dan tanda ✓ pada nilai terbaik.
4. **Rumah Sakit:** buka detail satu RS, tunjukkan tab Tarif (filter "Tindakan operatif") dan panel kelengkapan data.
5. **Peta:** tunjukkan sebaran RS dan filter per tipe.
6. Tutup dengan **keterbatasan dan langkah berikutnya** (bagian 8), terutama keputusan soal sumber data kasus kecelakaan.
