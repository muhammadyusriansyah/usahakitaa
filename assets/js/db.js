/* UsahaKita — Lapisan Data Repository (localStorage prefix uk_ + isolasi multi-tenant)
 * Dirancang menyerupai repository REST API agar mudah diganti fetch() ke backend Laravel + PostgreSQL.
 */
(function (global) {
  'use strict';

  var PREFIX = 'uk_';
  var memoryStore = {};

  function readKey(key, fallback) {
    var full = PREFIX + key;
    try {
      var raw = global.localStorage.getItem(full);
      if (raw !== null) return JSON.parse(raw);
    } catch (_) {
      if (Object.prototype.hasOwnProperty.call(memoryStore, full)) {
        return JSON.parse(JSON.stringify(memoryStore[full]));
      }
    }
    return fallback;
  }

  function writeKey(key, val) {
    var full = PREFIX + key;
    memoryStore[full] = JSON.parse(JSON.stringify(val));
    try {
      global.localStorage.setItem(full, JSON.stringify(val));
    } catch (_) {
      /* Fallback memori tetap aktif bila localStorage penuh atau diblokir */
    }
  }

  function genId(prefix) {
    return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }

  function daysAgoISO(days, hour, min) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(hour != null ? hour : 10, min != null ? min : 15, 0, 0);
    return d.toISOString();
  }

  function defaultHours() {
    var days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    var map = {};
    days.forEach(function (day, idx) {
      map[day] = { buka: idx < 6, jamBuka: '08:00', jamTutup: idx === 5 ? '20:00' : '21:00' };
    });
    return map;
  }

  function buildSeedData() {
    var demoTenantId = 't_demo';
    var secondTenantId = 't_kopi2';

    var businessCategories = [
      { id: 'bc_1', nama: 'Kuliner dan makanan', aktif: true },
      { id: 'bc_2', nama: 'Minuman dan kedai kopi', aktif: true },
      { id: 'bc_3', nama: 'Retail dan perdagangan', aktif: true },
      { id: 'bc_4', nama: 'Fashion dan pakaian', aktif: true },
      { id: 'bc_5', nama: 'Elektronik', aktif: true },
      { id: 'bc_6', nama: 'Salon dan barbershop', aktif: true },
      { id: 'bc_7', nama: 'Bengkel', aktif: true },
      { id: 'bc_8', nama: 'Usaha jasa', aktif: true },
      { id: 'bc_9', nama: 'Produksi dan manufaktur', aktif: true },
      { id: 'bc_10', nama: 'Usaha online', aktif: true }
    ];

    var plans = [
      {
        id: 'free',
        nama: 'Free',
        harga: 0,
        batas: { produk: 25, pengguna: 1, cabang: 1 },
        fitur: ['Kasir digital harian', 'Maksimal 25 produk', 'Katalog online + pesan WhatsApp', 'Laporan ringkasan 7 hari']
      },
      {
        id: 'pro',
        nama: 'Pro',
        harga: 99000,
        batas: { produk: 500, pengguna: 5, cabang: 2 },
        fitur: ['Hingga 500 produk & varian', 'Manajemen stok & stok opname', 'Hingga 5 akun kasir/staf', 'Laporan lengkap & ekspor CSV/PDF']
      },
      {
        id: 'business',
        nama: 'Business',
        harga: 249000,
        batas: { produk: 5000, pengguna: 20, cabang: 10 },
        fitur: ['Hingga 5.000 produk', 'Multi-cabang hingga 10 lokasi', 'Hingga 20 pengguna & peran', 'Dukungan prioritas & riwayat penuh']
      }
    ];

    var tenants = [
      {
        id: demoTenantId,
        slug: 'bisnis-kita-store',
        nama: 'Bisnis Kita Store',
        jenis: 'Kuliner dan makanan',
        pemilik: 'Rizky Pratama',
        email: 'demo@usahakita.id',
        wa: '6281269001234',
        alamat: 'Jl. Teuku Umar No. 48, Banda Aceh',
        deskripsi: 'Sajian kopi khas Aceh, kue tradisional, dan oleh-oleh pilihan dengan kualitas terbaik setiap hari.',
        logo: '',
        jamOperasional: defaultHours(),
        katalogAktif: true,
        paket: 'pro',
        status: 'Aktif',
        waClicks: 42,
        dibuatPada: daysAgoISO(95, 9, 0)
      },
      {
        id: secondTenantId,
        slug: 'kedai-kopi-ulee',
        nama: 'Kedai Kopi Ulee Lheue',
        jenis: 'Minuman dan kedai kopi',
        pemilik: 'Cut Nabila',
        email: 'nabila@uleekopi.id',
        wa: '6281377001122',
        alamat: 'Jl. Sultan Iskandar Muda No. 12, Banda Aceh',
        deskripsi: 'Kopi saring dan espresso biji Gayo pilihan.',
        logo: '',
        jamOperasional: defaultHours(),
        katalogAktif: true,
        paket: 'pro',
        status: 'Aktif',
        waClicks: 19,
        dibuatPada: daysAgoISO(82, 10, 0)
      }
    ];

    var extraTenants = [
      ['Warung Bakso Makmur', 'Kuliner dan makanan', 'Hendra Wijaya', 'free', 'Aktif', 74],
      ['Boutique Senja', 'Fashion dan pakaian', 'Sari Rahma', 'pro', 'Aktif', 68],
      ['Toko Berkah Sembako', 'Retail dan perdagangan', 'Ahmad Fauzi', 'free', 'Aktif', 60],
      ['Barber Ganteng Rapi', 'Salon dan barbershop', 'Dedi Kurniawan', 'free', 'Aktif', 55],
      ['Bengkel Maju Jaya', 'Bengkel', 'Budi Santoso', 'pro', 'Aktif', 49],
      ['Galeri Kerajinan Nusantara', 'Produksi dan manufaktur', 'Dewi Lestari', 'business', 'Aktif', 41],
      ['Gawai Center Aceh', 'Elektronik', 'Fajar Maulana', 'pro', 'Ditangguhkan', 38],
      ['Laundry Kilat Bersih', 'Usaha jasa', 'Mira Puspita', 'free', 'Aktif', 31],
      ['Snack Rumahan Bunda', 'Usaha online', 'Yuni Astuti', 'free', 'Aktif', 26],
      ['Martabak Malam Jaya', 'Kuliner dan makanan', 'Irwan Hakim', 'pro', 'Aktif', 21],
      ['Roastery Puncak Gayo', 'Minuman dan kedai kopi', 'Tariq Alamsyah', 'business', 'Aktif', 17],
      ['Hijab Minimalis Studio', 'Fashion dan pakaian', 'Nadia Putri', 'pro', 'Menunggu verifikasi', 11],
      ['Percetakan Cepat Media', 'Usaha jasa', 'Raka Permana', 'free', 'Aktif', 8],
      ['Dapur Kue Renyah', 'Kuliner dan makanan', 'Lina Marlina', 'free', 'Menunggu verifikasi', 3]
    ];

    extraTenants.forEach(function (row, idx) {
      var num = idx + 3;
      var slugBase = row[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      tenants.push({
        id: 't_dummy_' + num,
        slug: slugBase,
        nama: row[0],
        jenis: row[1],
        pemilik: row[2],
        email: 'umkm' + num + '@contoh.id',
        wa: '6281200000' + String(10 + num),
        alamat: 'Indonesia',
        deskripsi: 'Usaha ' + row[1] + ' terpercaya.',
        logo: '',
        jamOperasional: defaultHours(),
        katalogAktif: row[4] === 'Aktif',
        paket: row[3],
        status: row[4],
        waClicks: Math.max(0, 25 - idx),
        dibuatPada: daysAgoISO(row[5], 11, 0)
      });
    });

    var users = [
      { id: 'u_demo_owner', tenantId: demoTenantId, nama: 'Rizky Pratama', email: 'demo@usahakita.id', passwordDemo: 'demo1234', peran: 'pemilik' },
      { id: 'u_demo_kasir', tenantId: demoTenantId, nama: 'Siti Aisyah', email: 'kasir@usahakita.id', passwordDemo: 'kasir1234', peran: 'kasir' },
      { id: 'u_kopi2_owner', tenantId: secondTenantId, nama: 'Cut Nabila', email: 'nabila@uleekopi.id', passwordDemo: 'kopi1234', peran: 'pemilik' }
    ];

    var categories = [
      { id: 'cat_1', tenantId: demoTenantId, nama: 'Kopi & Minuman' },
      { id: 'cat_2', tenantId: demoTenantId, nama: 'Kue & Camilan' },
      { id: 'cat_3', tenantId: demoTenantId, nama: 'Oleh-Oleh Aceh' },
      { id: 'cat_4', tenantId: demoTenantId, nama: 'Paket Hemat' },
      { id: 'cat_other_1', tenantId: secondTenantId, nama: 'Kopi Saring' }
    ];

    var products = [
      { id: 'prd_1', tenantId: demoTenantId, kode: 'BKS-001', barcode: '8991001001', nama: 'Kopi Sanger Arabika Botol 250ml', deskripsi: 'Perpaduan espresso Arabika Gayo dan susu kental manis gurih siap minum.', kategoriId: 'cat_1', hargaBeli: 10000, hargaJual: 18000, stok: 34, stokMin: 10, foto: '', emoji: '☕', status: 'dipublikasikan', varian: [{ nama: 'Less Sugar', hargaTambahan: 0 }, { nama: 'Extra Espresso', hargaTambahan: 4000 }], dibuatPada: daysAgoISO(40) },
      { id: 'prd_2', tenantId: demoTenantId, kode: 'BKS-002', barcode: '8991001002', nama: 'Es Teh Tarik Rempah Aceh', deskripsi: 'Teh tarik lembut dengan aroma kapulaga dan kayu manis.', kategoriId: 'cat_1', hargaBeli: 7500, hargaJual: 15000, stok: 28, stokMin: 8, foto: '', emoji: '🧋', status: 'dipublikasikan', varian: [], dibuatPada: daysAgoISO(39) },
      { id: 'prd_3', tenantId: demoTenantId, kode: 'BKS-003', barcode: '8991001003', nama: 'Kopi Tubruk Gayo Bubuk 200g', deskripsi: 'Biji kopi Gayo panggang medium, giling halus siap seduh.', kategoriId: 'cat_3', hargaBeli: 28000, hargaJual: 48000, stok: 19, stokMin: 6, foto: '', emoji: '🫘', status: 'dipublikasikan', varian: [{ nama: 'Giling Halus', hargaTambahan: 0 }, { nama: 'Biji Utuh', hargaTambahan: 0 }], dibuatPada: daysAgoISO(38) },
      { id: 'prd_4', tenantId: demoTenantId, kode: 'BKS-004', barcode: '8991001004', nama: 'Kue Adee Singkong Original', deskripsi: 'Kue bingkang tradisional khas Pidie Jaya yang lembut dan harum daun pandan.', kategoriId: 'cat_2', hargaBeli: 18000, hargaJual: 32000, stok: 14, stokMin: 5, foto: '', emoji: '🍰', status: 'dipublikasikan', varian: [{ nama: 'Ukuran Sedang', hargaTambahan: 0 }, { nama: 'Loyang Besar', hargaTambahan: 18000 }], dibuatPada: daysAgoISO(35) },
      { id: 'prd_5', tenantId: demoTenantId, kode: 'BKS-005', barcode: '8991001005', nama: 'Timphan Labu Kuning (Isi 10)', deskripsi: 'Kue basah tradisional dibungkus daun pisang muda dengan isian srikaya.', kategoriId: 'cat_2', hargaBeli: 15000, hargaJual: 26000, stok: 6, stokMin: 8, foto: '', emoji: '🥟', status: 'dipublikasikan', varian: [], dibuatPada: daysAgoISO(33) },
      { id: 'prd_6', tenantId: demoTenantId, kode: 'BKS-006', barcode: '8991001006', nama: 'Keripik Pisang Kepok Renyah 250g', deskripsi: 'Keripik pisang tipis gurih manis tanpa bahan pengawet.', kategoriId: 'cat_2', hargaBeli: 11000, hargaJual: 22000, stok: 25, stokMin: 6, foto: '', emoji: '🍌', status: 'dipublikasikan', varian: [{ nama: 'Manis', hargaTambahan: 0 }, { nama: 'Asin Gurih', hargaTambahan: 0 }], dibuatPada: daysAgoISO(31) },
      { id: 'prd_7', tenantId: demoTenantId, kode: 'BKS-007', barcode: '8991001007', nama: 'Dendeng Aceh Bumbu Ketumbar 200g', deskripsi: 'Daging sapi pilihan diiris tipis dan dibumbui rempah khas Aceh.', kategoriId: 'cat_3', hargaBeli: 52000, hargaJual: 85000, stok: 9, stokMin: 5, foto: '', emoji: '🥩', status: 'dipublikasikan', varian: [], dibuatPada: daysAgoISO(29) },
      { id: 'prd_8', tenantId: demoTenantId, kode: 'BKS-008', barcode: '8991001008', nama: 'Sirup Asam Suntie & Markisa 500ml', deskripsi: 'Minuman segar sari buah markisa alami, cocok untuk sajian keluarga.', kategoriId: 'cat_1', hargaBeli: 20000, hargaJual: 35000, stok: 4, stokMin: 5, foto: '', emoji: '🍹', status: 'dipublikasikan', varian: [], dibuatPada: daysAgoISO(27) },
      { id: 'prd_9', tenantId: demoTenantId, kode: 'BKS-009', barcode: '8991001009', nama: 'Paket Oleh-Oleh Santai', deskripsi: 'Berisi 1 Kopi Gayo 200g, 1 Kue Adee, dan 1 Keripik Pisang.', kategoriId: 'cat_4', hargaBeli: 54000, hargaJual: 95000, stok: 12, stokMin: 4, foto: '', emoji: '🎁', status: 'dipublikasikan', varian: [], dibuatPada: daysAgoISO(24) },
      { id: 'prd_10', tenantId: demoTenantId, kode: 'BKS-010', barcode: '8991001010', nama: 'Bolu Karamel Sarang Semut', deskripsi: 'Bolu klasik bertekstur kenyal bersarang dengan karamel legit.', kategoriId: 'cat_2', hargaBeli: 22000, hargaJual: 40000, stok: 0, stokMin: 4, foto: '', emoji: '🍮', status: 'dipublikasikan', varian: [], dibuatPada: daysAgoISO(20) },
      { id: 'prd_11', tenantId: demoTenantId, kode: 'BKS-011', barcode: '8991001011', nama: 'Paket Ngopi Kantor (6 Botol Sanger)', deskripsi: 'Paket hemat 6 botol Kopi Sanger Arabika 250ml untuk rapat atau acara.', kategoriId: 'cat_4', hargaBeli: 58000, hargaJual: 99000, stok: 15, stokMin: 3, foto: '', emoji: '📦', status: 'dipublikasikan', varian: [], dibuatPada: daysAgoISO(15) },
      { id: 'prd_12', tenantId: demoTenantId, kode: 'BKS-012', barcode: '8991001012', nama: 'Sambal Ganja Udang Kemasan Jar (Draf)', deskripsi: 'Resep uji coba sambal asam udang khas Aceh kemasan kaca 150g.', kategoriId: 'cat_3', hargaBeli: 19000, hargaJual: 34000, stok: 8, stokMin: 4, foto: '', emoji: '🌶️', status: 'draf', varian: [], dibuatPada: daysAgoISO(5) },
      { id: 'prd_other_1', tenantId: secondTenantId, kode: 'KKU-001', barcode: '8992001001', nama: 'Kopi Hitam Ulee Lheue', deskripsi: 'Kopi hitam khas kedai lain (untuk uji isolasi tenant).', kategoriId: 'cat_other_1', hargaBeli: 6000, hargaJual: 14000, stok: 50, stokMin: 5, foto: '', emoji: '☕', status: 'dipublikasikan', varian: [], dibuatPada: daysAgoISO(10) }
    ];

    var stockMovements = products
      .filter(function (p) { return p.tenantId === demoTenantId; })
      .map(function (p, i) {
        return {
          id: 'sm_init_' + (i + 1),
          tenantId: demoTenantId,
          productId: p.id,
          tipe: 'masuk',
          jumlah: p.stok,
          saldoSesudah: p.stok,
          catatan: 'Stok awal produk',
          waktu: p.dibuatPada
        };
      });

    var customers = [
      { id: 'cust_1', tenantId: demoTenantId, nama: 'Nadia Safitri', telepon: '628126001111', piutang: 0, riwayatPiutang: [], dibuatPada: daysAgoISO(45) },
      { id: 'cust_2', tenantId: demoTenantId, nama: 'Fikri Ramadhan', telepon: '628136002222', piutang: 85000, riwayatPiutang: [{ waktu: daysAgoISO(4), jumlah: 85000, tipe: 'tambah', catatan: 'Sisa tagihan TRX-00027' }], dibuatPada: daysAgoISO(38) },
      { id: 'cust_3', tenantId: demoTenantId, nama: 'Dewi Kartika', telepon: '628526003333', piutang: 0, riwayatPiutang: [], dibuatPada: daysAgoISO(30) },
      { id: 'cust_4', tenantId: demoTenantId, nama: 'Hafiz Alfarizi', telepon: '628116004444', piutang: 48000, riwayatPiutang: [{ waktu: daysAgoISO(2), jumlah: 48000, tipe: 'tambah', catatan: 'Kurang bayar TRX-00028' }], dibuatPada: daysAgoISO(25) },
      { id: 'cust_5', tenantId: demoTenantId, nama: 'Putri Ayu', telepon: '628216005555', piutang: 0, riwayatPiutang: [], dibuatPada: daysAgoISO(14) },
      { id: 'cust_6', tenantId: demoTenantId, nama: 'Zulkifli Hasan', telepon: '628536006666', piutang: 0, riwayatPiutang: [], dibuatPada: daysAgoISO(6) },
      { id: 'cust_other_1', tenantId: secondTenantId, nama: 'Pelanggan Tenant Lain', telepon: '628199999999', piutang: 0, riwayatPiutang: [], dibuatPada: daysAgoISO(5) }
    ];

    var demoProductsOnly = products.filter(function (p) { return p.tenantId === demoTenantId && p.status === 'dipublikasikan'; });
    var metodeList = ['Tunai', 'QRIS', 'Transfer'];
    var transactions = [];
    for (var tIdx = 0; tIdx < 30; tIdx++) {
      var daysBack = Math.max(0, 29 - tIdx);
      if (tIdx >= 27) daysBack = 0;
      else if (tIdx >= 24) daysBack = 1;

      var p1 = demoProductsOnly[tIdx % demoProductsOnly.length];
      var p2 = demoProductsOnly[(tIdx + 3) % demoProductsOnly.length];
      var q1 = (tIdx % 3) + 1;
      var q2 = tIdx % 2 === 0 ? 1 : 2;
      var items = [
        { productId: p1.id, nama: p1.nama, qty: q1, harga: p1.hargaJual, hargaBeli: p1.hargaBeli },
        { productId: p2.id, nama: p2.nama, qty: q2, harga: p2.hargaJual, hargaBeli: p2.hargaBeli }
      ];
      var subtotal = items.reduce(function (acc, it) { return acc + it.qty * it.harga; }, 0);
      var diskon = tIdx % 5 === 0 ? 5000 : 0;
      var pajak = 0;
      var total = Math.max(0, subtotal - diskon + pajak);
      var status = 'Selesai';
      if (tIdx === 26) status = 'Menunggu';
      if (tIdx === 20) status = 'Dibatalkan';
      var custId = tIdx % 2 === 0 ? customers[tIdx % 6].id : null;
      var dibayar = total;
      if (tIdx === 26) { dibayar = Math.max(0, total - 85000); custId = 'cust_2'; }
      if (tIdx === 27) { dibayar = Math.max(0, total - 48000); custId = 'cust_4'; }

      transactions.push({
        id: 'TRX-' + String(tIdx + 1).padStart(5, '0'),
        tenantId: demoTenantId,
        waktu: daysAgoISO(daysBack, 9 + (tIdx % 10), (tIdx * 7) % 60),
        pelangganId: custId,
        items: items,
        subtotal: subtotal,
        diskon: diskon,
        pajak: pajak,
        total: total,
        metode: metodeList[tIdx % 3],
        dibayar: dibayar,
        kembalian: Math.max(0, dibayar - total),
        status: status,
        alasanBatal: status === 'Dibatalkan' ? 'Pelanggan mengganti pesanan' : ''
      });
    }

    var conversations = [
      {
        id: 'conv_1',
        tenantId: demoTenantId,
        nama: 'Nadia Safitri',
        telepon: '628126001111',
        kanal: 'WhatsApp',
        unread: 1,
        catatan: 'Pelanggan tetap kopi sanger botol.',
        messages: [
          { dari: 'pelanggan', teks: 'Halo kak, Kopi Sanger botol ready 10 botol untuk besok pagi?', waktu: daysAgoISO(0, 8, 45) }
        ]
      },
      {
        id: 'conv_2',
        tenantId: demoTenantId,
        nama: 'Rendi Kurniawan',
        telepon: '',
        kanal: 'Website',
        unread: 1,
        catatan: '',
        messages: [
          { dari: 'pelanggan', teks: 'Permisi, apakah Paket Oleh-Oleh Santai bisa dikirim ke luar kota?', waktu: daysAgoISO(0, 9, 20) }
        ]
      },
      {
        id: 'conv_3',
        tenantId: demoTenantId,
        nama: 'Dewi Kartika',
        telepon: '628526003333',
        kanal: 'WhatsApp',
        unread: 0,
        catatan: 'Suka Kue Adee ukuran besar.',
        messages: [
          { dari: 'pelanggan', teks: 'Kak, Kue Adee loyang besar masih ada?', waktu: daysAgoISO(2, 14, 10) },
          { dari: 'pemilik', teks: 'Masih ada kak Dewi, silakan langsung dipesan ya.', waktu: daysAgoISO(2, 14, 18) },
          { dari: 'pelanggan', teks: 'Baik terima kasih kak!', waktu: daysAgoISO(2, 14, 21) }
        ]
      },
      {
        id: 'conv_4',
        tenantId: demoTenantId,
        nama: 'Putri Ayu',
        telepon: '628216005555',
        kanal: 'Website',
        unread: 0,
        catatan: '',
        messages: [
          { dari: 'pelanggan', teks: 'Jam buka hari Sabtu sampai jam berapa ya?', waktu: daysAgoISO(5, 11, 0) },
          { dari: 'pemilik', teks: 'Hari Sabtu kami buka 08:00 sampai 20:00 WIB kak.', waktu: daysAgoISO(5, 11, 5) }
        ]
      },
      {
        id: 'conv_other_1',
        tenantId: secondTenantId,
        nama: 'Tamu Kedai Lain',
        telepon: '',
        kanal: 'Website',
        unread: 2,
        catatan: '',
        messages: [{ dari: 'pelanggan', teks: 'Pesan rahasia tenant lain', waktu: daysAgoISO(0, 7, 0) }]
      }
    ];

    var settings = [
      {
        tenantId: demoTenantId,
        pajakPersen: 0,
        metodeAktif: ['Tunai', 'QRIS', 'Transfer'],
        footerStruk: 'Terima kasih! Kunjungi katalog kami di usahaKita.',
        pesanWADefault: 'Halo, saya tertarik memesan produk berikut:\n\nNama Produk: {produk}\nHarga: {harga}\nJumlah: {jumlah}\nTautan: {tautan}\n\nApakah produk ini masih tersedia?'
      },
      {
        tenantId: secondTenantId,
        pajakPersen: 10,
        metodeAktif: ['Tunai', 'QRIS'],
        footerStruk: 'Terima kasih telah mampir.',
        pesanWADefault: 'Halo, saya mau pesan {produk} ({jumlah}x) - {harga}. {tautan}'
      }
    ];

    var tickets = [
      {
        id: 'TKT-001',
        tenantId: demoTenantId,
        subjek: 'Tanya cara cetak struk thermal 58mm',
        prioritas: 'Sedang',
        status: 'Diproses',
        pesan: [
          { dari: 'pemilik', teks: 'Halo admin, apakah printer bluetooth 58mm langsung didukung lewat browser?', waktu: daysAgoISO(3, 10, 0) },
          { dari: 'admin', teks: 'Halo kak Rizky, ya bisa lewat dialog cetak browser dengan ukuran kertas 58mm yang sudah kami siapkan.', waktu: daysAgoISO(3, 11, 15) }
        ],
        dibuatPada: daysAgoISO(3, 10, 0)
      },
      {
        id: 'TKT-002',
        tenantId: secondTenantId,
        subjek: 'Verifikasi rekening transfer toko',
        prioritas: 'Tinggi',
        status: 'Baru',
        pesan: [
          { dari: 'pemilik', teks: 'Mohon bantuannya untuk mengaktifkan fitur multi-cabang pada paket Pro kami.', waktu: daysAgoISO(1, 15, 30) }
        ],
        dibuatPada: daysAgoISO(1, 15, 30)
      },
      {
        id: 'TKT-003',
        tenantId: 't_dummy_4',
        subjek: 'Kendala unggah foto produk ukuran besar',
        prioritas: 'Rendah',
        status: 'Selesai',
        pesan: [
          { dari: 'pemilik', teks: 'Foto di atas 500KB ditolak sistem, apakah bisa dikompres otomatis?', waktu: daysAgoISO(7, 9, 10) },
          { dari: 'admin', teks: 'Untuk demo saat ini batas unggahan 500KB agar penyimpanan tetap ringan. Silakan perkecil gambar sebelum unggah.', waktu: daysAgoISO(7, 9, 45) }
        ],
        dibuatPada: daysAgoISO(7, 9, 10)
      }
    ];

    var systemLogs = [
      { id: 'log_1', level: 'info', pesan: 'Sinkronisasi katalog publik selesai untuk 14 UMKM aktif.', waktu: daysAgoISO(0, 7, 30) },
      { id: 'log_2', level: 'info', pesan: 'Pendaftaran akun baru: Dapur Kue Renyah (Menunggu verifikasi).', waktu: daysAgoISO(1, 16, 10) },
      { id: 'log_3', level: 'peringatan', pesan: 'Tenant Gawai Center Aceh ditangguhkan sementara oleh admin.', waktu: daysAgoISO(2, 13, 0) },
      { id: 'log_4', level: 'info', pesan: 'Backup harian metadata & transaksi berhasil dijalankan.', waktu: daysAgoISO(2, 3, 0) },
      { id: 'log_5', level: 'error', pesan: 'Percobaan unggah gambar melebihi batas 500KB ditolak pada modul produk.', waktu: daysAgoISO(4, 12, 22) }
    ];

    return {
      seeded: true,
      tenants: tenants,
      users: users,
      categories: categories,
      products: products,
      stockMovements: stockMovements,
      customers: customers,
      transactions: transactions,
      conversations: conversations,
      settings: settings,
      plans: plans,
      businessCategories: businessCategories,
      tickets: tickets,
      systemLogs: systemLogs
    };
  }

  function ensureSeeded() {
    if (readKey('seeded', false)) return;
    var seed = buildSeedData();
    Object.keys(seed).forEach(function (k) {
      writeKey(k, seed[k]);
    });
  }

  function requireTenantId(tenantId) {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Akses ditolak: tenantId wajib disertakan.');
    }
    return tenantId;
  }

  function parseListArgs(arg1, arg2) {
    if (typeof arg1 === 'string') {
      var f = Object.assign({}, arg2 || {});
      f.tenantId = arg1;
      return f;
    }
    return Object.assign({}, arg1 || {});
  }

  function makeTenantRepo(key, idPrefix) {
    return {
      list: function (arg1, arg2) {
        ensureSeeded();
        var filter = parseListArgs(arg1, arg2);
        var tenantId = requireTenantId(filter.tenantId);
        var rows = readKey(key, []);
        return rows.filter(function (row) {
          if (row.tenantId !== tenantId) return false;
          for (var prop in filter) {
            if (!Object.prototype.hasOwnProperty.call(filter, prop)) continue;
            if (prop === 'tenantId' || filter[prop] === undefined || filter[prop] === '' || filter[prop] === 'semua') continue;
            if (row[prop] !== filter[prop]) return false;
          }
          return true;
        });
      },
      get: function (id, tenantId) {
        ensureSeeded();
        var tid = requireTenantId(tenantId);
        var rows = readKey(key, []);
        var own = rows.find(function (r) { return r.id === id && r.tenantId === tid; });
        if (own) return JSON.parse(JSON.stringify(own));
        var other = rows.find(function (r) { return r.id === id; });
        if (other) {
          throw new Error('Akses lintas tenant ditolak.');
        }
        return null;
      },
      create: function (data) {
        ensureSeeded();
        var payload = Object.assign({}, data || {});
        var tid = requireTenantId(payload.tenantId);
        var rows = readKey(key, []);
        if (!payload.id) {
          if (key === 'transactions') {
            var count = rows.filter(function (r) { return r.tenantId === tid; }).length + 1;
            var candidate = 'TRX-' + String(count).padStart(5, '0');
            while (rows.some(function (r) { return r.tenantId === tid && r.id === candidate; })) {
              count += 1;
              candidate = 'TRX-' + String(count).padStart(5, '0');
            }
            payload.id = candidate;
          } else {
            payload.id = genId(idPrefix);
          }
        }
        if (!payload.dibuatPada && (key === 'products' || key === 'customers' || key === 'tickets')) {
          payload.dibuatPada = new Date().toISOString();
        }
        rows.push(payload);
        writeKey(key, rows);
        return JSON.parse(JSON.stringify(payload));
      },
      update: function (id, patch, tenantId) {
        ensureSeeded();
        var tid = requireTenantId(tenantId || (patch && patch.tenantId));
        var rows = readKey(key, []);
        var idx = rows.findIndex(function (r) { return r.id === id && r.tenantId === tid; });
        if (idx === -1) {
          var otherIdx = rows.findIndex(function (r) { return r.id === id; });
          if (otherIdx !== -1) {
            throw new Error('Akses lintas tenant ditolak.');
          }
          return null;
        }
        var safePatch = Object.assign({}, patch || {});
        if (safePatch.tenantId && safePatch.tenantId !== tid) {
          throw new Error('Tidak dapat memindahkan data lintas tenant.');
        }
        safePatch.tenantId = tid;
        safePatch.id = id;
        rows[idx] = Object.assign({}, rows[idx], safePatch);
        writeKey(key, rows);
        return JSON.parse(JSON.stringify(rows[idx]));
      },
      remove: function (id, tenantId) {
        ensureSeeded();
        var tid = requireTenantId(tenantId);
        var rows = readKey(key, []);
        var idx = rows.findIndex(function (r) { return r.id === id && r.tenantId === tid; });
        if (idx === -1) {
          var otherIdx = rows.findIndex(function (r) { return r.id === id; });
          if (otherIdx !== -1) {
            throw new Error('Akses lintas tenant ditolak.');
          }
          return false;
        }
        rows.splice(idx, 1);
        writeKey(key, rows);
        return true;
      }
    };
  }

  ensureSeeded();

  var db = {
    reset: function () {
      var seed = buildSeedData();
      Object.keys(seed).forEach(function (k) {
        writeKey(k, seed[k]);
      });
      return true;
    },

    tenants: {
      list: function (filter) {
        ensureSeeded();
        var rows = readKey('tenants', []);
        if (!filter) return rows;
        return rows.filter(function (t) {
          if (filter.status && filter.status !== 'semua' && t.status !== filter.status) return false;
          if (filter.paket && filter.paket !== 'semua' && t.paket !== filter.paket) return false;
          return true;
        });
      },
      get: function (id) {
        ensureSeeded();
        var rows = readKey('tenants', []);
        return rows.find(function (t) { return t.id === id; }) || null;
      },
      getBySlug: function (slug) {
        ensureSeeded();
        var rows = readKey('tenants', []);
        return rows.find(function (t) { return t.slug === slug; }) || null;
      },
      create: function (data) {
        ensureSeeded();
        var rows = readKey('tenants', []);
        var item = Object.assign({
          id: genId('t'),
          logo: '',
          jamOperasional: defaultHours(),
          katalogAktif: true,
          paket: 'free',
          status: 'Aktif',
          waClicks: 0,
          dibuatPada: new Date().toISOString()
        }, data || {});
        rows.push(item);
        writeKey('tenants', rows);
        return item;
      },
      update: function (id, patch) {
        ensureSeeded();
        var rows = readKey('tenants', []);
        var idx = rows.findIndex(function (t) { return t.id === id; });
        if (idx === -1) return null;
        rows[idx] = Object.assign({}, rows[idx], patch || {}, { id: id });
        writeKey('tenants', rows);
        return rows[idx];
      },
      remove: function (id) {
        ensureSeeded();
        var rows = readKey('tenants', []);
        var next = rows.filter(function (t) { return t.id !== id; });
        writeKey('tenants', next);
        return next.length !== rows.length;
      },
      incrementWaClick: function (id) {
        var t = this.get(id);
        if (!t) return null;
        return this.update(id, { waClicks: (Number(t.waClicks) || 0) + 1 });
      }
    },

    users: Object.assign(makeTenantRepo('users', 'u'), {
      findByEmail: function (email) {
        ensureSeeded();
        var target = String(email || '').trim().toLowerCase();
        var rows = readKey('users', []);
        return rows.find(function (u) { return String(u.email || '').toLowerCase() === target; }) || null;
      }
    }),

    categories: makeTenantRepo('categories', 'cat'),
    products: makeTenantRepo('products', 'prd'),
    stockMovements: makeTenantRepo('stockMovements', 'sm'),
    customers: makeTenantRepo('customers', 'cust'),
    transactions: makeTenantRepo('transactions', 'trx'),
    conversations: makeTenantRepo('conversations', 'conv'),

    settings: {
      get: function (tenantId) {
        ensureSeeded();
        var tid = requireTenantId(tenantId);
        var rows = readKey('settings', []);
        var found = rows.find(function (s) { return s.tenantId === tid; });
        if (found) return JSON.parse(JSON.stringify(found));
        return {
          tenantId: tid,
          pajakPersen: 0,
          metodeAktif: ['Tunai', 'QRIS', 'Transfer'],
          footerStruk: 'Terima kasih telah berbelanja!',
          pesanWADefault: 'Halo, saya tertarik memesan produk berikut:\n\nNama Produk: {produk}\nHarga: {harga}\nJumlah: {jumlah}\nTautan: {tautan}\n\nApakah produk ini masih tersedia?'
        };
      },
      update: function (tenantId, patch) {
        ensureSeeded();
        var tid = requireTenantId(tenantId);
        var rows = readKey('settings', []);
        var idx = rows.findIndex(function (s) { return s.tenantId === tid; });
        var base = this.get(tid);
        var next = Object.assign({}, base, patch || {}, { tenantId: tid });
        if (idx === -1) rows.push(next);
        else rows[idx] = next;
        writeKey('settings', rows);
        return JSON.parse(JSON.stringify(next));
      }
    },

    plans: {
      list: function () {
        ensureSeeded();
        return readKey('plans', []);
      },
      get: function (id) {
        ensureSeeded();
        return readKey('plans', []).find(function (p) { return p.id === id; }) || null;
      },
      update: function (id, patch) {
        ensureSeeded();
        var rows = readKey('plans', []);
        var idx = rows.findIndex(function (p) { return p.id === id; });
        if (idx === -1) return null;
        rows[idx] = Object.assign({}, rows[idx], patch || {}, { id: id });
        writeKey('plans', rows);
        return rows[idx];
      }
    },

    businessCategories: {
      list: function (onlyActive) {
        ensureSeeded();
        var rows = readKey('businessCategories', []);
        return onlyActive ? rows.filter(function (c) { return c.aktif; }) : rows;
      },
      get: function (id) {
        ensureSeeded();
        return readKey('businessCategories', []).find(function (c) { return c.id === id; }) || null;
      },
      create: function (data) {
        ensureSeeded();
        var rows = readKey('businessCategories', []);
        var item = { id: genId('bc'), nama: String((data && data.nama) || '').trim(), aktif: data && data.aktif !== false };
        rows.push(item);
        writeKey('businessCategories', rows);
        return item;
      },
      update: function (id, patch) {
        ensureSeeded();
        var rows = readKey('businessCategories', []);
        var idx = rows.findIndex(function (c) { return c.id === id; });
        if (idx === -1) return null;
        rows[idx] = Object.assign({}, rows[idx], patch || {}, { id: id });
        writeKey('businessCategories', rows);
        return rows[idx];
      },
      remove: function (id) {
        ensureSeeded();
        var rows = readKey('businessCategories', []);
        var next = rows.filter(function (c) { return c.id !== id; });
        writeKey('businessCategories', next);
        return next.length !== rows.length;
      }
    },

    tickets: Object.assign(makeTenantRepo('tickets', 'TKT'), {
      listAllPlatform: function () {
        ensureSeeded();
        return readKey('tickets', []);
      },
      updateAdmin: function (id, patch) {
        ensureSeeded();
        var rows = readKey('tickets', []);
        var idx = rows.findIndex(function (t) { return t.id === id; });
        if (idx === -1) return null;
        rows[idx] = Object.assign({}, rows[idx], patch || {}, { id: id });
        writeKey('tickets', rows);
        return rows[idx];
      }
    }),

    systemLogs: {
      list: function (level) {
        ensureSeeded();
        var rows = readKey('systemLogs', []);
        if (!level || level === 'semua') return rows;
        return rows.filter(function (l) { return l.level === level; });
      },
      create: function (data) {
        ensureSeeded();
        var rows = readKey('systemLogs', []);
        var item = {
          id: genId('log'),
          level: (data && data.level) || 'info',
          pesan: (data && data.pesan) || '',
          waktu: new Date().toISOString()
        };
        rows.unshift(item);
        writeKey('systemLogs', rows.slice(0, 100));
        return item;
      }
    },

    /* Agregat platform untuk menu Admin (tanpa mengekspos baris data bisnis ke modul tenant) */
    adminMetrics: function () {
      ensureSeeded();
      var trxs = readKey('transactions', []).filter(function (t) { return t.status === 'Selesai'; });
      var products = readKey('products', []);
      return {
        totalTransaksi: trxs.length,
        totalNilaiTransaksi: trxs.reduce(function (s, t) { return s + (Number(t.total) || 0); }, 0),
        totalProduk: products.length,
        transactionsSummary: trxs.map(function (t) {
          return { tenantId: t.tenantId, waktu: t.waktu, total: t.total };
        })
      };
    },

    /* Katalog publik: hanya produk 'dipublikasikan' dari tenant yang aktif & katalogAktif === true */
    publicCatalog: function (slug) {
      ensureSeeded();
      var tenant = this.tenants.getBySlug(slug);
      if (!tenant || !tenant.katalogAktif || tenant.status === 'Ditangguhkan') {
        return null;
      }
      var tid = tenant.id;
      var cats = this.categories.list({ tenantId: tid });
      var prods = this.products.list({ tenantId: tid, status: 'dipublikasikan' });
      var set = this.settings.get(tid);
      return {
        tenant: tenant,
        categories: cats,
        products: prods,
        settings: set
      };
    }
  };

  global.db = db;
})(window);
