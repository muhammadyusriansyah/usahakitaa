# UsahaKita — Platform Manajemen UMKM & Katalog Online

Prototype web terintegrasi untuk operasional UMKM Indonesia (model Freemium: Free, Pro, Business) yang terdiri atas tiga sisi:
1. **Dashboard Pemilik & Kasir** (`app/index.html`) — Kasir/POS, Produk & Kategori, Persediaan Stok, Riwayat Transaksi, Laporan Penjualan & Laba Rugi, Pelanggan & Piutang, Pesan Pelanggan, serta Pengaturan Usaha.
2. **Website Katalog Publik** (`toko/index.html?u=<slug>`) — Katalog tanpa login per UMKM yang langsung sinkron dengan stok & harga, dilengkapi tombol **Pesan via WhatsApp** dan formulir **Tanya Penjual**.
3. **Admin Platform** (`admin/index.html`) — Ringkasan ekosistem, pengelolaan akun UMKM (verifikasi/tangguhkan/paket), editor paket langganan, kategori bisnis, pemantauan sistem, laporan platform, dan dukungan pengguna.

---

## Cara Menjalankan

Aplikasi dibangun dengan **HTML + CSS + JavaScript murni** (tanpa framework/library eksternal di runtime) menggunakan penyimpanan `localStorage` berprefiks `uk_` melalui `assets/js/db.js`.

### Opsi 1 — Server Pengembangan (Vite)
```bash
npm install
npm run dev
```
Buka `http://localhost:3000`.

### Opsi 2 — Server Statis Sederhana
Jalankan server statis apa pun di folder proyek (misalnya `npx serve .` atau `python3 -m http.server 8080`), lalu buka `index.html`.
*(Disarankan melalui HTTP server lokal dibanding `file://` agar `sessionStorage`, `localStorage`, dan URL relatif berjalan konsisten di semua browser.)*

---

## Akun Demo

| Peran | Halaman | Kredensial |
|---|---|---|
| **Pemilik Demo** (`Bisnis Kita Store`) | `masuk.html` | `demo@usahakita.id` / `demo1234` |
| **Kasir Demo** (`Bisnis Kita Store`) | `masuk.html` | `kasir@usahakita.id` / `kasir1234` |
| **Admin Platform** | `admin/index.html` | `admin` / `admin` |

- Katalog Publik Demo: `toko/index.html?u=bisnis-kita-store`
- Pendaftaran UMKM Baru: `daftar.html`

---

## Struktur Folder

```text
usahakita/
├─ index.html                  # Landing page publik
├─ masuk.html                  # Login pemilik & kasir
├─ daftar.html                 # Wizard registrasi 2 langkah
├─ app/
│  ├─ index.html               # Shell dashboard & router hash (#/dashboard, dst.)
│  └─ js/
│     ├─ dashboard.js          # Ringkasan KPI, grafik SVG, transaksi terbaru
│     ├─ produk.js             # Produk, foto crop 1:1, varian, kategori, kuota paket
│     ├─ pos.js                # Kasir 2 kolom, diskon, pajak, tahan transaksi, struk
│     ├─ stok.js               # Manajemen stok masuk/keluar/opname & riwayat
│     ├─ transaksi.js          # Riwayat transaksi, drawer detail, batal & retur stok
│     ├─ laporan.js            # Laporan periodik, per produk/kategori, laba rugi, CSV/PDF
│     ├─ pelanggan.js          # Data pelanggan, piutang, riwayat pembayaran
│     ├─ pesan.js              # Inbox 3 panel (Website & WhatsApp)
│     └─ pengaturan.js         # Profil, katalog, struk 58mm, kasir, paket, reset demo
├─ admin/
│  ├─ index.html               # Portal login & shell Admin Platform
│  └─ js/
│     └─ admin.js              # 8 menu pengelolaan ekosistem UsahaKita
├─ toko/
│  └─ index.html               # Website katalog publik (?u=<slug-bisnis>)
├─ assets/
│  ├─ css/base.css             # Token warna, komponen bersama, layout & cetak 58mm
│  └─ js/
│     ├─ db.js                 # Repository multi-tenant (localStorage uk_ + seed otomatis)
│     ├─ auth.js               # Manajemen sesi demo (sessionStorage + fallback memori)
│     └─ utils.js              # Format Rupiah/tanggal, escapeHTML, modal, CSV, WA, struk
└─ docs/
   ├─ CONTEXT.md               # Konteks produk, desain, dan model data
   └─ PROGRESS.md              # Pelacakan progres Fase 0–15
```

---

## Menuju Produksi

Prototype ini seluruhnya berjalan di sisi klien. Untuk naik ke lingkungan produksi yang aman dan skalabel:

1. **`assets/js/db.js` → REST API (Laravel + PostgreSQL)**:
   - Seluruh modul UI memanggil antarmuka repository (`db.products.list()`, `.get()`, `.create()`, `.update()`, `.remove()`). Ganti implementasi tiap metode dengan `fetch()` ke endpoint REST API Laravel (`/api/v1/...`), dan pastikan **isolasi `tenant_id` ditegakkan di server** lewat middleware autentikasi & query scope Eloquent.
2. **Autentikasi Klien → Backend Aman**:
   - Pindahkan validasi login dari `assets/js/auth.js` ke endpoint server dengan kata sandi ter-hash (**bcrypt** / **Argon2id**), **HTTPS** wajib, cookie sesi `HttpOnly; SameSite=Lax` atau token JWT berumur pendek, serta **rate limiting** percobaan login.
3. **Upload Gambar (`dataURL`) → Object Storage**:
   - Ganti penyimpanan base64 `dataURL` di `localStorage` dengan unggahan multipart ke Object Storage (Amazon S3 / Google Cloud Storage / Cloudflare R2) dengan validasi tipe MIME dan ukuran di server.
4. **Laporan PDF & Excel Sisi Server**:
   - Pertahankan ekspor cepat di klien, dan tambahkan generator PDF/XLSX sisi server (mis. DomPDF / Snappy / Maatwebsite Excel) untuk arsip laporan volume besar.
