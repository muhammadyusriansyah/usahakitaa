/* Modul Laporan Penjualan & Laba Rugi — UsahaKita */
(function () {
  'use strict';

  var state = {
    period: '30hari',
    customFrom: '',
    customTo: '',
    tab: 'ringkasan',
    groupBy: 'harian'
  };

  function startOfDay(d) {
    var x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function endOfDay(d) {
    var x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  function getPeriodRange() {
    var now = new Date();
    var start, end;
    if (state.period === 'hari_ini') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (state.period === '7hari') {
      start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
      end = endOfDay(now);
    } else if (state.period === 'bulan_ini') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = endOfDay(now);
    } else if (state.period === 'tahun_ini') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = endOfDay(now);
    } else if (state.period === 'kustom') {
      start = state.customFrom ? startOfDay(new Date(state.customFrom)) : startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
      end = state.customTo ? endOfDay(new Date(state.customTo)) : endOfDay(now);
    } else {
      start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
      end = endOfDay(now);
    }
    var spanMs = Math.max(86400000, end.getTime() - start.getTime() + 1);
    var prevEnd = new Date(start.getTime() - 1);
    var prevStart = new Date(prevEnd.getTime() - spanMs + 1);
    return { start: start, end: end, prevStart: prevStart, prevEnd: prevEnd };
  }

  function buildReportBarSVG(points) {
    var w = 640;
    var h = 180;
    var padL = 12, padR = 12, padT = 16, padB = 26;
    var iw = w - padL - padR;
    var ih = h - padT - padB;
    var maxV = Math.max.apply(null, points.map(function (p) { return p.total; }).concat([10000]));
    var barW = Math.max(6, Math.min(28, (iw / Math.max(1, points.length)) * 0.62));
    var bars = points.map(function (p, i) {
      var x = padL + ((i + 0.5) / Math.max(1, points.length)) * iw - barW / 2;
      var bh = (p.total / maxV) * ih;
      var y = padT + ih - bh;
      var showLabel = points.length <= 12 || i % Math.ceil(points.length / 8) === 0 || i === points.length - 1;
      return (
        '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + Math.max(2, bh).toFixed(1) + '" rx="3" fill="#f4772b"><title>' + UKUtils.escapeHTML(p.label + ': ' + UKUtils.rupiah(p.total)) + '</title></rect>' +
        (showLabel ? '<text x="' + (x + barW / 2).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="9.5" fill="#7c8291">' + UKUtils.escapeHTML(p.label) + '</text>' : '')
      );
    }).join('');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto" role="img" aria-label="Grafik omzet periode">' +
      '<line x1="' + padL + '" y1="' + (padT + ih) + '" x2="' + (w - padR) + '" y2="' + (padT + ih) + '" stroke="#e9ebf0"/>' +
      bars + '</svg>';
  }

  function buildDonut(slices) {
    var total = slices.reduce(function (s, x) { return s + x.omzet; }, 0);
    if (!total) return '<svg viewBox="0 0 140 140" width="140" height="140"><circle cx="70" cy="70" r="50" fill="none" stroke="#eef0f5" stroke-width="18"/></svg>';
    var r = 50, circ = 2 * Math.PI * r, off = 0;
    var segs = slices.map(function (sl) {
      var len = (sl.omzet / total) * circ;
      var c = '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + sl.color + '" stroke-width="18" stroke-dasharray="' + len.toFixed(2) + ' ' + circ.toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 70 70)"/>';
      off += len;
      return c;
    }).join('');
    return '<svg viewBox="0 0 140 140" width="140" height="140">' + segs + '<text x="70" y="74" text-anchor="middle" font-size="11" font-weight="700" fill="#252936">' + slices.length + ' Kat</text></svg>';
  }

  function render(root) {
    var tid = window.UK.getSession().tenantId;
    var tenant = window.UK.getTenant();
    var range = getPeriodRange();

    var allDone = db.transactions.list({ tenantId: tid }).filter(function (t) { return t.status === 'Selesai'; });
    var prods = db.products.list({ tenantId: tid });
    var cats = db.categories.list({ tenantId: tid });
    var prodMap = {};
    prods.forEach(function (p) { prodMap[p.id] = p; });
    var catMap = {};
    cats.forEach(function (c) { catMap[c.id] = c.nama; });

    var curTrx = allDone.filter(function (t) {
      var d = new Date(t.waktu);
      return d >= range.start && d <= range.end;
    });
    var prevTrx = allDone.filter(function (t) {
      var d = new Date(t.waktu);
      return d >= range.prevStart && d <= range.prevEnd;
    });

    var omzet = 0, subtotalSum = 0, diskonSum = 0, pajakSum = 0, hppSum = 0;
    var prodStats = {};
    var catStats = {};

    curTrx.forEach(function (t) {
      omzet += Number(t.total) || 0;
      subtotalSum += Number(t.subtotal) || 0;
      diskonSum += Number(t.diskon) || 0;
      pajakSum += Number(t.pajak) || 0;

      (t.items || []).forEach(function (it) {
        var pr = prodMap[it.productId];
        var qty = Number(it.qty) || 0;
        var rev = qty * (Number(it.harga) || 0);
        var costUnit = it.hargaBeli != null ? Number(it.hargaBeli) : (pr ? Number(pr.hargaBeli) || 0 : 0);
        var cost = qty * costUnit;
        hppSum += cost;

        if (!prodStats[it.productId]) {
          prodStats[it.productId] = { nama: it.nama, qty: 0, omzet: 0, hpp: 0 };
        }
        prodStats[it.productId].qty += qty;
        prodStats[it.productId].omzet += rev;
        prodStats[it.productId].hpp += cost;

        var catName = (pr && catMap[pr.kategoriId]) || 'Lainnya';
        catStats[catName] = (catStats[catName] || 0) + rev;
      });
    });

    var prevOmzet = prevTrx.reduce(function (s, t) { return s + (Number(t.total) || 0); }, 0);
    var labaKotor = (subtotalSum - diskonSum) - hppSum;
    var avgTrx = curTrx.length ? Math.round(omzet / curTrx.length) : 0;
    var cmpText = prevOmzet === 0 ? (omzet > 0 ? '+100% vs periode lalu' : '0% vs periode lalu') :
      (((omzet - prevOmzet) >= 0 ? '+' : '') + Math.round(((omzet - prevOmzet) / prevOmzet) * 100) + '% vs periode lalu');

    var prodRows = Object.keys(prodStats).map(function (k) {
      var x = prodStats[k];
      return { nama: x.nama, qty: x.qty, omzet: x.omzet, laba: x.omzet - x.hpp };
    }).sort(function (a, b) { return b.omzet - a.omzet; });

    var palette = ['#f4772b', '#20243a', '#15966b', '#b67a20', '#5c7cfa', '#8b5cf6'];
    var catRows = Object.keys(catStats).map(function (name, i) {
      return { nama: name, omzet: catStats[name], color: palette[i % palette.length] };
    }).sort(function (a, b) { return b.omzet - a.omzet; });
    var catTotal = catRows.reduce(function (s, c) { return s + c.omzet; }, 0);

    /* Grouping per periode */
    var groupMap = {};
    curTrx.forEach(function (t) {
      var d = new Date(t.waktu);
      var key;
      if (state.groupBy === 'tahunan') {
        key = String(d.getFullYear());
      } else if (state.groupBy === 'bulanan') {
        key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      } else if (state.groupBy === 'mingguan') {
        var first = new Date(d);
        first.setDate(d.getDate() - d.getDay());
        key = 'Minggu ' + UKUtils.tanggalIndo(first);
      } else {
        key = UKUtils.tanggalIndo(d);
      }
      if (!groupMap[key]) groupMap[key] = { label: key, count: 0, omzet: 0, sortKey: d.getTime() };
      groupMap[key].count += 1;
      groupMap[key].omzet += Number(t.total) || 0;
    });
    var groupRows = Object.keys(groupMap).map(function (k) { return groupMap[k]; }).sort(function (a, b) { return a.sortKey - b.sortKey; });

    /* Daily chart points */
    var dayMap = {};
    curTrx.forEach(function (t) {
      var d = new Date(t.waktu);
      var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (!dayMap[k]) dayMap[k] = { label: String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'), total: 0, key: k };
      dayMap[k].total += Number(t.total) || 0;
    });
    var chartPoints = Object.keys(dayMap).sort().map(function (k) { return dayMap[k]; });

    var bodyHTML = '';
    if (!curTrx.length) {
      bodyHTML = '<div class="empty-note"><div style="font-size:28px">📈</div><h4>Belum ada transaksi selesai pada periode ini</h4><p>Pilih rentang tanggal lain atau buat transaksi di Kasir / POS.</p></div>';
    } else if (state.tab === 'ringkasan') {
      bodyHTML =
        '<div class="stats-grid" style="margin-bottom:16px">' +
          '<div class="stat-card"><div class="stat-label">Total Omzet</div><div class="stat-value">' + UKUtils.escapeHTML(UKUtils.rupiah(omzet)) + '</div><div class="stat-meta">' + UKUtils.escapeHTML(cmpText) + '</div></div>' +
          '<div class="stat-card"><div class="stat-label">Jumlah Transaksi</div><div class="stat-value">' + curTrx.length + '</div><div class="stat-meta">Rata-rata: ' + UKUtils.escapeHTML(UKUtils.rupiah(avgTrx)) + '</div></div>' +
          '<div class="stat-card"><div class="stat-label">Laba Kotor</div><div class="stat-value" style="color:var(--green)">' + UKUtils.escapeHTML(UKUtils.rupiah(labaKotor)) + '</div><div class="stat-meta">Diskon: ' + UKUtils.escapeHTML(UKUtils.rupiah(diskonSum)) + '</div></div>' +
          '<div class="stat-card"><div class="stat-label">Pajak Terkumpul</div><div class="stat-value">' + UKUtils.escapeHTML(UKUtils.rupiah(pajakSum)) + '</div><div class="stat-meta">Hanya transaksi Selesai</div></div>' +
        '</div>' +
        '<div class="panel"><h3 class="panel-title" style="margin-bottom:10px">Grafik Penjualan Periode</h3>' + buildReportBarSVG(chartPoints) + '</div>';
    } else if (state.tab === 'produk') {
      bodyHTML =
        '<div class="table-wrap"><table class="uk-table">' +
          '<thead><tr><th>#</th><th>Nama Produk</th><th class="num">Terjual</th><th class="num">Omzet</th><th class="num">Laba Kotor</th></tr></thead>' +
          '<tbody>' + prodRows.map(function (r, idx) {
            return '<tr><td>' + (idx + 1) + '</td><td><strong>' + UKUtils.escapeHTML(r.nama) + '</strong></td><td class="num">' + r.qty + '</td><td class="num">' + UKUtils.escapeHTML(UKUtils.rupiah(r.omzet)) + '</td><td class="num" style="color:var(--green)"><strong>' + UKUtils.escapeHTML(UKUtils.rupiah(r.laba)) + '</strong></td></tr>';
          }).join('') + '</tbody>' +
        '</table></div>';
    } else if (state.tab === 'kategori') {
      bodyHTML =
        '<div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">' +
          buildDonut(catRows) +
          '<div class="table-wrap" style="flex:1;min-width:260px"><table class="uk-table" style="min-width:300px">' +
            '<thead><tr><th>Kategori</th><th class="num">Omzet</th><th class="num">Kontribusi</th></tr></thead>' +
            '<tbody>' + catRows.map(function (c) {
              var pct = catTotal ? Math.round((c.omzet / catTotal) * 100) : 0;
              return '<tr><td><span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:' + c.color + ';margin-right:6px"></span><strong>' + UKUtils.escapeHTML(c.nama) + '</strong></td><td class="num">' + UKUtils.escapeHTML(UKUtils.rupiah(c.omzet)) + '</td><td class="num">' + pct + '%</td></tr>';
            }).join('') + '</tbody>' +
          '</table></div>' +
        '</div>';
    } else if (state.tab === 'periode') {
      bodyHTML =
        '<div class="toolbar no-print">' +
          '<div class="chips">' +
            ['harian', 'mingguan', 'bulanan', 'tahunan'].map(function (g) {
              return '<button type="button" class="chip ' + (state.groupBy === g ? 'active' : '') + '" data-lap-grp="' + g + '" style="text-transform:capitalize">' + g + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="table-wrap"><table class="uk-table">' +
          '<thead><tr><th>Periode</th><th class="num">Jumlah Transaksi</th><th class="num">Total Omzet</th></tr></thead>' +
          '<tbody>' + groupRows.map(function (g) {
            return '<tr><td><strong>' + UKUtils.escapeHTML(g.label) + '</strong></td><td class="num">' + g.count + '</td><td class="num"><strong>' + UKUtils.escapeHTML(UKUtils.rupiah(g.omzet)) + '</strong></td></tr>';
          }).join('') + '</tbody>' +
        '</table></div>';
    } else {
      bodyHTML =
        '<div class="card" style="max-width:560px">' +
          '<h3 class="panel-title" style="margin-bottom:12px">Laporan Laba Rugi Sederhana</h3>' +
          '<div style="display:flex;flex-direction:column;gap:8px;font-size:13px">' +
            '<div style="display:flex;justify-content:space-between"><span>Penjualan Kotor (Subtotal)</span><strong class="tabular-nums">' + UKUtils.escapeHTML(UKUtils.rupiah(subtotalSum)) + '</strong></div>' +
            '<div style="display:flex;justify-content:space-between;color:var(--red)"><span>Potongan / Diskon</span><span class="tabular-nums">-' + UKUtils.escapeHTML(UKUtils.rupiah(diskonSum)) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:8px"><span>Penjualan Bersih</span><strong class="tabular-nums">' + UKUtils.escapeHTML(UKUtils.rupiah(subtotalSum - diskonSum)) + '</strong></div>' +
            '<div style="display:flex;justify-content:space-between;color:var(--muted)"><span>Harga Pokok Penjualan (HPP)</span><span class="tabular-nums">-' + UKUtils.escapeHTML(UKUtils.rupiah(hppSum)) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:8px;font-size:15px;font-weight:800;color:var(--green)"><span>Laba Kotor</span><span class="tabular-nums">' + UKUtils.escapeHTML(UKUtils.rupiah(labaKotor)) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);padding-top:4px"><span>Pajak Penjualan (titipan)</span><span class="tabular-nums">' + UKUtils.escapeHTML(UKUtils.rupiah(pajakSum)) + '</span></div>' +
          '</div>' +
        '</div>';
    }

    root.innerHTML =
      '<div class="page-header">' +
        '<div>' +
          '<h1 class="page-title">Laporan Penjualan</h1>' +
          '<p class="page-subtitle">' + UKUtils.escapeHTML(tenant.nama) + ' · Periode: ' + UKUtils.escapeHTML(UKUtils.tanggalIndo(range.start)) + ' – ' + UKUtils.escapeHTML(UKUtils.tanggalIndo(range.end)) + '</p>' +
        '</div>' +
        '<div class="no-print" style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button type="button" class="btn btn-light" id="lap-csv">Ekspor CSV</button>' +
          '<button type="button" class="btn btn-primary" id="lap-print">Cetak / PDF</button>' +
        '</div>' +
      '</div>' +

      '<div class="panel">' +
        '<div class="toolbar no-print">' +
          '<div class="toolbar-group">' +
            '<select id="lap-period" class="uk-select" style="width:auto">' +
              '<option value="hari_ini"' + (state.period === 'hari_ini' ? ' selected' : '') + '>Hari ini</option>' +
              '<option value="7hari"' + (state.period === '7hari' ? ' selected' : '') + '>7 hari</option>' +
              '<option value="30hari"' + (state.period === '30hari' ? ' selected' : '') + '>30 hari</option>' +
              '<option value="bulan_ini"' + (state.period === 'bulan_ini' ? ' selected' : '') + '>Bulan ini</option>' +
              '<option value="tahun_ini"' + (state.period === 'tahun_ini' ? ' selected' : '') + '>Tahun ini</option>' +
              '<option value="kustom"' + (state.period === 'kustom' ? ' selected' : '') + '>Rentang kustom</option>' +
            '</select>' +
            (state.period === 'kustom'
              ? '<input type="date" id="lap-from" class="uk-input" value="' + UKUtils.escapeHTML(state.customFrom) + '" style="width:auto" />' +
                '<input type="date" id="lap-to" class="uk-input" value="' + UKUtils.escapeHTML(state.customTo) + '" style="width:auto" />'
              : '') +
          '</div>' +
          '<div class="tabs">' +
            [['ringkasan', 'Ringkasan'], ['produk', 'Per Produk'], ['kategori', 'Per Kategori'], ['periode', 'Per Periode'], ['labarugi', 'Laba Rugi']].map(function (t) {
              return '<button type="button" class="tab-btn ' + (state.tab === t[0] ? 'active' : '') + '" data-lap-tab="' + t[0] + '">' + t[1] + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        bodyHTML +
      '</div>';

    root.querySelector('#lap-period').addEventListener('change', function () { state.period = this.value; render(root); });
    var fEl = root.querySelector('#lap-from');
    var tEl = root.querySelector('#lap-to');
    if (fEl) fEl.addEventListener('change', function () { state.customFrom = this.value; render(root); });
    if (tEl) tEl.addEventListener('change', function () { state.customTo = this.value; render(root); });

    root.querySelectorAll('[data-lap-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () { state.tab = btn.getAttribute('data-lap-tab'); render(root); });
    });
    root.querySelectorAll('[data-lap-grp]').forEach(function (btn) {
      btn.addEventListener('click', function () { state.groupBy = btn.getAttribute('data-lap-grp'); render(root); });
    });

    root.querySelector('#lap-csv').addEventListener('click', function () {
      var rows;
      if (state.tab === 'produk') {
        rows = [['Peringkat', 'Produk', 'Terjual', 'Omzet', 'Laba Kotor']];
        prodRows.forEach(function (r, idx) { rows.push([idx + 1, r.nama, r.qty, r.omzet, r.laba]); });
      } else if (state.tab === 'kategori') {
        rows = [['Kategori', 'Omzet', 'Kontribusi (%)']];
        catRows.forEach(function (c) { rows.push([c.nama, c.omzet, catTotal ? Math.round((c.omzet / catTotal) * 100) : 0]); });
      } else if (state.tab === 'periode') {
        rows = [['Periode', 'Jumlah Transaksi', 'Total Omzet']];
        groupRows.forEach(function (g) { rows.push([g.label, g.count, g.omzet]); });
      } else {
        rows = [
          ['Metrik', 'Nilai'],
          ['Jumlah Transaksi Selesai', curTrx.length],
          ['Subtotal Penjualan', subtotalSum],
          ['Diskon', diskonSum],
          ['Pajak', pajakSum],
          ['Total Omzet', omzet],
          ['HPP', hppSum],
          ['Laba Kotor', labaKotor]
        ];
      }
      UKUtils.downloadCSV('laporan-' + state.tab + '.csv', rows);
    });

    root.querySelector('#lap-print').addEventListener('click', function () {
      document.body.classList.add('uk-printing-report');
      try { window.print(); } finally {
        setTimeout(function () { document.body.classList.remove('uk-printing-report'); }, 300);
      }
    });
  }

  window.UK.registerModule('laporan', { render: render });
})();
