/* Admin Platform UsahaKita
 * CATATAN KEAMANAN: Validasi kredensial admin/admin di klien hanya untuk prototype.
 * Produksi wajib autentikasi server-side dengan password ter-hash, HTTPS, dan pembatasan percobaan login.
 */
(function () {
  'use strict';

  var root = document.getElementById('adm-root');
  var activeMenu = 'ringkasan';
  var umkmState = { search: '', status: 'semua', paket: 'semua', sort: 'terbaru', page: 1, perPage: 8 };
  var monState = {
    uptime: '99,94%',
    respMs: 142,
    storagePct: 38,
    backupTime: 'Hari ini, 03:00 WIB',
    logFilter: 'semua',
    services: [
      { nama: 'API Gateway', status: 'Normal', cls: 'success' },
      { nama: 'Database Utama', status: 'Normal', cls: 'success' },
      { nama: 'Penyimpanan Gambar', status: 'Normal', cls: 'success' },
      { nama: 'Website Katalog', status: 'Normal', cls: 'success' }
    ],
    points: [128, 134, 149, 138, 155, 141, 132, 146, 160, 144, 136, 142]
  };
  var reportPeriod = '30hari';
  var ticketState = { status: 'semua', prioritas: 'semua', activeId: '' };

  function getAdminPrefs() {
    try {
      var raw = localStorage.getItem('uk_admin_prefs');
      return raw ? JSON.parse(raw) : { notifNewUmkm: true, notifTicket: true, notifSystem: true };
    } catch (_) {
      return { notifNewUmkm: true, notifTicket: true, notifSystem: true };
    }
  }

  function saveAdminPrefs(p) {
    try { localStorage.setItem('uk_admin_prefs', JSON.stringify(p)); } catch (_) {}
  }

  function renderLogin() {
    root.innerHTML =
      '<div class="adm-login-page">' +
        '<aside class="adm-login-side">' +
          '<div>' +
            '<a href="../index.html" class="uk-logo uk-logo--light">' +
              '<span class="uk-logo-mark">U</span>' +
              '<span class="uk-logo-text">usahakita</span>' +
            '</a>' +
            '<h1 style="font-size:24px;line-height:1.25;margin:24px 0 10px">Kelola seluruh ekosistem UMKM dari satu tempat.</h1>' +
            '<p style="margin:0;color:rgba(255,255,255,0.75);font-size:13.5px">Pantau pertumbuhan tenant, paket langganan, kategori bisnis, serta tiket dukungan pengguna.</p>' +
          '</div>' +
          '<div style="font-size:12px;color:rgba(255,255,255,0.65)">Mode demo — admin / admin</div>' +
        '</aside>' +
        '<main class="adm-login-main">' +
          '<div class="adm-login-card" id="adm-login-card">' +
            '<h2 style="margin:0 0 4px;font-size:20px">Masuk Admin Platform</h2>' +
            '<p style="margin:0 0 16px;font-size:12.5px;color:var(--muted)">Gunakan akun administrator UsahaKita.</p>' +
            '<div class="adm-err" id="adm-login-err" role="alert"></div>' +
            '<form id="adm-login-form" novalidate>' +
              '<div class="field"><label for="adm-user">Username</label><input type="text" id="adm-user" placeholder="admin" required autocomplete="username" /></div>' +
              '<div class="field"><label for="adm-pass">Kata Sandi</label>' +
                '<div class="adm-pw-wrap"><input type="password" id="adm-pass" placeholder="•••••" required style="padding-right:64px" /><button type="button" class="adm-pw-toggle" id="adm-pw-btn">Lihat</button></div>' +
              '</div>' +
              '<button type="submit" class="btn btn-primary" id="adm-login-btn" style="width:100%">Masuk ke Admin</button>' +
            '</form>' +
            '<div style="text-align:center;margin-top:14px;font-size:12px;color:var(--muted)">Mode demo — <strong>admin / admin</strong> · <a href="../index.html" style="color:var(--orange-dark);font-weight:600">Ke Beranda</a></div>' +
          '</div>' +
        '</main>' +
      '</div>';

    var pwInp = document.getElementById('adm-pass');
    document.getElementById('adm-pw-btn').addEventListener('click', function () {
      var show = pwInp.type === 'password';
      pwInp.type = show ? 'text' : 'password';
      this.textContent = show ? 'Sembunyi' : 'Lihat';
    });

    document.getElementById('adm-login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var u = document.getElementById('adm-user').value.trim();
      var p = pwInp.value;
      var btn = document.getElementById('adm-login-btn');
      var err = document.getElementById('adm-login-err');
      var card = document.getElementById('adm-login-card');

      err.classList.remove('show');
      card.classList.remove('shake');
      btn.disabled = true;
      btn.textContent = 'Memverifikasi...';

      setTimeout(function () {
        var res = UKAuth.login(u, p, 'admin');
        if (!res.ok) {
          btn.disabled = false;
          btn.textContent = 'Masuk ke Admin';
          err.textContent = res.error;
          err.classList.add('show');
          card.classList.add('shake');
          return;
        }
        renderShell();
      }, 700);
    });
  }

  function buildGrowthSVG(months) {
    var w = 560, h = 170, padL = 16, padR = 16, padT = 16, padB = 26;
    var iw = w - padL - padR, ih = h - padT - padB;
    var maxV = Math.max.apply(null, months.map(function (m) { return m.count; }).concat([4]));
    var bw = 34;
    var bars = months.map(function (m, i) {
      var x = padL + ((i + 0.5) / months.length) * iw - bw / 2;
      var bh = (m.count / maxV) * ih;
      var y = padT + ih - bh;
      return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw + '" height="' + Math.max(4, bh).toFixed(1) + '" rx="5" fill="#f4772b"/>' +
        '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#252936">' + m.count + '</text>' +
        '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="10" fill="#7c8291">' + UKUtils.escapeHTML(m.label) + '</text>';
    }).join('');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto">' + bars + '</svg>';
  }

  function buildPlanDonut(slices) {
    var total = slices.reduce(function (s, x) { return s + x.count; }, 0);
    if (!total) return '<svg viewBox="0 0 130 130" width="130" height="130"></svg>';
    var r = 46, circ = 2 * Math.PI * r, off = 0;
    var segs = slices.map(function (sl) {
      var len = (sl.count / total) * circ;
      var el = '<circle cx="65" cy="65" r="' + r + '" fill="none" stroke="' + sl.color + '" stroke-width="18" stroke-dasharray="' + len.toFixed(2) + ' ' + circ.toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 65 65)"/>';
      off += len;
      return el;
    }).join('');
    return '<svg viewBox="0 0 130 130" width="130" height="130">' + segs + '<text x="65" y="69" text-anchor="middle" font-size="12" font-weight="700" fill="#252936">' + total + ' UMKM</text></svg>';
  }

  function renderRingkasan(el) {
    var tenants = db.tenants.list();
    var plans = db.plans.list();
    var planPriceMap = {};
    plans.forEach(function (p) { planPriceMap[p.id] = Number(p.harga) || 0; });

    var metrics = db.adminMetrics();
    var logs = db.systemLogs.list().slice(0, 6);

    var cutoff30 = new Date();
    cutoff30.setDate(cutoff30.getDate() - 30);
    var activeTenantSet = {};
    metrics.transactionsSummary.forEach(function (t) {
      if (new Date(t.waktu) >= cutoff30) activeTenantSet[t.tenantId] = true;
    });
    var active30Count = tenants.filter(function (t) {
      return t.status === 'Aktif' && (activeTenantSet[t.id] || new Date(t.dibuatPada) >= cutoff30);
    }).length;

    var mrr = tenants.filter(function (t) { return t.status === 'Aktif'; })
      .reduce(function (s, t) { return s + (planPriceMap[t.paket] || 0); }, 0);

    var publishedCatalogs = tenants.filter(function (t) { return t.katalogAktif && t.status === 'Aktif'; }).length;
    var totalWaClicks = tenants.reduce(function (s, t) { return s + (Number(t.waClicks) || 0); }, 0);
    var paidTenants = tenants.filter(function (t) { return t.paket === 'pro' || t.paket === 'business'; }).length;
    var convPct = tenants.length ? Math.round((paidTenants / tenants.length) * 100) : 0;

    /* 6 bulan pertumbuhan */
    var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    var now = new Date();
    var months = [];
    for (var m = 5; m >= 0; m--) {
      var d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      var cnt = tenants.filter(function (t) {
        var td = new Date(t.dibuatPada);
        return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
      }).length;
      months.push({ label: monthNames[d.getMonth()], count: cnt });
    }

    /* Distribusi paket */
    var planColors = { free: '#7c8291', pro: '#f4772b', business: '#20243a' };
    var planSlices = plans.map(function (p) {
      return {
        nama: p.nama,
        count: tenants.filter(function (t) { return t.paket === p.id; }).length,
        color: planColors[p.id] || '#15966b'
      };
    });

    /* Jenis usaha terbanyak */
    var catCounts = {};
    tenants.forEach(function (t) { catCounts[t.jenis] = (catCounts[t.jenis] || 0) + 1; });
    var topTypes = Object.keys(catCounts).map(function (k) { return { nama: k, count: catCounts[k] }; })
      .sort(function (a, b) { return b.count - a.count; }).slice(0, 5);
    var maxType = topTypes.length ? Math.max(topTypes[0].count, 1) : 1;

    var latestTenants = tenants.slice().sort(function (a, b) {
      return new Date(b.dibuatPada) - new Date(a.dibuatPada);
    }).slice(0, 5);

    el.innerHTML =
      '<div class="page-header"><div><h1 class="page-title">Ringkasan Platform</h1><p class="page-subtitle">Ikhtisar pertumbuhan seluruh UMKM terdaftar di UsahaKita.</p></div></div>' +

      '<div class="stats-grid">' +
        '<div class="stat-card"><div class="stat-label">Total UMKM</div><div class="stat-value">' + tenants.length + '</div><div class="stat-meta up">' + publishedCatalogs + ' katalog aktif</div></div>' +
        '<div class="stat-card"><div class="stat-label">UMKM Aktif 30 Hari</div><div class="stat-value">' + active30Count + '</div><div class="stat-meta">Aktif bertransaksi / baru</div></div>' +
        '<div class="stat-card"><div class="stat-label">Total Transaksi Diproses</div><div class="stat-value">' + metrics.totalTransaksi + '</div><div class="stat-meta">' + UKUtils.escapeHTML(UKUtils.rupiah(metrics.totalNilaiTransaksi)) + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">Pendapatan Langganan / Bln</div><div class="stat-value">' + UKUtils.escapeHTML(UKUtils.rupiah(mrr)) + '</div><div class="stat-meta up">' + paidTenants + ' tenant berbayar</div></div>' +
      '</div>' +

      '<div class="panel" style="margin-top:16px">' +
        '<div class="panel-header"><h2 class="panel-title">Indikator Kinerja PRD</h2></div>' +
        '<div class="stats-grid">' +
          '<div class="stat-card"><div class="stat-label">Katalog Dipublikasikan</div><div class="stat-value">' + publishedCatalogs + '</div></div>' +
          '<div class="stat-card"><div class="stat-label">Total Klik WhatsApp</div><div class="stat-value">' + totalWaClicks + '</div></div>' +
          '<div class="stat-card"><div class="stat-label">Pengguna yang Kembali</div><div class="stat-value">' + active30Count + ' UMKM</div></div>' +
          '<div class="stat-card"><div class="stat-label">Konversi Free &rarr; Pro/Bisnis</div><div class="stat-value">' + convPct + '%</div></div>' +
        '</div>' +
      '</div>' +

      '<div class="adm-grid-2">' +
        '<section class="panel"><h2 class="panel-title" style="margin-bottom:10px">Pertumbuhan UMKM 6 Bulan</h2>' + buildGrowthSVG(months) + '</section>' +
        '<section class="panel"><h2 class="panel-title" style="margin-bottom:10px">Distribusi Paket</h2>' +
          '<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">' +
            buildPlanDonut(planSlices) +
            '<div style="flex:1;display:flex;flex-direction:column;gap:8px">' +
              planSlices.map(function (s) {
                return '<div style="display:flex;justify-content:space-between;font-size:12.5px"><span style="display:inline-flex;align-items:center;gap:6px"><span style="width:9px;height:9px;border-radius:3px;background:' + s.color + '"></span>' + UKUtils.escapeHTML(s.nama) + '</span><strong>' + s.count + '</strong></div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</section>' +
      '</div>' +

      '<div class="adm-grid-2">' +
        '<section class="panel"><h2 class="panel-title" style="margin-bottom:10px">Jenis Usaha Terbanyak</h2>' +
          '<div style="display:flex;flex-direction:column;gap:9px">' +
            topTypes.map(function (t) {
              var w = Math.max(8, Math.round((t.count / maxType) * 100));
              return '<div><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:3px"><span>' + UKUtils.escapeHTML(t.nama) + '</span><strong>' + t.count + '</strong></div><div style="height:7px;background:#eef0f5;border-radius:999px"><div style="height:100%;width:' + w + '%;background:var(--navy);border-radius:999px"></div></div></div>';
            }).join('') +
          '</div>' +
        '</section>' +
        '<section class="panel"><h2 class="panel-title" style="margin-bottom:10px">Log Aktivitas Terbaru</h2>' +
          '<div style="display:flex;flex-direction:column;gap:8px">' +
            logs.map(function (l) {
              var cls = l.level === 'error' ? 'danger' : (l.level === 'peringatan' ? 'pending' : 'neutral');
              return '<div style="font-size:12px;padding-bottom:7px;border-bottom:1px solid var(--line)"><span class="status ' + cls + '" style="margin-right:6px">' + UKUtils.escapeHTML(l.level) + '</span>' + UKUtils.escapeHTML(l.pesan) + '<div style="color:var(--muted);font-size:11px;margin-top:2px">' + UKUtils.escapeHTML(UKUtils.tanggalIndo(l.waktu, true)) + '</div></div>';
            }).join('') +
          '</div>' +
        '</section>' +
      '</div>' +

      '<section class="panel" style="margin-top:16px">' +
        '<div class="panel-header"><h2 class="panel-title">UMKM Terbaru</h2><button type="button" class="btn btn-light btn-sm" id="adm-go-umkm">Kelola Semua</button></div>' +
        '<div class="table-wrap"><table class="uk-table">' +
          '<thead><tr><th>Usaha</th><th>Pemilik</th><th>Jenis</th><th>Paket</th><th>Tanggal Daftar</th><th>Status</th></tr></thead>' +
          '<tbody>' + latestTenants.map(function (t) {
            var stCls = t.status === 'Aktif' ? 'success' : (t.status === 'Ditangguhkan' ? 'danger' : 'pending');
            return '<tr><td><strong>' + UKUtils.escapeHTML(t.nama) + '</strong></td><td>' + UKUtils.escapeHTML(t.pemilik) + '</td><td>' + UKUtils.escapeHTML(t.jenis) + '</td><td style="text-transform:uppercase">' + UKUtils.escapeHTML(t.paket) + '</td><td>' + UKUtils.escapeHTML(UKUtils.tanggalIndo(t.dibuatPada)) + '</td><td><span class="status ' + stCls + '">' + UKUtils.escapeHTML(t.status) + '</span></td></tr>';
          }).join('') + '</tbody>' +
        '</table></div>' +
      '</section>';

    el.querySelector('#adm-go-umkm').addEventListener('click', function () {
      activeMenu = 'umkm';
      renderShell();
    });
  }

  function renderUmkm(el) {
    var tenants = db.tenants.list();
    var plans = db.plans.list();
    var q = umkmState.search.trim().toLowerCase();

    var filtered = tenants.filter(function (t) {
      if (umkmState.status !== 'semua' && t.status !== umkmState.status) return false;
      if (umkmState.paket !== 'semua' && t.paket !== umkmState.paket) return false;
      if (q && (t.nama + ' ' + t.pemilik + ' ' + t.email + ' ' + t.jenis).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });

    filtered.sort(function (a, b) {
      if (umkmState.sort === 'nama') return String(a.nama).localeCompare(String(b.nama), 'id');
      if (umkmState.sort === 'terlama') return new Date(a.dibuatPada) - new Date(b.dibuatPada);
      return new Date(b.dibuatPada) - new Date(a.dibuatPada);
    });

    var totalPages = Math.max(1, Math.ceil(filtered.length / umkmState.perPage));
    if (umkmState.page > totalPages) umkmState.page = totalPages;
    var start = (umkmState.page - 1) * umkmState.perPage;
    var paged = filtered.slice(start, start + umkmState.perPage);

    var pgBtns = '';
    for (var p = 1; p <= totalPages; p++) {
      pgBtns += '<button type="button" class="page-btn ' + (p === umkmState.page ? 'active' : '') + '" data-pg="' + p + '">' + p + '</button>';
    }

    el.innerHTML =
      '<div class="page-header">' +
        '<div><h1 class="page-title">Akun UMKM</h1><p class="page-subtitle">Kelola akun bisnis, status verifikasi, penangguhan, dan paket langganan.</p></div>' +
        '<button type="button" class="btn btn-light" id="adm-umkm-csv">Ekspor CSV</button>' +
      '</div>' +
      '<div class="panel">' +
        '<div class="toolbar">' +
          '<div class="toolbar-group">' +
            '<input type="search" id="adm-umkm-q" class="uk-input" placeholder="Cari usaha, pemilik, email..." value="' + UKUtils.escapeHTML(umkmState.search) + '" style="width:220px" />' +
            '<select id="adm-umkm-st" class="uk-select" style="width:auto">' +
              '<option value="semua"' + (umkmState.status === 'semua' ? ' selected' : '') + '>Semua Status</option>' +
              '<option value="Aktif"' + (umkmState.status === 'Aktif' ? ' selected' : '') + '>Aktif</option>' +
              '<option value="Ditangguhkan"' + (umkmState.status === 'Ditangguhkan' ? ' selected' : '') + '>Ditangguhkan</option>' +
              '<option value="Menunggu verifikasi"' + (umkmState.status === 'Menunggu verifikasi' ? ' selected' : '') + '>Menunggu verifikasi</option>' +
            '</select>' +
            '<select id="adm-umkm-pk" class="uk-select" style="width:auto">' +
              '<option value="semua">Semua Paket</option>' +
              plans.map(function (pl) {
                return '<option value="' + UKUtils.escapeHTML(pl.id) + '"' + (umkmState.paket === pl.id ? ' selected' : '') + '>' + UKUtils.escapeHTML(pl.nama) + '</option>';
              }).join('') +
            '</select>' +
            '<select id="adm-umkm-sort" class="uk-select" style="width:auto">' +
              '<option value="terbaru"' + (umkmState.sort === 'terbaru' ? ' selected' : '') + '>Terbaru</option>' +
              '<option value="terlama"' + (umkmState.sort === 'terlama' ? ' selected' : '') + '>Terlama</option>' +
              '<option value="nama"' + (umkmState.sort === 'nama' ? ' selected' : '') + '>Nama A–Z</option>' +
            '</select>' +
          '</div>' +
        '</div>' +

        '<div class="table-wrap"><table class="uk-table">' +
          '<thead><tr><th>Usaha</th><th>Pemilik</th><th>Kategori</th><th>Paket</th><th>Tgl Daftar</th><th>Status</th><th>Katalog</th><th style="text-align:right">Aksi</th></tr></thead>' +
          '<tbody>' + (paged.length ? paged.map(function (t) {
            var stCls = t.status === 'Aktif' ? 'success' : (t.status === 'Ditangguhkan' ? 'danger' : 'pending');
            var isSusp = t.status === 'Ditangguhkan';
            return '<tr>' +
              '<td><strong>' + UKUtils.escapeHTML(t.nama) + '</strong><div style="font-size:11px;color:var(--muted)">' + UKUtils.escapeHTML(t.email) + '</div></td>' +
              '<td>' + UKUtils.escapeHTML(t.pemilik) + '</td>' +
              '<td>' + UKUtils.escapeHTML(t.jenis) + '</td>' +
              '<td style="text-transform:uppercase;font-weight:700">' + UKUtils.escapeHTML(t.paket) + '</td>' +
              '<td>' + UKUtils.escapeHTML(UKUtils.tanggalIndo(t.dibuatPada)) + '</td>' +
              '<td><span class="status ' + stCls + '">' + UKUtils.escapeHTML(t.status) + '</span></td>' +
              '<td>' + (t.katalogAktif && !isSusp ? '<a href="../toko/index.html?u=' + encodeURIComponent(t.slug) + '" target="_blank" rel="noopener" style="color:var(--orange-dark);font-weight:600">Aktif</a>' : '<span style="color:var(--muted)">Nonaktif</span>') + '</td>' +
              '<td style="text-align:right;white-space:nowrap">' +
                '<button type="button" class="btn btn-light btn-sm u-det" data-id="' + UKUtils.escapeHTML(t.id) + '">Detail</button> ' +
                '<button type="button" class="btn btn-light btn-sm u-pkg" data-id="' + UKUtils.escapeHTML(t.id) + '">Paket</button> ' +
                '<button type="button" class="btn ' + (isSusp ? 'btn-primary' : 'btn-danger') + ' btn-sm u-tog" data-id="' + UKUtils.escapeHTML(t.id) + '">' + (isSusp ? 'Aktifkan' : 'Tangguhkan') + '</button>' +
              '</td>' +
            '</tr>';
          }).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">Tidak ada UMKM ditemukan.</td></tr>') + '</tbody>' +
        '</table></div>' +

        '<div class="pagination">' +
          '<span>Menampilkan ' + (filtered.length ? start + 1 : 0) + '–' + Math.min(start + umkmState.perPage, filtered.length) + ' dari ' + filtered.length + ' UMKM</span>' +
          '<div class="pagination-pages">' +
            '<button type="button" class="page-btn" data-pg="' + (umkmState.page - 1) + '"' + (umkmState.page <= 1 ? ' disabled' : '') + '>&lsaquo;</button>' +
            pgBtns +
            '<button type="button" class="page-btn" data-pg="' + (umkmState.page + 1) + '"' + (umkmState.page >= totalPages ? ' disabled' : '') + '>&rsaquo;</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var qInp = el.querySelector('#adm-umkm-q');
    qInp.addEventListener('input', UKUtils.debounce(function () {
      umkmState.search = qInp.value;
      umkmState.page = 1;
      renderUmkm(el);
      var n = el.querySelector('#adm-umkm-q');
      if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
    }, 220));
    el.querySelector('#adm-umkm-st').addEventListener('change', function () { umkmState.status = this.value; umkmState.page = 1; renderUmkm(el); });
    el.querySelector('#adm-umkm-pk').addEventListener('change', function () { umkmState.paket = this.value; umkmState.page = 1; renderUmkm(el); });
    el.querySelector('#adm-umkm-sort').addEventListener('change', function () { umkmState.sort = this.value; umkmState.page = 1; renderUmkm(el); });

    el.querySelectorAll('[data-pg]').forEach(function (b) {
      b.addEventListener('click', function () { if (!b.disabled) { umkmState.page = Number(b.getAttribute('data-pg')); renderUmkm(el); } });
    });

    el.querySelectorAll('.u-det').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = db.tenants.get(b.getAttribute('data-id'));
        if (!t) return;
        var modalId = 'adm-u-det';
        var m = UKUtils.openModal({
          id: modalId,
          title: 'Detail UMKM — ' + t.nama,
          bodyHTML:
            '<div style="display:grid;gap:8px;font-size:13px">' +
              '<div><strong>Pemilik:</strong> ' + UKUtils.escapeHTML(t.pemilik) + '</div>' +
              '<div><strong>Email:</strong> ' + UKUtils.escapeHTML(t.email) + '</div>' +
              '<div><strong>WhatsApp:</strong> +' + UKUtils.escapeHTML(t.wa) + '</div>' +
              '<div><strong>Jenis Usaha:</strong> ' + UKUtils.escapeHTML(t.jenis) + '</div>' +
              '<div><strong>Alamat:</strong> ' + UKUtils.escapeHTML(t.alamat) + '</div>' +
              '<div><strong>Slug Katalog:</strong> <code>' + UKUtils.escapeHTML(t.slug) + '</code> (Klik WA: ' + Number(t.waClicks || 0) + ')</div>' +
              '<div><strong>Status:</strong> ' + UKUtils.escapeHTML(t.status) + ' · <strong>Paket:</strong> ' + UKUtils.escapeHTML(t.paket).toUpperCase() + '</div>' +
            '</div>',
          footerHTML: (t.status === 'Menunggu verifikasi' ? '<button type="button" class="btn btn-primary" id="adm-verify-btn">Verifikasi &amp; Aktifkan</button>' : '') +
            '<button type="button" class="btn btn-light" data-close-det>Tutup</button>'
        });
        m.querySelector('[data-close-det]').addEventListener('click', function () { UKUtils.closeModal(modalId); });
        var vb = m.querySelector('#adm-verify-btn');
        if (vb) {
          vb.addEventListener('click', function () {
            db.tenants.update(t.id, { status: 'Aktif', katalogAktif: true });
            db.systemLogs.create({ level: 'info', pesan: 'Akun ' + t.nama + ' diverifikasi oleh admin.' });
            UKUtils.closeModal(modalId);
            UKUtils.toast('UMKM diverifikasi dan diaktifkan.', 'success');
            renderShell();
          });
        }
      });
    });

    el.querySelectorAll('.u-pkg').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = db.tenants.get(b.getAttribute('data-id'));
        if (!t) return;
        var modalId = 'adm-u-pkg';
        var m = UKUtils.openModal({
          id: modalId,
          size: 'sm',
          title: 'Ubah Paket — ' + t.nama,
          bodyHTML: '<div class="field" style="margin-bottom:0"><label for="adm-new-pkg">Pilih Paket</label><select id="adm-new-pkg">' +
            plans.map(function (pl) { return '<option value="' + UKUtils.escapeHTML(pl.id) + '"' + (t.paket === pl.id ? ' selected' : '') + '>' + UKUtils.escapeHTML(pl.nama) + ' (' + UKUtils.rupiah(pl.harga) + ')</option>'; }).join('') +
            '</select></div>',
          footerHTML: '<button type="button" class="btn btn-light" data-c>Batal</button><button type="button" class="btn btn-primary" data-s>Simpan</button>'
        });
        m.querySelector('[data-c]').addEventListener('click', function () { UKUtils.closeModal(modalId); });
        m.querySelector('[data-s]').addEventListener('click', function () {
          var nextPkg = m.querySelector('#adm-new-pkg').value;
          db.tenants.update(t.id, { paket: nextPkg });
          db.systemLogs.create({ level: 'info', pesan: 'Paket ' + t.nama + ' diubah menjadi ' + nextPkg.toUpperCase() + '.' });
          UKUtils.closeModal(modalId);
          UKUtils.toast('Paket UMKM diperbarui.', 'success');
          renderUmkm(el);
        });
      });
    });

    el.querySelectorAll('.u-tog').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = db.tenants.get(b.getAttribute('data-id'));
        if (!t) return;
        var willSuspend = t.status !== 'Ditangguhkan';
        UKUtils.confirmDialog(
          (willSuspend ? 'Tangguhkan akun "' : 'Aktifkan kembali akun "') + t.nama + '"?',
          {
            subtitle: willSuspend ? 'Pemilik tidak akan dapat login dan katalog publik menjadi nonaktif.' : 'Pemilik dapat kembali masuk dan katalog diaktifkan.',
            confirmText: willSuspend ? 'Ya, Tangguhkan' : 'Ya, Aktifkan',
            danger: willSuspend
          }
        ).then(function (ok) {
          if (!ok) return;
          db.tenants.update(t.id, { status: willSuspend ? 'Ditangguhkan' : 'Aktif', katalogAktif: !willSuspend });
          db.systemLogs.create({ level: willSuspend ? 'peringatan' : 'info', pesan: 'Tenant ' + t.nama + (willSuspend ? ' ditangguhkan' : ' diaktifkan kembali') + ' oleh admin.' });
          UKUtils.toast(willSuspend ? 'Tenant ditangguhkan.' : 'Tenant diaktifkan.', 'success');
          renderShell();
        });
      });
    });

    el.querySelector('#adm-umkm-csv').addEventListener('click', function () {
      var rows = [['Nama Usaha', 'Pemilik', 'Email', 'Kategori', 'Paket', 'Tanggal Daftar', 'Status']];
      filtered.forEach(function (t) {
        rows.push([t.nama, t.pemilik, t.email, t.jenis, t.paket, UKUtils.tanggalIndo(t.dibuatPada), t.status]);
      });
      UKUtils.downloadCSV('daftar-umkm-usahakita.csv', rows);
    });
  }

  function renderPaket(el) {
    var plans = db.plans.list();
    var tenants = db.tenants.list();
    el.innerHTML =
      '<div class="page-header"><div><h1 class="page-title">Paket Langganan</h1><p class="page-subtitle">Ubah harga dan batas kuota paket. Perubahan langsung sinkron ke landing page dan pengaturan pemilik.</p></div></div>' +
      '<div class="banner info"><span><strong>Catatan:</strong> Harga dan batas penggunaan masih draf, ditentukan setelah validasi pasar.</span></div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px">' +
        plans.map(function (p) {
          var subCount = tenants.filter(function (t) { return t.paket === p.id; }).length;
          return (
            '<form class="card adm-plan-form" data-pid="' + UKUtils.escapeHTML(p.id) + '">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
                '<strong style="font-size:17px">' + UKUtils.escapeHTML(p.nama) + '</strong>' +
                '<span class="status neutral">' + subCount + ' pelanggan</span>' +
              '</div>' +
              '<div class="field"><label>Harga Bulanan (Rp)</label><input type="number" class="pl-harga" min="0" value="' + Number(p.harga || 0) + '" required /></div>' +
              '<div class="form-grid-2">' +
                '<div class="field"><label>Batas Produk</label><input type="number" class="pl-prod" min="1" value="' + Number(p.batas.produk || 1) + '" required /></div>' +
                '<div class="field"><label>Batas Pengguna</label><input type="number" class="pl-usr" min="1" value="' + Number(p.batas.pengguna || 1) + '" required /></div>' +
              '</div>' +
              '<div class="field"><label>Batas Cabang</label><input type="number" class="pl-cab" min="1" value="' + Number(p.batas.cabang || 1) + '" required /></div>' +
              '<button type="submit" class="btn btn-primary" style="width:100%">Simpan Paket ' + UKUtils.escapeHTML(p.nama) + '</button>' +
            '</form>'
          );
        }).join('') +
      '</div>';

    el.querySelectorAll('.adm-plan-form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var pid = form.getAttribute('data-pid');
        var harga = Math.max(0, Number(form.querySelector('.pl-harga').value));
        var prod = Math.max(1, Math.floor(Number(form.querySelector('.pl-prod').value)));
        var usr = Math.max(1, Math.floor(Number(form.querySelector('.pl-usr').value)));
        var cab = Math.max(1, Math.floor(Number(form.querySelector('.pl-cab').value)));
        if (isNaN(harga) || isNaN(prod) || isNaN(usr) || isNaN(cab)) {
          UKUtils.toast('Masukkan nilai angka yang valid.', 'error');
          return;
        }
        db.plans.update(pid, { harga: harga, batas: { produk: prod, pengguna: usr, cabang: cab } });
        UKUtils.toast('Paket berhasil diperbarui.', 'success');
        renderPaket(el);
      });
    });
  }

  function renderKategori(el) {
    var cats = db.businessCategories.list(false);
    var tenants = db.tenants.list();

    el.innerHTML =
      '<div class="page-header"><div><h1 class="page-title">Kategori Bisnis</h1><p class="page-subtitle">Daftar ini tampil pada formulir pendaftaran UMKM dan pengaturan profil usaha.</p></div></div>' +
      '<div class="panel">' +
        '<form id="adm-bc-add" style="display:flex;gap:8px;max-width:440px;margin-bottom:16px">' +
          '<input type="text" id="adm-bc-name" class="uk-input" placeholder="Tambah kategori bisnis baru..." required />' +
          '<button type="submit" class="btn btn-primary">Tambah</button>' +
        '</form>' +
        '<div class="table-wrap"><table class="uk-table">' +
          '<thead><tr><th>Nama Kategori</th><th class="num">Jumlah UMKM</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead>' +
          '<tbody>' + cats.map(function (c) {
            var used = tenants.filter(function (t) { return t.jenis === c.nama; }).length;
            return '<tr>' +
              '<td><input type="text" class="uk-input bc-edit-inp" data-id="' + UKUtils.escapeHTML(c.id) + '" value="' + UKUtils.escapeHTML(c.nama) + '" style="max-width:260px;padding:6px 9px" /></td>' +
              '<td class="num">' + used + '</td>' +
              '<td><span class="status ' + (c.aktif ? 'success' : 'neutral') + '">' + (c.aktif ? 'Aktif' : 'Nonaktif') + '</span></td>' +
              '<td style="text-align:right;white-space:nowrap">' +
                '<button type="button" class="btn btn-light btn-sm bc-save" data-id="' + UKUtils.escapeHTML(c.id) + '">Simpan</button> ' +
                '<button type="button" class="btn btn-light btn-sm bc-tog" data-id="' + UKUtils.escapeHTML(c.id) + '">' + (c.aktif ? 'Nonaktifkan' : 'Aktifkan') + '</button> ' +
                '<button type="button" class="btn btn-ghost btn-sm bc-del" data-id="' + UKUtils.escapeHTML(c.id) + '" style="color:var(--red)">Hapus</button>' +
              '</td>' +
            '</tr>';
          }).join('') + '</tbody>' +
        '</table></div>' +
      '</div>';

    el.querySelector('#adm-bc-add').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = UKUtils.cleanSpaces(el.querySelector('#adm-bc-name').value);
      if (!name) { UKUtils.toast('Nama kategori wajib diisi.', 'error'); return; }
      if (cats.some(function (c) { return c.nama.toLowerCase() === name.toLowerCase(); })) {
        UKUtils.toast('Kategori sudah ada.', 'error');
        return;
      }
      db.businessCategories.create({ nama: name, aktif: true });
      UKUtils.toast('Kategori bisnis ditambahkan.', 'success');
      renderKategori(el);
    });

    el.querySelectorAll('.bc-save').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-id');
        var val = UKUtils.cleanSpaces(el.querySelector('.bc-edit-inp[data-id="' + id + '"]').value);
        if (!val) { UKUtils.toast('Nama kategori tidak boleh kosong.', 'error'); return; }
        if (cats.some(function (c) { return c.id !== id && c.nama.toLowerCase() === val.toLowerCase(); })) {
          UKUtils.toast('Nama kategori duplikat.', 'error');
          return;
        }
        db.businessCategories.update(id, { nama: val });
        UKUtils.toast('Kategori diperbarui.', 'success');
        renderKategori(el);
      });
    });

    el.querySelectorAll('.bc-tog').forEach(function (b) {
      b.addEventListener('click', function () {
        var cat = db.businessCategories.get(b.getAttribute('data-id'));
        if (!cat) return;
        db.businessCategories.update(cat.id, { aktif: !cat.aktif });
        UKUtils.toast('Status kategori diperbarui.', 'success');
        renderKategori(el);
      });
    });

    el.querySelectorAll('.bc-del').forEach(function (b) {
      b.addEventListener('click', function () {
        var cat = db.businessCategories.get(b.getAttribute('data-id'));
        if (!cat) return;
        var used = tenants.some(function (t) { return t.jenis === cat.nama; });
        if (used) {
          UKUtils.toast('Kategori masih digunakan oleh UMKM. Silakan nonaktifkan saja.', 'warning');
          return;
        }
        db.businessCategories.remove(cat.id);
        UKUtils.toast('Kategori dihapus.', 'success');
        renderKategori(el);
      });
    });
  }

  function renderPemantauan(el) {
    var logs = db.systemLogs.list(monState.logFilter);
    var pts = monState.points;
    var w = 560, h = 110, maxV = Math.max.apply(null, pts.concat([200]));
    var poly = pts.map(function (v, i) {
      var x = 12 + (i / (pts.length - 1)) * (w - 24);
      var y = 92 - (v / maxV) * 76;
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');

    el.innerHTML =
      '<div class="page-header">' +
        '<div><h1 class="page-title">Pemantauan Sistem</h1><p class="page-subtitle">Status layanan dan log aktivitas platform (simulasi prototype).</p></div>' +
        '<button type="button" class="btn btn-primary" id="adm-mon-refresh">Segarkan Metrik</button>' +
      '</div>' +

      '<div class="stats-grid" style="margin-bottom:16px">' +
        '<div class="stat-card"><div class="stat-label">Uptime (Target 99,5%)</div><div class="stat-value" style="color:var(--green)">' + UKUtils.escapeHTML(monState.uptime) + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">Waktu Respons Rata-rata</div><div class="stat-value">' + monState.respMs + ' ms</div></div>' +
        '<div class="stat-card"><div class="stat-label">Penyimpanan Terpakai</div><div class="stat-value">' + monState.storagePct + '%</div></div>' +
        '<div class="stat-card"><div class="stat-label">Status Backup</div><div class="stat-value" style="font-size:15px">' + UKUtils.escapeHTML(monState.backupTime) + '</div></div>' +
      '</div>' +

      '<div class="adm-grid-2">' +
        '<section class="panel"><h2 class="panel-title" style="margin-bottom:10px">Status Layanan</h2>' +
          monState.services.map(function (s) {
            return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)"><span>' + UKUtils.escapeHTML(s.nama) + '</span><span class="status ' + s.cls + '">' + UKUtils.escapeHTML(s.status) + '</span></div>';
          }).join('') +
        '</section>' +
        '<section class="panel"><h2 class="panel-title" style="margin-bottom:10px">Latensi 24 Jam (ms)</h2>' +
          '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto"><polyline fill="none" stroke="#15966b" stroke-width="2.5" points="' + poly + '"/></svg>' +
        '</section>' +
      '</div>' +

      '<section class="panel" style="margin-top:16px">' +
        '<div class="panel-header"><h2 class="panel-title">Log Sistem</h2>' +
          '<select id="adm-log-filter" class="uk-select" style="width:auto">' +
            '<option value="semua"' + (monState.logFilter === 'semua' ? ' selected' : '') + '>Semua Level</option>' +
            '<option value="info"' + (monState.logFilter === 'info' ? ' selected' : '') + '>Info</option>' +
            '<option value="peringatan"' + (monState.logFilter === 'peringatan' ? ' selected' : '') + '>Peringatan</option>' +
            '<option value="error"' + (monState.logFilter === 'error' ? ' selected' : '') + '>Error</option>' +
          '</select>' +
        '</div>' +
        '<div class="table-wrap"><table class="uk-table">' +
          '<thead><tr><th>Waktu</th><th>Level</th><th>Pesan</th></tr></thead>' +
          '<tbody>' + logs.map(function (l) {
            var cls = l.level === 'error' ? 'danger' : (l.level === 'peringatan' ? 'pending' : 'neutral');
            return '<tr><td>' + UKUtils.escapeHTML(UKUtils.tanggalIndo(l.waktu, true)) + '</td><td><span class="status ' + cls + '">' + UKUtils.escapeHTML(l.level) + '</span></td><td>' + UKUtils.escapeHTML(l.pesan) + '</td></tr>';
          }).join('') + '</tbody>' +
        '</table></div>' +
      '</section>';

    el.querySelector('#adm-log-filter').addEventListener('change', function () {
      monState.logFilter = this.value;
      renderPemantauan(el);
    });
    el.querySelector('#adm-mon-refresh').addEventListener('click', function () {
      monState.respMs = 105 + Math.floor(Math.random() * 85);
      monState.storagePct = 35 + Math.floor(Math.random() * 12);
      monState.uptime = (99.85 + Math.random() * 0.14).toFixed(2).replace('.', ',') + '%';
      monState.points = monState.points.map(function () { return 100 + Math.floor(Math.random() * 90); });
      var randWarn = Math.random() > 0.72;
      monState.services[2] = randWarn ? { nama: 'Penyimpanan Gambar', status: 'Lambat', cls: 'pending' } : { nama: 'Penyimpanan Gambar', status: 'Normal', cls: 'success' };
      UKUtils.toast('Metrik pemantauan disegarkan.', 'info');
      renderPemantauan(el);
    });
  }

  function renderLaporan(el) {
    var tenants = db.tenants.list();
    var plans = db.plans.list();
    var metrics = db.adminMetrics();
    var priceMap = {};
    plans.forEach(function (p) { priceMap[p.id] = Number(p.harga) || 0; });

    var daysLimit = reportPeriod === '7hari' ? 7 : (reportPeriod === '30hari' ? 30 : (reportPeriod === 'bulan_ini' ? new Date().getDate() : 3650));
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysLimit);

    var regTenants = tenants.filter(function (t) { return new Date(t.dibuatPada) >= cutoff; });
    var trxs = metrics.transactionsSummary.filter(function (t) { return new Date(t.waktu) >= cutoff; });
    var trxTotalVal = trxs.reduce(function (s, t) { return s + (Number(t.total) || 0); }, 0);
    var subsRev = tenants.filter(function (t) { return t.status === 'Aktif'; }).reduce(function (s, t) { return s + (priceMap[t.paket] || 0); }, 0);

    el.innerHTML =
      '<div class="page-header">' +
        '<div><h1 class="page-title">Laporan Platform</h1><p class="page-subtitle">Ringkasan pendaftaran UMKM, transaksi ekosistem, dan pendapatan langganan.</p></div>' +
        '<div class="no-print" style="display:flex;gap:8px">' +
          '<button type="button" class="btn btn-light" id="adm-rep-csv">Ekspor CSV</button>' +
          '<button type="button" class="btn btn-primary" id="adm-rep-print">Cetak / PDF</button>' +
        '</div>' +
      '</div>' +

      '<div class="panel">' +
        '<div class="toolbar no-print">' +
          '<select id="adm-rep-period" class="uk-select" style="width:auto">' +
            '<option value="7hari"' + (reportPeriod === '7hari' ? ' selected' : '') + '>7 Hari Terakhir</option>' +
            '<option value="30hari"' + (reportPeriod === '30hari' ? ' selected' : '') + '>30 Hari Terakhir</option>' +
            '<option value="bulan_ini"' + (reportPeriod === 'bulan_ini' ? ' selected' : '') + '>Bulan Ini</option>' +
            '<option value="semua"' + (reportPeriod === 'semua' ? ' selected' : '') + '>Sepanjang Waktu</option>' +
          '</select>' +
        '</div>' +

        '<div class="stats-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:16px">' +
          '<div class="stat-card"><div class="stat-label">Pendaftaran UMKM Baru</div><div class="stat-value">' + regTenants.length + '</div></div>' +
          '<div class="stat-card"><div class="stat-label">Transaksi Diproses</div><div class="stat-value">' + trxs.length + '</div><div class="stat-meta">' + UKUtils.escapeHTML(UKUtils.rupiah(trxTotalVal)) + '</div></div>' +
          '<div class="stat-card"><div class="stat-label">Estimasi Pendapatan Langganan</div><div class="stat-value">' + UKUtils.escapeHTML(UKUtils.rupiah(subsRev)) + '</div></div>' +
        '</div>' +

        '<div class="table-wrap"><table class="uk-table">' +
          '<thead><tr><th>UMKM Terdaftar pada Periode</th><th>Jenis</th><th>Paket</th><th>Tanggal Daftar</th><th>Status</th></tr></thead>' +
          '<tbody>' + (regTenants.length ? regTenants.map(function (t) {
            return '<tr><td><strong>' + UKUtils.escapeHTML(t.nama) + '</strong></td><td>' + UKUtils.escapeHTML(t.jenis) + '</td><td style="text-transform:uppercase">' + UKUtils.escapeHTML(t.paket) + '</td><td>' + UKUtils.escapeHTML(UKUtils.tanggalIndo(t.dibuatPada)) + '</td><td>' + UKUtils.escapeHTML(t.status) + '</td></tr>';
          }).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">Belum ada pendaftaran pada periode ini.</td></tr>') + '</tbody>' +
        '</table></div>' +
      '</div>';

    el.querySelector('#adm-rep-period').addEventListener('change', function () { reportPeriod = this.value; renderLaporan(el); });
    el.querySelector('#adm-rep-csv').addEventListener('click', function () {
      var rows = [['Nama UMKM', 'Jenis', 'Paket', 'Tanggal Daftar', 'Status']];
      regTenants.forEach(function (t) { rows.push([t.nama, t.jenis, t.paket, UKUtils.tanggalIndo(t.dibuatPada), t.status]); });
      UKUtils.downloadCSV('laporan-platform-' + reportPeriod + '.csv', rows);
    });
    el.querySelector('#adm-rep-print').addEventListener('click', function () {
      document.body.classList.add('uk-printing-report');
      try { window.print(); } finally {
        setTimeout(function () { document.body.classList.remove('uk-printing-report'); }, 300);
      }
    });
  }

  function renderDukungan(el) {
    var tickets = db.tickets.listAllPlatform();
    var tenants = db.tenants.list();
    var tMap = {};
    tenants.forEach(function (t) { tMap[t.id] = t.nama; });

    var filtered = tickets.filter(function (tk) {
      if (ticketState.status !== 'semua' && tk.status !== ticketState.status) return false;
      if (ticketState.prioritas !== 'semua' && tk.prioritas !== ticketState.prioritas) return false;
      return true;
    });

    if (!ticketState.activeId && filtered.length) ticketState.activeId = filtered[0].id;
    var active = tickets.find(function (tk) { return tk.id === ticketState.activeId; }) || null;

    el.innerHTML =
      '<div class="page-header"><div><h1 class="page-title">Dukungan Pengguna</h1><p class="page-subtitle">Tanggapi pertanyaan dan kendala dari pemilik UMKM.</p></div></div>' +
      '<div class="panel">' +
        '<div class="toolbar">' +
          '<div class="toolbar-group">' +
            '<select id="tkt-st" class="uk-select" style="width:auto">' +
              '<option value="semua"' + (ticketState.status === 'semua' ? ' selected' : '') + '>Semua Status</option>' +
              '<option value="Baru"' + (ticketState.status === 'Baru' ? ' selected' : '') + '>Baru</option>' +
              '<option value="Diproses"' + (ticketState.status === 'Diproses' ? ' selected' : '') + '>Diproses</option>' +
              '<option value="Selesai"' + (ticketState.status === 'Selesai' ? ' selected' : '') + '>Selesai</option>' +
            '</select>' +
            '<select id="tkt-pr" class="uk-select" style="width:auto">' +
              '<option value="semua"' + (ticketState.prioritas === 'semua' ? ' selected' : '') + '>Semua Prioritas</option>' +
              '<option value="Tinggi"' + (ticketState.prioritas === 'Tinggi' ? ' selected' : '') + '>Tinggi</option>' +
              '<option value="Sedang"' + (ticketState.prioritas === 'Sedang' ? ' selected' : '') + '>Sedang</option>' +
              '<option value="Rendah"' + (ticketState.prioritas === 'Rendah' ? ' selected' : '') + '>Rendah</option>' +
            '</select>' +
          '</div>' +
        '</div>' +

        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">' +
          '<div style="border:1px solid var(--line);border-radius:12px;overflow:hidden">' +
            (filtered.length ? filtered.map(function (tk) {
              var isAct = active && active.id === tk.id;
              var cls = tk.status === 'Selesai' ? 'success' : (tk.status === 'Diproses' ? 'pending' : 'danger');
              return '<button type="button" class="tkt-pick" data-id="' + UKUtils.escapeHTML(tk.id) + '" style="width:100%;text-align:left;padding:12px;border:none;border-bottom:1px solid var(--line);background:' + (isAct ? 'var(--orange-soft)' : '#fff') + ';cursor:pointer">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><strong>' + UKUtils.escapeHTML(tk.id) + ' · ' + UKUtils.escapeHTML(tMap[tk.tenantId] || tk.tenantId) + '</strong><span class="status ' + cls + '">' + UKUtils.escapeHTML(tk.status) + '</span></div>' +
                '<div style="font-size:12.5px">' + UKUtils.escapeHTML(tk.subjek) + '</div>' +
                '<div style="font-size:11px;color:var(--muted);margin-top:3px">Prioritas: ' + UKUtils.escapeHTML(tk.prioritas) + '</div>' +
              '</button>';
            }).join('') : '<div class="empty-note">Tidak ada tiket sesuai filter.</div>') +
          '</div>' +

          '<div style="border:1px solid var(--line);border-radius:12px;padding:14px">' +
            (active ? (
              '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding-bottom:10px;border-bottom:1px solid var(--line);margin-bottom:12px">' +
                '<div><strong>' + UKUtils.escapeHTML(active.subjek) + '</strong><div style="font-size:11.5px;color:var(--muted)">' + UKUtils.escapeHTML(tMap[active.tenantId] || '') + '</div></div>' +
                '<select id="tkt-chg-st" class="uk-select" style="width:auto">' +
                  ['Baru', 'Diproses', 'Selesai'].map(function (s) { return '<option value="' + s + '"' + (active.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
                '</select>' +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;margin-bottom:12px">' +
                (active.pesan || []).map(function (m) {
                  var isAdm = m.dari === 'admin';
                  return '<div style="padding:8px 11px;border-radius:10px;background:' + (isAdm ? 'var(--navy)' : '#f2f4f8') + ';color:' + (isAdm ? '#fff' : 'var(--ink)') + ';font-size:12.5px">' +
                    '<div style="font-size:10.5px;opacity:0.75;margin-bottom:2px">' + (isAdm ? 'Admin UsahaKita' : 'Pemilik UMKM') + ' · ' + UKUtils.escapeHTML(UKUtils.tanggalIndo(m.waktu, true)) + '</div>' +
                    UKUtils.escapeHTML(m.teks) +
                  '</div>';
                }).join('') +
              '</div>' +
              '<form id="tkt-reply-form" style="display:flex;gap:8px">' +
                '<input type="text" id="tkt-reply-txt" class="uk-input" placeholder="Tulis balasan admin..." required />' +
                '<button type="submit" class="btn btn-primary">Balas</button>' +
              '</form>'
            ) : '<div class="empty-note">Pilih tiket untuk melihat detail.</div>') +
          '</div>' +
        '</div>' +
      '</div>';

    el.querySelector('#tkt-st').addEventListener('change', function () { ticketState.status = this.value; renderDukungan(el); });
    el.querySelector('#tkt-pr').addEventListener('change', function () { ticketState.prioritas = this.value; renderDukungan(el); });
    el.querySelectorAll('.tkt-pick').forEach(function (b) {
      b.addEventListener('click', function () { ticketState.activeId = b.getAttribute('data-id'); renderDukungan(el); });
    });
    if (active) {
      el.querySelector('#tkt-chg-st').addEventListener('change', function () {
        db.tickets.updateAdmin(active.id, { status: this.value });
        UKUtils.toast('Status tiket diperbarui.', 'success');
        renderShell();
      });
      el.querySelector('#tkt-reply-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var txt = UKUtils.cleanSpaces(el.querySelector('#tkt-reply-txt').value);
        if (!txt) return;
        var nextMsgs = (active.pesan || []).slice();
        nextMsgs.push({ dari: 'admin', teks: txt, waktu: new Date().toISOString() });
        db.tickets.updateAdmin(active.id, { pesan: nextMsgs, status: active.status === 'Baru' ? 'Diproses' : active.status });
        UKUtils.toast('Balasan terkirim.', 'success');
        renderDukungan(el);
      });
    }
  }

  function renderPengaturan(el) {
    var prefs = getAdminPrefs();
    el.innerHTML =
      '<div class="page-header"><div><h1 class="page-title">Pengaturan Admin</h1><p class="page-subtitle">Profil administrator platform dan preferensi notifikasi.</p></div></div>' +
      '<div class="card" style="max-width:560px">' +
        '<h3 class="panel-title" style="margin-bottom:10px">Profil Administrator</h3>' +
        '<div style="font-size:13px;margin-bottom:14px">Nama: <strong>Admin UsahaKita</strong> · Username: <code>admin</code></div>' +
        '<button type="button" class="btn btn-light" id="adm-btn-chg-pw" style="margin-bottom:18px">Ubah Kata Sandi</button>' +
        '<h3 class="panel-title" style="margin-bottom:8px">Preferensi Notifikasi</h3>' +
        '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">' +
          '<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="prf-umkm"' + (prefs.notifNewUmkm ? ' checked' : '') + ' /> Pendaftaran UMKM baru menunggu verifikasi</label>' +
          '<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="prf-tkt"' + (prefs.notifTicket ? ' checked' : '') + ' /> Tiket dukungan baru masuk</label>' +
          '<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="prf-sys"' + (prefs.notifSystem ? ' checked' : '') + ' /> Peringatan pemantauan sistem</label>' +
        '</div>' +
        '<button type="button" class="btn btn-primary" id="adm-save-prefs">Simpan Preferensi</button>' +
      '</div>';

    el.querySelector('#adm-save-prefs').addEventListener('click', function () {
      saveAdminPrefs({
        notifNewUmkm: el.querySelector('#prf-umkm').checked,
        notifTicket: el.querySelector('#prf-tkt').checked,
        notifSystem: el.querySelector('#prf-sys').checked
      });
      UKUtils.toast('Preferensi notifikasi disimpan.', 'success');
    });

    el.querySelector('#adm-btn-chg-pw').addEventListener('click', function () {
      var modalId = 'adm-pw-modal';
      var m = UKUtils.openModal({
        id: modalId,
        size: 'sm',
        title: 'Ubah Kata Sandi Admin',
        bodyHTML:
          '<div class="field"><label for="apw-old">Sandi Lama</label><input type="password" id="apw-old" required /></div>' +
          '<div class="field"><label for="apw-new">Sandi Baru (min 6 karakter)</label><input type="password" id="apw-new" required /></div>' +
          '<div class="field" style="margin-bottom:0"><label for="apw-cf">Konfirmasi Sandi Baru</label><input type="password" id="apw-cf" required /></div>',
        footerHTML: '<button type="button" class="btn btn-light" data-c>Batal</button><button type="button" class="btn btn-primary" data-s>Simpan</button>'
      });
      m.querySelector('[data-c]').addEventListener('click', function () { UKUtils.closeModal(modalId); });
      m.querySelector('[data-s]').addEventListener('click', function () {
        var o = m.querySelector('#apw-old').value;
        var n = m.querySelector('#apw-new').value;
        var c = m.querySelector('#apw-cf').value;
        if (o !== 'admin') { UKUtils.toast('Sandi lama tidak sesuai.', 'error'); return; }
        if (n.length < 6 || n !== c) { UKUtils.toast('Sandi baru minimal 6 karakter dan harus cocok.', 'error'); return; }
        UKUtils.closeModal(modalId);
        UKUtils.toast('Validasi berhasil (di mode demo kredensial tetap admin / admin).', 'info');
      });
    });
  }

  function renderShell() {
    var session = UKAuth.currentSession('admin');
    if (!session) {
      renderLogin();
      return;
    }

    var menuList = [
      ['ringkasan', '📊', 'Ringkasan'],
      ['umkm', '🏪', 'Akun UMKM'],
      ['paket', '💳', 'Paket Langganan'],
      ['kategori', '🏷️', 'Kategori Bisnis'],
      ['pemantauan', '🖥️', 'Pemantauan Sistem'],
      ['laporan', '📈', 'Laporan Platform'],
      ['dukungan', '🎧', 'Dukungan Pengguna'],
      ['pengaturan', '⚙️', 'Pengaturan Admin']
    ];

    var pendingTenants = db.tenants.list({ status: 'Menunggu verifikasi' });
    var newTickets = db.tickets.listAllPlatform().filter(function (t) { return t.status === 'Baru'; });
    var notifTotal = pendingTenants.length + newTickets.length;

    root.innerHTML =
      '<div class="app-shell">' +
        '<div class="sidebar-overlay" id="adm-overlay"></div>' +
        '<aside class="sidebar" id="adm-sidebar">' +
          '<div class="sidebar-brand"><a href="../index.html" class="uk-logo uk-logo--light"><span class="uk-logo-mark">U</span><span class="uk-logo-text">usahakita</span></a></div>' +
          '<nav class="sidebar-nav">' +
            menuList.map(function (m) {
              var badge = (m[0] === 'dukungan' && newTickets.length) ? ('<span class="nav-badge">' + newTickets.length + '</span>') : '';
              return '<button type="button" class="nav-item ' + (activeMenu === m[0] ? 'active' : '') + '" data-adm-menu="' + m[0] + '"><span aria-hidden="true">' + m[1] + '</span><span>' + m[2] + '</span>' + badge + '</button>';
            }).join('') +
          '</nav>' +
          '<div class="sidebar-footer"><button type="button" class="nav-item" id="adm-logout"><span aria-hidden="true">🚪</span><span>Keluar</span></button></div>' +
        '</aside>' +
        '<div class="app-main">' +
          '<header class="topbar">' +
            '<div class="topbar-left">' +
              '<button type="button" class="btn btn-light btn-icon mobile-menu-btn" id="adm-burger" aria-label="Buka menu admin">&#9776;</button>' +
              '<div class="topbar-breadcrumb">Admin Platform / ' + UKUtils.escapeHTML(menuList.find(function (m) { return m[0] === activeMenu; })[2]) + '</div>' +
            '</div>' +
            '<div class="topbar-right">' +
              '<form class="topbar-search" id="adm-gsearch-form"><input type="search" id="adm-gsearch" placeholder="Cari UMKM..." aria-label="Cari UMKM" /></form>' +
              '<div class="adm-notif-wrap">' +
                '<button type="button" class="btn btn-light btn-icon" id="adm-notif-btn" aria-label="Notifikasi admin">' +
                  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
                  (notifTotal > 0 ? '<span class="adm-notif-dot">' + notifTotal + '</span>' : '') +
                '</button>' +
                '<div class="adm-notif-pop" id="adm-notif-pop">' +
                  '<div style="padding:10px 14px;border-bottom:1px solid var(--line);font-weight:700;font-size:12.5px">Notifikasi Platform</div>' +
                  (notifTotal ? (
                    pendingTenants.map(function (t) { return '<div style="padding:9px 14px;border-bottom:1px solid var(--line);font-size:12px"><strong>Menunggu verifikasi:</strong> ' + UKUtils.escapeHTML(t.nama) + '</div>'; }).join('') +
                    newTickets.map(function (tk) { return '<div style="padding:9px 14px;border-bottom:1px solid var(--line);font-size:12px"><strong>Tiket Baru:</strong> ' + UKUtils.escapeHTML(tk.subjek) + '</div>'; }).join('')
                  ) : '<div style="padding:14px;color:var(--muted);font-size:12px">Tidak ada notifikasi baru.</div>') +
                '</div>' +
              '</div>' +
              '<div class="avatar-pill"><span class="avatar-circle">A</span><div class="avatar-meta"><div style="font-size:12px;font-weight:700">Admin</div><div style="font-size:10.5px;color:var(--muted)">Platform</div></div></div>' +
            '</div>' +
          '</header>' +
          '<main class="app-content" id="adm-content"></main>' +
        '</div>' +
      '</div>';

    var sb = document.getElementById('adm-sidebar');
    var ov = document.getElementById('adm-overlay');
    document.getElementById('adm-burger').addEventListener('click', function () { sb.classList.toggle('open'); ov.classList.toggle('open'); });
    ov.addEventListener('click', function () { sb.classList.remove('open'); ov.classList.remove('open'); });

    document.querySelectorAll('[data-adm-menu]').forEach(function (b) {
      b.addEventListener('click', function () {
        activeMenu = b.getAttribute('data-adm-menu');
        sb.classList.remove('open');
        ov.classList.remove('open');
        renderShell();
      });
    });

    document.getElementById('adm-logout').addEventListener('click', function () {
      UKAuth.logout('admin');
      renderLogin();
    });

    document.getElementById('adm-gsearch-form').addEventListener('submit', function (e) {
      e.preventDefault();
      umkmState.search = document.getElementById('adm-gsearch').value.trim();
      umkmState.page = 1;
      activeMenu = 'umkm';
      renderShell();
    });

    var nb = document.getElementById('adm-notif-btn');
    var np = document.getElementById('adm-notif-pop');
    nb.addEventListener('click', function (e) { e.stopPropagation(); np.classList.toggle('open'); });
    document.addEventListener('click', function (e) { if (!np.contains(e.target) && e.target !== nb) np.classList.remove('open'); });

    var content = document.getElementById('adm-content');
    if (activeMenu === 'ringkasan') renderRingkasan(content);
    else if (activeMenu === 'umkm') renderUmkm(content);
    else if (activeMenu === 'paket') renderPaket(content);
    else if (activeMenu === 'kategori') renderKategori(content);
    else if (activeMenu === 'pemantauan') renderPemantauan(content);
    else if (activeMenu === 'laporan') renderLaporan(content);
    else if (activeMenu === 'dukungan') renderDukungan(content);
    else renderPengaturan(content);
  }

  renderShell();
})();
