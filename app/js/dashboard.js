/* Modul Dashboard Pemilik — UsahaKita */
(function () {
  'use strict';

  var chartDays = 7;

  function dateKey(d) {
    var dt = d instanceof Date ? d : new Date(d);
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  }

  function buildLineChartSVG(series) {
    var w = 620;
    var h = 190;
    var padL = 14;
    var padR = 14;
    var padT = 18;
    var padB = 28;
    var innerW = w - padL - padR;
    var innerH = h - padT - padB;
    var maxVal = Math.max.apply(null, series.map(function (s) { return s.total; }).concat([10000]));

    var pts = series.map(function (s, idx) {
      var x = series.length === 1 ? padL + innerW / 2 : padL + (idx / (series.length - 1)) * innerW;
      var y = padT + innerH - (s.total / maxVal) * innerH;
      return { x: x, y: y, label: s.label, total: s.total };
    });

    var polyPoints = pts.map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
    var areaPoints = pts.length
      ? (pts[0].x.toFixed(1) + ',' + (padT + innerH) + ' ' + polyPoints + ' ' + pts[pts.length - 1].x.toFixed(1) + ',' + (padT + innerH))
      : '';

    var stepLabel = series.length > 10 ? 5 : 1;
    var labelsHTML = pts.map(function (p, i) {
      if (i % stepLabel !== 0 && i !== pts.length - 1) return '';
      return '<text x="' + p.x.toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="10" fill="#7c8291">' + UKUtils.escapeHTML(p.label) + '</text>';
    }).join('');

    var dotsHTML = pts.map(function (p) {
      return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3.5" fill="#f4772b"><title>' + UKUtils.escapeHTML(p.label + ': ' + UKUtils.rupiah(p.total)) + '</title></circle>';
    }).join('');

    return (
      '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto;display:block" role="img" aria-label="Grafik penjualan">' +
        '<defs><linearGradient id="ukDashArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f4772b" stop-opacity="0.22"/><stop offset="100%" stop-color="#f4772b" stop-opacity="0.01"/></linearGradient></defs>' +
        '<line x1="' + padL + '" y1="' + (padT + innerH) + '" x2="' + (w - padR) + '" y2="' + (padT + innerH) + '" stroke="#e9ebf0" stroke-width="1"/>' +
        '<line x1="' + padL + '" y1="' + (padT + innerH / 2) + '" x2="' + (w - padR) + '" y2="' + (padT + innerH / 2) + '" stroke="#f1f3f7" stroke-dasharray="4 4" stroke-width="1"/>' +
        (areaPoints ? '<polygon points="' + areaPoints + '" fill="url(#ukDashArea)"/>' : '') +
        (polyPoints ? '<polyline fill="none" stroke="#f4772b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="' + polyPoints + '"/>' : '') +
        dotsHTML +
        labelsHTML +
      '</svg>'
    );
  }

  function buildDonutSVG(slices) {
    var total = slices.reduce(function (s, x) { return s + x.total; }, 0);
    if (!total) {
      return '<svg viewBox="0 0 140 140" width="136" height="136"><circle cx="70" cy="70" r="50" fill="none" stroke="#eef0f5" stroke-width="18"/><text x="70" y="74" text-anchor="middle" font-size="11" fill="#7c8291">Belum ada</text></svg>';
    }
    var r = 50;
    var circ = 2 * Math.PI * r;
    var offset = 0;
    var circles = slices.map(function (sl) {
      var len = (sl.total / total) * circ;
      var el = '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + sl.color + '" stroke-width="18" stroke-dasharray="' + len.toFixed(2) + ' ' + circ.toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 70 70)"/>';
      offset += len;
      return el;
    }).join('');
    return (
      '<svg viewBox="0 0 140 140" width="136" height="136" role="img" aria-label="Distribusi penjualan per kategori">' +
        circles +
        '<text x="70" y="67" text-anchor="middle" font-size="10" fill="#7c8291">Total</text>' +
        '<text x="70" y="82" text-anchor="middle" font-size="11" font-weight="700" fill="#252936">' + UKUtils.escapeHTML(slices.length + ' Kat') + '</text>' +
      '</svg>'
    );
  }

  function render(root) {
    var session = window.UK.getSession();
    var tenant = window.UK.getTenant();
    var tid = session.tenantId;

    var allProducts = db.products.list({ tenantId: tid }).filter(function (p) { return p.status !== 'diarsipkan'; });
    var categories = db.categories.list({ tenantId: tid });
    var allTrx = db.transactions.list({ tenantId: tid });
    var completedTrx = allTrx.filter(function (t) { return t.status === 'Selesai'; });
    var movements = db.stockMovements.list({ tenantId: tid });

    var todayKey = dateKey(new Date());
    var yest = new Date();
    yest.setDate(yest.getDate() - 1);
    var yestKey = dateKey(yest);

    var todayTrx = completedTrx.filter(function (t) { return dateKey(t.waktu) === todayKey; });
    var yestTrx = completedTrx.filter(function (t) { return dateKey(t.waktu) === yestKey; });
    var todaySales = todayTrx.reduce(function (s, t) { return s + (Number(t.total) || 0); }, 0);
    var yestSales = yestTrx.reduce(function (s, t) { return s + (Number(t.total) || 0); }, 0);

    var pctText = 'Sama dengan kemarin';
    var pctClass = '';
    if (yestSales === 0 && todaySales > 0) {
      pctText = '+100% vs kemarin';
      pctClass = 'up';
    } else if (yestSales > 0) {
      var pct = Math.round(((todaySales - yestSales) / yestSales) * 100);
      pctText = (pct >= 0 ? '+' : '') + pct + '% vs kemarin';
      pctClass = pct >= 0 ? 'up' : 'down';
    }

    var lowStock = allProducts.filter(function (p) { return Number(p.stok) <= Number(p.stokMin); });
    var publishedCount = allProducts.filter(function (p) { return p.status === 'dipublikasikan'; }).length;

    /* Deret grafik penjualan N hari */
    var series = [];
    for (var i = chartDays - 1; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var k = dateKey(d);
      var daySum = completedTrx
        .filter(function (t) { return dateKey(t.waktu) === k; })
        .reduce(function (s, t) { return s + (Number(t.total) || 0); }, 0);
      series.push({
        key: k,
        label: String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'),
        total: daySum
      });
    }

    /* Penjualan per kategori + produk terlaris */
    var prodMap = {};
    allProducts.forEach(function (p) { prodMap[p.id] = p; });
    var catNameMap = {};
    categories.forEach(function (c) { catNameMap[c.id] = c.nama; });

    var catSalesMap = {};
    var topProdMap = {};
    var cutoff30 = new Date();
    cutoff30.setDate(cutoff30.getDate() - 30);

    var omzet30 = 0;
    var hpp30 = 0;

    completedTrx.forEach(function (t) {
      var tDate = new Date(t.waktu);
      var in30 = tDate >= cutoff30;
      if (in30) omzet30 += Number(t.total) || 0;

      (t.items || []).forEach(function (it) {
        var prod = prodMap[it.productId];
        var catName = (prod && catNameMap[prod.kategoriId]) || 'Lainnya';
        var rev = (Number(it.qty) || 0) * (Number(it.harga) || 0);
        var costUnit = it.hargaBeli != null ? Number(it.hargaBeli) : (prod ? Number(prod.hargaBeli) || 0 : 0);
        if (in30) hpp30 += (Number(it.qty) || 0) * costUnit;

        catSalesMap[catName] = (catSalesMap[catName] || 0) + rev;
        if (!topProdMap[it.productId]) {
          topProdMap[it.productId] = { nama: it.nama, qty: 0, omzet: 0 };
        }
        topProdMap[it.productId].qty += Number(it.qty) || 0;
        topProdMap[it.productId].omzet += rev;
      });
    });

    var palette = ['#f4772b', '#20243a', '#15966b', '#b67a20', '#5c7cfa', '#8b5cf6'];
    var catSlices = Object.keys(catSalesMap)
      .map(function (name, idx) {
        return { nama: name, total: catSalesMap[name], color: palette[idx % palette.length] };
      })
      .sort(function (a, b) { return b.total - a.total; });
    var catTotal = catSlices.reduce(function (s, x) { return s + x.total; }, 0);

    var topProds = Object.keys(topProdMap)
      .map(function (id) { return topProdMap[id]; })
      .sort(function (a, b) { return b.omzet - a.omzet; })
      .slice(0, 5);
    var maxTopOmzet = topProds.length ? Math.max(topProds[0].omzet, 1) : 1;

    var latestTrx = allTrx.slice().sort(function (a, b) {
      return new Date(b.waktu) - new Date(a.waktu);
    }).slice(0, 5);

    var restockSpend30 = movements
      .filter(function (m) { return m.tipe === 'masuk' && new Date(m.waktu) >= cutoff30 && m.catatan !== 'Stok awal produk'; })
      .reduce(function (s, m) {
        var pr = prodMap[m.productId];
        return s + (Number(m.jumlah) || 0) * (pr ? Number(pr.hargaBeli) || 0 : 0);
      }, 0);
    var estimasiPengeluaran = hpp30 + restockSpend30;
    var estimasiLaba = omzet30 - hpp30;

    root.innerHTML =
      '<div class="page-header">' +
        '<div>' +
          '<h1 class="page-title">Halo, ' + UKUtils.escapeHTML(session.nama) + '</h1>' +
          '<p class="page-subtitle">Ringkasan operasional <strong>' + UKUtils.escapeHTML(tenant.nama) + '</strong> · Klik WhatsApp katalog: <strong class="tabular-nums">' + Number(tenant.waClicks || 0) + '</strong></p>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<a href="../toko/index.html?u=' + encodeURIComponent(tenant.slug) + '" target="_blank" rel="noopener" class="btn btn-light">Lihat Katalog</a>' +
          '<button type="button" class="btn btn-primary" id="dash-btn-new-pos">+ Transaksi Baru</button>' +
        '</div>' +
      '</div>' +

      '<div class="stats-grid">' +
        '<div class="stat-card">' +
          '<div class="stat-label"><span>Penjualan Hari Ini</span></div>' +
          '<div class="stat-value">' + UKUtils.escapeHTML(UKUtils.rupiah(todaySales)) + '</div>' +
          '<div class="stat-meta ' + pctClass + '">' + UKUtils.escapeHTML(pctText) + '</div>' +
        '</div>' +
        '<div class="stat-card">' +
          '<div class="stat-label"><span>Jumlah Transaksi</span></div>' +
          '<div class="stat-value">' + todayTrx.length + ' <span style="font-size:13px;font-weight:500;color:var(--muted)">hari ini</span></div>' +
          '<div class="stat-meta">Total selesai: ' + completedTrx.length + ' transaksi</div>' +
        '</div>' +
        '<div class="stat-card">' +
          '<div class="stat-label"><span>Produk Terdaftar</span></div>' +
          '<div class="stat-value">' + allProducts.length + '</div>' +
          '<div class="stat-meta">' + publishedCount + ' dipublikasikan di katalog</div>' +
        '</div>' +
        '<div class="stat-card" style="cursor:pointer" id="dash-card-lowstock" title="Lihat persediaan stok">' +
          '<div class="stat-label"><span>Stok Menipis</span></div>' +
          '<div class="stat-value" style="color:' + (lowStock.length ? 'var(--red)' : 'var(--green)') + '">' + lowStock.length + ' SKU</div>' +
          '<div class="stat-meta">' + (lowStock.length ? 'Perlu segera diisi ulang' : 'Semua stok aman') + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="dash-grid-2">' +
        '<section class="panel">' +
          '<div class="panel-header">' +
            '<div><h2 class="panel-title">Tren Penjualan</h2><p class="panel-sub">Omzet transaksi selesai per hari</p></div>' +
            '<select id="dash-period-select" class="uk-select" style="width:auto;min-width:130px" aria-label="Pilih periode grafik">' +
              '<option value="7"' + (chartDays === 7 ? ' selected' : '') + '>7 Hari Terakhir</option>' +
              '<option value="30"' + (chartDays === 30 ? ' selected' : '') + '>30 Hari Terakhir</option>' +
            '</select>' +
          '</div>' +
          buildLineChartSVG(series) +
        '</section>' +

        '<section class="panel">' +
          '<div class="panel-header">' +
            '<div><h2 class="panel-title">Penjualan per Kategori</h2><p class="panel-sub">Kontribusi omzet seluruh kategori</p></div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
            buildDonutSVG(catSlices) +
            '<div style="flex:1;min-width:140px;display:flex;flex-direction:column;gap:8px">' +
              (catSlices.length ? catSlices.map(function (sl) {
                var p = catTotal ? Math.round((sl.total / catTotal) * 100) : 0;
                return (
                  '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px">' +
                    '<span style="display:inline-flex;align-items:center;gap:6px"><span style="width:9px;height:9px;border-radius:3px;background:' + sl.color + '"></span>' + UKUtils.escapeHTML(sl.nama) + '</span>' +
                    '<strong class="tabular-nums">' + p + '%</strong>' +
                  '</div>'
                );
              }).join('') : '<div style="font-size:12px;color:var(--muted)">Belum ada penjualan kategori.</div>') +
            '</div>' +
          '</div>' +
        '</section>' +
      '</div>' +

      '<div class="dash-grid-equal">' +
        '<section class="panel">' +
          '<div class="panel-header">' +
            '<div><h2 class="panel-title">Produk Terlaris</h2><p class="panel-sub">5 produk dengan omzet tertinggi</p></div>' +
          '</div>' +
          (topProds.length ? '<div style="display:flex;flex-direction:column;gap:10px">' + topProds.map(function (tp) {
            var wPct = Math.max(6, Math.round((tp.omzet / maxTopOmzet) * 100));
            return (
              '<div>' +
                '<div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px">' +
                  '<span style="font-weight:600">' + UKUtils.escapeHTML(tp.nama) + ' <small style="color:var(--muted)">(' + tp.qty + ' terjual)</small></span>' +
                  '<strong class="tabular-nums">' + UKUtils.escapeHTML(UKUtils.rupiah(tp.omzet)) + '</strong>' +
                '</div>' +
                '<div style="height:7px;background:#eef0f5;border-radius:999px;overflow:hidden"><div style="height:100%;width:' + wPct + '%;background:var(--orange);border-radius:999px"></div></div>' +
              '</div>'
            );
          }).join('') + '</div>' : '<div class="empty-note">Belum ada penjualan produk.</div>') +
        '</section>' +

        '<section class="panel">' +
          '<div class="panel-header">' +
            '<div><h2 class="panel-title">Ringkasan Keuangan (30 Hari)</h2><p class="panel-sub">Estimasi pemasukan, modal/HPP, dan laba kotor</p></div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:10px">' +
            '<div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:10px;background:var(--green-soft)">' +
              '<span style="font-weight:600;color:var(--green)">Pemasukan Penjualan</span>' +
              '<strong class="tabular-nums" style="color:var(--green)">' + UKUtils.escapeHTML(UKUtils.rupiah(omzet30)) + '</strong>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:10px;background:#fafbfd;border:1px solid var(--line)">' +
              '<span style="color:var(--muted)">HPP &amp; Belanja Stok</span>' +
              '<strong class="tabular-nums">' + UKUtils.escapeHTML(UKUtils.rupiah(estimasiPengeluaran)) + '</strong>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:10px;background:var(--orange-soft)">' +
              '<span style="font-weight:700;color:var(--orange-dark)">Estimasi Laba Kotor</span>' +
              '<strong class="tabular-nums" style="color:var(--orange-dark)">' + UKUtils.escapeHTML(UKUtils.rupiah(estimasiLaba)) + '</strong>' +
            '</div>' +
          '</div>' +
        '</section>' +
      '</div>' +

      '<section class="panel" style="margin-top:16px">' +
        '<div class="panel-header">' +
          '<div><h2 class="panel-title">5 Transaksi Terbaru</h2><p class="panel-sub">Aktivitas kasir paling akhir</p></div>' +
          '<a href="#/transaksi" class="btn btn-light btn-sm">Lihat semua</a>' +
        '</div>' +
        '<div class="table-wrap">' +
          '<table class="uk-table">' +
            '<thead><tr><th>ID Nota</th><th>Waktu</th><th>Item</th><th>Metode</th><th class="num">Total</th><th>Status</th></tr></thead>' +
            '<tbody>' +
              (latestTrx.length ? latestTrx.map(function (t) {
                var stCls = t.status === 'Selesai' ? 'success' : (t.status === 'Menunggu' ? 'pending' : 'danger');
                var qtySum = (t.items || []).reduce(function (s, i) { return s + (Number(i.qty) || 0); }, 0);
                return (
                  '<tr>' +
                    '<td><strong>' + UKUtils.escapeHTML(t.id) + '</strong></td>' +
                    '<td>' + UKUtils.escapeHTML(UKUtils.tanggalIndo(t.waktu, true)) + '</td>' +
                    '<td>' + qtySum + ' item</td>' +
                    '<td>' + UKUtils.escapeHTML(t.metode) + '</td>' +
                    '<td class="num"><strong>' + UKUtils.escapeHTML(UKUtils.rupiah(t.total)) + '</strong></td>' +
                    '<td><span class="status ' + stCls + '">' + UKUtils.escapeHTML(t.status) + '</span></td>' +
                  '</tr>'
                );
              }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted)">Belum ada transaksi.</td></tr>') +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</section>';

    root.querySelector('#dash-btn-new-pos').addEventListener('click', function () {
      window.UK.navigate('pos');
    });
    root.querySelector('#dash-card-lowstock').addEventListener('click', function () {
      window.UK.navigate('stok');
    });
    root.querySelector('#dash-period-select').addEventListener('change', function () {
      chartDays = Number(this.value) === 30 ? 30 : 7;
      render(root);
    });
  }

  window.UK.registerModule('dashboard', { render: render });
})();
