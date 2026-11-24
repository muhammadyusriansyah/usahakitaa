/* Modul Persediaan Stok — UsahaKita */
(function () {
  'use strict';

  var state = {
    tab: 'daftar',
    search: '',
    statusFilter: 'semua',
    onlyLow: false,
    histType: 'semua',
    histFrom: '',
    histTo: ''
  };

  function getStockStatus(p) {
    var s = Number(p.stok) || 0;
    var min = Number(p.stokMin) || 0;
    if (s <= 0) return { key: 'habis', label: 'Habis', cls: 'danger' };
    if (s <= min) return { key: 'menipis', label: 'Menipis', cls: 'pending' };
    return { key: 'aman', label: 'Aman', cls: 'success' };
  }

  function openStockAdjustModal(tid, prod, mode, onDone) {
    var modalId = 'uk-stok-modal';
    var titles = {
      masuk: 'Tambah Stok (Barang Masuk)',
      keluar: 'Kurangi Stok (Barang Keluar)',
      penyesuaian: 'Penyesuaian Stok (Stok Opname)'
    };
    var cur = Number(prod.stok) || 0;
    var isOpname = mode === 'penyesuaian';

    var el = UKUtils.openModal({
      id: modalId,
      size: 'sm',
      title: titles[mode] || 'Ubah Stok',
      bodyHTML:
        '<div style="padding:10px 12px;background:#fafbfd;border:1px solid var(--line);border-radius:9px;margin-bottom:12px">' +
          '<div style="font-weight:700">' + UKUtils.escapeHTML(prod.nama) + '</div>' +
          '<div style="font-size:12px;color:var(--muted)">Stok saat ini: <strong class="tabular-nums">' + cur + '</strong> unit</div>' +
        '</div>' +
        '<div class="field">' +
          '<label for="stk-qty">' + (isOpname ? 'Stok Aktual Hasil Hitung *' : 'Jumlah Unit *') + '</label>' +
          '<input type="number" id="stk-qty" min="' + (isOpname ? '0' : '1') + '" value="' + (isOpname ? cur : 1) + '" required />' +
          (isOpname ? '<div class="field-hint" id="stk-diff-hint">Selisih: 0</div>' : '') +
        '</div>' +
        '<div class="field" style="margin-bottom:0">' +
          '<label for="stk-note">Catatan ' + (isOpname ? '*' : '(opsional)') + '</label>' +
          '<textarea id="stk-note" rows="2" placeholder="' + (isOpname ? 'Wajib isi alasan stok opname...' : 'Contoh: Restock supplier') + '"></textarea>' +
        '</div>',
      footerHTML:
        '<button type="button" class="btn btn-light" data-cancel-stk>Batal</button>' +
        '<button type="button" class="btn btn-primary" data-save-stk>Simpan</button>'
    });

    var qtyEl = el.querySelector('#stk-qty');
    if (isOpname) {
      var diffHint = el.querySelector('#stk-diff-hint');
      qtyEl.addEventListener('input', function () {
        var next = Number(qtyEl.value);
        if (isNaN(next)) return;
        var diff = next - cur;
        diffHint.textContent = 'Selisih: ' + (diff >= 0 ? '+' : '') + diff;
      });
    }

    el.querySelector('[data-cancel-stk]').addEventListener('click', function () { UKUtils.closeModal(modalId); });
    el.querySelector('[data-save-stk]').addEventListener('click', function () {
      var val = Math.floor(Number(qtyEl.value));
      var note = UKUtils.cleanSpaces(el.querySelector('#stk-note').value);
      if (isNaN(val) || val < (isOpname ? 0 : 1)) {
        UKUtils.toast(isOpname ? 'Stok aktual tidak boleh negatif.' : 'Jumlah unit minimal 1.', 'error');
        return;
      }

      var nextStock = cur;
      var delta = 0;
      if (mode === 'masuk') {
        delta = val;
        nextStock = cur + val;
      } else if (mode === 'keluar') {
        if (val > cur) {
          UKUtils.toast('Pengurangan melebihi stok saat ini (' + cur + ').', 'error');
          return;
        }
        delta = -val;
        nextStock = cur - val;
      } else {
        if (!note) {
          UKUtils.toast('Catatan wajib diisi untuk penyesuaian stok.', 'error');
          return;
        }
        delta = val - cur;
        nextStock = val;
      }

      db.products.update(prod.id, { stok: nextStock }, tid);
      db.stockMovements.create({
        tenantId: tid,
        productId: prod.id,
        tipe: mode,
        jumlah: delta,
        saldoSesudah: nextStock,
        catatan: note || (mode === 'masuk' ? 'Barang masuk' : 'Barang keluar'),
        waktu: new Date().toISOString()
      });

      UKUtils.closeModal(modalId);
      UKUtils.toast('Stok berhasil diperbarui.', 'success');
      window.UK.refreshShell();
      if (onDone) onDone();
    });
  }

  function render(root) {
    var tid = window.UK.getSession().tenantId;
    var prods = db.products.list({ tenantId: tid }).filter(function (p) { return p.status !== 'diarsipkan'; });
    var movements = db.stockMovements.list({ tenantId: tid }).slice().sort(function (a, b) {
      return new Date(b.waktu) - new Date(a.waktu);
    });

    var prodMap = {};
    prods.forEach(function (p) { prodMap[p.id] = p; });
    var allProdsIncludingArchived = db.products.list({ tenantId: tid });
    allProdsIncludingArchived.forEach(function (p) { prodMap[p.id] = p; });

    var countAman = 0;
    var countLow = 0;
    var countOut = 0;
    var totalValue = 0;

    prods.forEach(function (p) {
      var st = getStockStatus(p);
      if (st.key === 'aman') countAman++;
      else if (st.key === 'menipis') countLow++;
      else countOut++;
      totalValue += (Number(p.stok) || 0) * (Number(p.hargaBeli) || 0);
    });

    var alertCount = countLow + countOut;
    var warnBanner = alertCount > 0
      ? '<div class="banner warning"><span><strong>Peringatan Persediaan:</strong> Terdapat <strong>' + alertCount + ' SKU</strong> dengan stok menipis atau habis. Segera lakukan pengisian ulang.</span></div>'
      : '';

    var tabContent = '';
    if (state.tab === 'daftar') {
      var q = state.search.trim().toLowerCase();
      var filtered = prods.filter(function (p) {
        var st = getStockStatus(p);
        if (state.onlyLow && st.key === 'aman') return false;
        if (state.statusFilter !== 'semua' && st.key !== state.statusFilter) return false;
        if (q && (p.nama + ' ' + p.kode).toLowerCase().indexOf(q) === -1) return false;
        return true;
      });

      var rowsHTML = filtered.length ? filtered.map(function (p) {
        var st = getStockStatus(p);
        return (
          '<tr>' +
            '<td><strong>' + UKUtils.escapeHTML(p.nama) + '</strong><div style="font-size:11px;color:var(--muted)">' + UKUtils.escapeHTML(p.kode) + '</div></td>' +
            '<td class="num"><strong style="font-size:14px">' + Number(p.stok) + '</strong></td>' +
            '<td class="num">' +
              '<input type="number" min="0" class="uk-input stk-min-input tabular-nums" data-id="' + UKUtils.escapeHTML(p.id) + '" value="' + Number(p.stokMin) + '" style="width:74px;padding:4px 7px;text-align:right;display:inline-block" aria-label="Stok minimum ' + UKUtils.escapeHTML(p.nama) + '" />' +
            '</td>' +
            '<td class="num">' + UKUtils.escapeHTML(UKUtils.rupiah((Number(p.stok) || 0) * (Number(p.hargaBeli) || 0))) + '</td>' +
            '<td><span class="status ' + st.cls + '">' + st.label + '</span></td>' +
            '<td style="text-align:right;white-space:nowrap">' +
              '<button type="button" class="btn btn-light btn-sm stk-act" data-mode="masuk" data-id="' + UKUtils.escapeHTML(p.id) + '">+ Masuk</button> ' +
              '<button type="button" class="btn btn-light btn-sm stk-act" data-mode="keluar" data-id="' + UKUtils.escapeHTML(p.id) + '">− Keluar</button> ' +
              '<button type="button" class="btn btn-light btn-sm stk-act" data-mode="penyesuaian" data-id="' + UKUtils.escapeHTML(p.id) + '">Opname</button>' +
            '</td>' +
          '</tr>'
        );
      }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">Tidak ada produk yang cocok dengan filter.</td></tr>';

      tabContent =
        '<div class="toolbar">' +
          '<div class="toolbar-group">' +
            '<input type="search" id="stk-search" class="uk-input" placeholder="Cari produk atau kode..." value="' + UKUtils.escapeHTML(state.search) + '" style="width:220px" />' +
            '<select id="stk-status" class="uk-select" style="width:auto">' +
              '<option value="semua"' + (state.statusFilter === 'semua' ? ' selected' : '') + '>Semua Status</option>' +
              '<option value="aman"' + (state.statusFilter === 'aman' ? ' selected' : '') + '>Aman</option>' +
              '<option value="menipis"' + (state.statusFilter === 'menipis' ? ' selected' : '') + '>Menipis</option>' +
              '<option value="habis"' + (state.statusFilter === 'habis' ? ' selected' : '') + '>Habis</option>' +
            '</select>' +
            '<button type="button" class="chip ' + (state.onlyLow ? 'active' : '') + '" id="stk-only-low">Hanya stok menipis / habis</button>' +
          '</div>' +
        '</div>' +
        '<div class="table-wrap">' +
          '<table class="uk-table">' +
            '<thead><tr><th>Produk</th><th class="num">Stok</th><th class="num">Stok Min</th><th class="num">Nilai Modal</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead>' +
            '<tbody>' + rowsHTML + '</tbody>' +
          '</table>' +
        '</div>';
    } else {
      var histFiltered = movements.filter(function (m) {
        if (state.histType !== 'semua' && m.tipe !== state.histType) return false;
        var dStr = String(m.waktu || '').slice(0, 10);
        if (state.histFrom && dStr < state.histFrom) return false;
        if (state.histTo && dStr > state.histTo) return false;
        return true;
      });

      var histRows = histFiltered.length ? histFiltered.map(function (m) {
        var pr = prodMap[m.productId];
        var jml = Number(m.jumlah) || 0;
        var jmlText = (jml > 0 ? '+' : '') + jml;
        var badgeCls = m.tipe === 'masuk' ? 'success' : (m.tipe === 'penyesuaian' ? 'pending' : 'neutral');
        return (
          '<tr>' +
            '<td>' + UKUtils.escapeHTML(UKUtils.tanggalIndo(m.waktu, true)) + '</td>' +
            '<td><strong>' + UKUtils.escapeHTML(pr ? pr.nama : m.productId) + '</strong></td>' +
            '<td><span class="status ' + badgeCls + '" style="text-transform:capitalize">' + UKUtils.escapeHTML(m.tipe) + '</span></td>' +
            '<td class="num" style="font-weight:700;color:' + (jml < 0 ? 'var(--red)' : 'var(--green)') + '">' + jmlText + '</td>' +
            '<td class="num">' + (m.saldoSesudah != null ? Number(m.saldoSesudah) : '-') + '</td>' +
            '<td>' + UKUtils.escapeHTML(m.catatan || '-') + '</td>' +
          '</tr>'
        );
      }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">Belum ada riwayat perubahan stok.</td></tr>';

      tabContent =
        '<div class="toolbar">' +
          '<div class="toolbar-group">' +
            '<select id="stk-hist-type" class="uk-select" style="width:auto">' +
              '<option value="semua"' + (state.histType === 'semua' ? ' selected' : '') + '>Semua Tipe</option>' +
              '<option value="masuk"' + (state.histType === 'masuk' ? ' selected' : '') + '>Masuk</option>' +
              '<option value="keluar"' + (state.histType === 'keluar' ? ' selected' : '') + '>Keluar</option>' +
              '<option value="penyesuaian"' + (state.histType === 'penyesuaian' ? ' selected' : '') + '>Penyesuaian</option>' +
              '<option value="penjualan"' + (state.histType === 'penjualan' ? ' selected' : '') + '>Penjualan</option>' +
            '</select>' +
            '<input type="date" id="stk-hist-from" class="uk-input" value="' + UKUtils.escapeHTML(state.histFrom) + '" style="width:auto" aria-label="Tanggal mulai" />' +
            '<input type="date" id="stk-hist-to" class="uk-input" value="' + UKUtils.escapeHTML(state.histTo) + '" style="width:auto" aria-label="Tanggal akhir" />' +
          '</div>' +
          '<button type="button" class="btn btn-light btn-sm" id="stk-export-csv">Ekspor CSV</button>' +
        '</div>' +
        '<div class="table-wrap">' +
          '<table class="uk-table">' +
            '<thead><tr><th>Waktu</th><th>Produk</th><th>Tipe</th><th class="num">Jumlah</th><th class="num">Saldo Sesudah</th><th>Catatan</th></tr></thead>' +
            '<tbody>' + histRows + '</tbody>' +
          '</table>' +
        '</div>';
    }

    root.innerHTML =
      '<div class="page-header">' +
        '<div>' +
          '<h1 class="page-title">Persediaan Stok</h1>' +
          '<p class="page-subtitle">Kelola stok masuk, keluar, stok opname, dan pantau nilai persediaan.</p>' +
        '</div>' +
      '</div>' +

      warnBanner +

      '<div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(175px,1fr));margin-bottom:16px">' +
        '<div class="stat-card"><div class="stat-label">Total SKU Aktif</div><div class="stat-value">' + prods.length + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">Stok Aman</div><div class="stat-value" style="color:var(--green)">' + countAman + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">Stok Menipis</div><div class="stat-value" style="color:var(--amber)">' + countLow + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">Stok Habis</div><div class="stat-value" style="color:var(--red)">' + countOut + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">Nilai Persediaan</div><div class="stat-value" style="font-size:18px">' + UKUtils.escapeHTML(UKUtils.rupiah(totalValue)) + '</div></div>' +
      '</div>' +

      '<div class="panel">' +
        '<div style="margin-bottom:14px">' +
          '<div class="tabs">' +
            '<button type="button" class="tab-btn ' + (state.tab === 'daftar' ? 'active' : '') + '" data-stk-tab="daftar">Daftar Stok</button>' +
            '<button type="button" class="tab-btn ' + (state.tab === 'riwayat' ? 'active' : '') + '" data-stk-tab="riwayat">Riwayat Perubahan (' + movements.length + ')</button>' +
          '</div>' +
        '</div>' +
        tabContent +
      '</div>';

    root.querySelectorAll('[data-stk-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.tab = btn.getAttribute('data-stk-tab');
        render(root);
      });
    });

    if (state.tab === 'daftar') {
      var sEl = root.querySelector('#stk-search');
      sEl.addEventListener('input', UKUtils.debounce(function () {
        state.search = sEl.value;
        render(root);
        var next = root.querySelector('#stk-search');
        if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
      }, 220));
      root.querySelector('#stk-status').addEventListener('change', function () { state.statusFilter = this.value; render(root); });
      root.querySelector('#stk-only-low').addEventListener('click', function () { state.onlyLow = !state.onlyLow; render(root); });

      root.querySelectorAll('.stk-min-input').forEach(function (inp) {
        inp.addEventListener('change', function () {
          var pid = inp.getAttribute('data-id');
          var val = Math.max(0, Math.floor(Number(inp.value) || 0));
          inp.value = val;
          db.products.update(pid, { stokMin: val }, tid);
          UKUtils.toast('Stok minimum diperbarui.', 'success');
          window.UK.refreshShell();
          render(root);
        });
      });

      root.querySelectorAll('.stk-act').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var prod = db.products.get(btn.getAttribute('data-id'), tid);
          if (prod) openStockAdjustModal(tid, prod, btn.getAttribute('data-mode'), function () { render(root); });
        });
      });
    } else {
      root.querySelector('#stk-hist-type').addEventListener('change', function () { state.histType = this.value; render(root); });
      root.querySelector('#stk-hist-from').addEventListener('change', function () { state.histFrom = this.value; render(root); });
      root.querySelector('#stk-hist-to').addEventListener('change', function () { state.histTo = this.value; render(root); });
      root.querySelector('#stk-export-csv').addEventListener('click', function () {
        var rows = [['Waktu', 'Produk', 'Tipe', 'Jumlah', 'Saldo Sesudah', 'Catatan']];
        histFiltered.forEach(function (m) {
          var pr = prodMap[m.productId];
          rows.push([
            UKUtils.tanggalIndo(m.waktu, true),
            pr ? pr.nama : m.productId,
            m.tipe,
            m.jumlah,
            m.saldoSesudah != null ? m.saldoSesudah : '',
            m.catatan || ''
          ]);
        });
        UKUtils.downloadCSV('riwayat-stok.csv', rows);
      });
    }
  }

  window.UK.registerModule('stok', { render: render });
})();
