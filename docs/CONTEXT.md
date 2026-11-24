# CONTEXT — UsahaKita

## KONTEKS PRODUK

- **Produk**: Platform manajemen UMKM + website katalog terintegrasi (model Freemium: Free, Pro, Business). Bahasa Indonesia, mata uang Rupiah (format `Rp 1.250.000`).
- **Tiga Sisi**:
  - **(A) Dashboard Pemilik / Kasir** (`app/index.html`): manajemen usaha lengkap (Dashboard, Kasir/POS, Produk, Persediaan Stok, Transaksi, Laporan, Pesan Pelanggan, Pelanggan, Pengaturan Usaha).
  - **(B) Website Katalog Publik per UMKM** (`toko/index.html?u=<slug-bisnis>`): tanpa login, menampilkan produk berstatus `dipublikasikan` untuk tenant yang `katalogAktif === true` dan `status !== 'Ditangguhkan'`, dilengkapi tombol pesan WhatsApp dan formulir "Tanya penjual".
  - **(C) Admin Platform** (`admin/index.html`): pengelolaan ekosistem UMKM (Ringkasan, Akun UMKM, Paket Langganan, Kategori Bisnis, Pemantauan Sistem, Laporan Platform, Dukungan Pengguna, Pengaturan Admin).
- **Stack Prototype**: HTML + CSS + JavaScript murni, tanpa framework dan tanpa library eksternal (font Inter/Plus Jakarta Sans dengan fallback `system-ui`). Semua data melewati `assets/js/db.js` (`localStorage` dengan prefix `uk_`) sehingga perubahan di dashboard langsung tercermin di katalog dan panel admin.
- **Pola Repository**: Lapisan data berupa repository (`db.products.list()`, `.get()`, `.create()`, `.update()`, `.remove()`) agar nantinya mudah diganti dengan REST API (mis. Laravel + PostgreSQL) tanpa mengubah modul UI.
- **Multi-Tenant**: Setiap data bisnis memiliki `tenantId`. Setiap query WAJIB difilter dengan `tenantId` dari sesi; tidak ada fungsi yang mengembalikan data tenant lain. Katalog publik hanya membaca produk berstatus `"dipublikasikan"` milik bisnis dengan katalog aktif.
- **Autentikasi Demo (hanya klien)**:
  - Admin platform: `admin` / `admin`
  - Pemilik demo: `demo@usahakita.id` / `demo1234`
  - Sesi disimpan di `sessionStorage` (dibungkus `try/catch` dengan fallback variabel memori JS).
  - Catatan keamanan: di produksi wajib menggunakan backend autentikasi, password ter-hash (bcrypt/Argon2), HTTPS, dan pembatasan percobaan login (rate limiting).

---

## DESAIN

```css
:root {
  --orange: #f4772b;
  --orange-dark: #df641d;
  --navy: #20243a;
  --ink: #252936;
  --muted: #7c8291;
  --line: #e9ebf0;
  --bg: #f6f7fa;
  --white: #fff;
  --green: #15966b;
  --red: #d94d4d;
  --amber: #b67a20;
}
```

- **Logo**: Kotak oranye bergradien berisi huruf `"U"` + teks `"usahakita"`.
- **Komponen Visual**:
  - Tombol primer oranye radius `10px`.
  - Kartu putih border `var(--line)` radius `12px–15px`.
  - Sidebar navy (`#20243a`) dengan menu aktif berlatar `#383d58` + garis aksen oranye di kiri.
  - Badge status berbentuk pil (`.status.success`, `.status.pending`, `.status.danger`).
  - Tipografi kecil-rapi (`9–13px` isi, `20–24px` judul, `tabular-nums` untuk angka/nominal).
- **Komponen Bersama (`assets/css/base.css`)**:
  - `.btn` (`.btn-primary`, `.btn-light`, `.btn-ghost`)
  - `.card` / `.panel`
  - `.stat-card`
  - Tabel + `.table-wrap` (scroll horizontal pada tabel)
  - `.status` (`.success`, `.pending`, `.danger`)
  - `.field`
  - `.modal`
  - `.toast`
  - `.empty-note`
  - `.pagination`
- **Responsif**: Desktop (`1440px`), tablet (`768px`), HP (`360px`); sidebar menjadi drawer pada lebar `<= 720px`; halaman tidak boleh memiliki scroll horizontal pada `body`.

---

## MODEL DATA (seed otomatis saat pertama dijalankan)

```
tenants          {id, slug, nama, jenis, pemilik, email, wa, alamat, deskripsi, logo, jamOperasional, katalogAktif, paket, status, waClicks, dibuatPada}
users            {id, tenantId, nama, email, passwordDemo, peran:'pemilik'|'kasir'}
categories       {id, tenantId, nama}
products         {id, tenantId, kode, barcode, nama, deskripsi, kategoriId, hargaBeli, hargaJual, stok, stokMin, foto(dataURL), emoji, status:'dipublikasikan'|'draf'|'diarsipkan', varian:[{nama, hargaTambahan}], dibuatPada}
stockMovements   {id, tenantId, productId, tipe:'masuk'|'keluar'|'penyesuaian'|'penjualan', jumlah, saldoSesudah, catatan, waktu}
customers        {id, tenantId, nama, telepon, piutang, riwayatPiutang:[{waktu, jumlah, tipe, catatan}], dibuatPada}
transactions     {id:'TRX-00001', tenantId, waktu, pelangganId|null, items:[{productId, nama, qty, harga, hargaBeli}], subtotal, diskon, pajak, total, metode:'Tunai'|'QRIS'|'Transfer', dibayar, kembalian, status:'Selesai'|'Menunggu'|'Dibatalkan', alasanBatal}
conversations    {id, tenantId, nama, telepon, kanal:'Website'|'WhatsApp', unread, catatan, messages:[{dari:'pelanggan'|'pemilik', teks, waktu}]}
settings         {tenantId, pajakPersen, metodeAktif, footerStruk, pesanWADefault}
plans            {id:'free'|'pro'|'business', nama, harga, batas:{produk, pengguna, cabang}, fitur[]}
businessCategories {id, nama, aktif}
tickets          {id, tenantId, subjek, prioritas:'Rendah'|'Sedang'|'Tinggi', status:'Baru'|'Diproses'|'Selesai', pesan:[{dari:'pemilik'|'admin', teks, waktu}], dibuatPada}
systemLogs       {id, level:'info'|'peringatan'|'error', pesan, waktu}
```

### Data Seed Awal
- 1 tenant demo **"Bisnis Kita Store"** (jenis: `Kuliner dan makanan`, Banda Aceh, slug `bisnis-kita-store`, paket `pro`, status `Aktif`, katalog aktif).
- ±12 produk kuliner/oleh-oleh khas Aceh & minuman, 4 kategori, ±30 transaksi dalam 30 hari terakhir, 6 pelanggan, 4 percakapan.
- ±15 tenant dummy tambahan (beragam jenis usaha, paket `free`/`pro`/`business`, dan status `Aktif`/`Ditangguhkan`/`Menunggu verifikasi`) untuk menu admin.
- 3 paket langganan (`free`, `pro`, `business`), 10 kategori bisnis awal, tiket dukungan, dan log sistem.
