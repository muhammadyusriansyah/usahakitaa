/* Modul Riwayat Transaksi — UsahaKita */
(function () {
  'use strict';

  var state = {
    search: '',
    status: 'semua',
    metode: 'semua',
    from: '',
    to: '',
    sort: 'terbaru',
    page: 1,
    perPage: 10
  };

  function openDetailDrawer(tid, trxId, onUpdated) {
    var trx = db.transactions.get(trxId, tid);
    if (!trx) return;
    var tenant = window.UK.getTenant();
    var settings = window.UK.getSettings();
    var cust = trx.pelangganId ? db.customers.get(trx.pelangganId, tid) : null;

    var existing = document.getElementById('uk-trx-drawer');
    if (existing) existing.remove();

    var stCls = trx.status === 'Selesai' ? 'success' : (trx.status === 'Menunggu' ? 'pending' : 'danger');
    var itemsHTML = (trx.items || []).map(function (it) {
      return (
        '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line);font-size:12.5px">' +
          '<div><strong>' + UKUtils.escapeHTML(it.nama) + '</strong><div style="font-size:11px;color:var(--muted)">' + Number(it.qty) + ' x ' + UKUtils.escapeHTML(UKUtils.rupiah(it.harga)) + '</div></div>' +
          '<strong class="tabular-nums">' + UKUtils.escapeHTML(UKUtils.rupiah(Number(it.qty) * Number(it.harga))) + '</strong>' +
        '</div>'
      );
    }).join('');

    var backdrop = document.createElement('div');
    backdrop.id = 'uk-trx-drawer';
    backdrop.className = 'drawer-backdrop';
    backdrop.innerHTML =
      '<div class="drawer" role="dialog" aria-modal="true" aria-label="Detail Transaksi">' +
        '<div class="modal-header">' +
          '<div>' +
            '<h3 class="modal-title">' + UKUtils.escapeHTML(trx.id) + '</h3>' +
            '<div style="font-size:11.5px;color:var(--muted)">' + UKUtils.escapeHTML(UKUtils.tanggalIndo(trx.waktu, true)) + '</div>' +
          '</div>' +
          '<button type="button" class="modal-close" id="trx-drw-close" aria-label="Tutup panel">&times;</button>' +
        '</div>' +
        '<div class="modal-body" style="flex:1">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
            '<span>Pelanggan: <strong>' + UKUtils.escapeHTML(cust ? cust.nama : 'Pelanggan Umum') + '</strong></span>' +
            '<span class="status ' + stCls + '">' + UKUtils.escapeHTML(trx.status) + '</span>' +
          '</div>' +
          (trx.status === 'Dibatalkan' && trx.alasanBatal
            ? '<div class="banner warning" style="margin-bottom:12px"><span><strong>Alasan Batal:</strong> ' + UKUtils.escapeHTML(trx.alasanBatal) + '</span></div>'
            : '') +
          '<div style="margin-bottom:14px">' +
            '<div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px">ITEM PEMBELIAN</div>' +
            itemsHTML +
          '</div>' +
          '<div style="background:#fafbfd;border:1px solid var(--line);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px;font-size:12.5px">' +
            '<div style="display:flex;justify-content:space-between"><span>Subtotal</span><span class="tabular-nums">' + UKUtils.escapeHTML(UKUtils.rupiah(trx.subtotal)) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between"><span>Diskon</span><span class="tabular-nums">-' + UKUtils.escapeHTML(UKUtils.rupiah(trx.diskon)) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between"><span>Pajak</span><span class="tabular-nums">' + UKUtils.escapeHTML(UKUtils.rupiah(trx.pajak)) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;font-weight:800;font-size:14px;border-top:1px dashed var(--line);padding-top:6px"><span>Total</span><span class="tabular-nums">' + UKUtils.escapeHTML(UKUtils.rupiah(trx.total)) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between"><span>Metode (' + UKUtils.escapeHTML(trx.metode) + ')</span><span class="tabular-nums">' + UKUtils.escapeHTML(UKUtils.rupiah(trx.dibayar)) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between"><span>Kembalian</span><span class="tabular-nums">' + UKUtils.escapeHTML(UKUtils.rupiah(trx.kembalian)) + '</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer" style="flex-wrap:wrap">' +
          '<button type="button" class="btn btn-light" id="trx-drw-print">Cetak Ulang Struk</button>' +
          (trx.status === 'Menunggu' ? '<button type="button" class="btn btn-primary" id="trx-drw-complete">Tandai Selesai</button>' : '') +
          (trx.status !== 'Dibatalkan' ? '<button type="button" class="btn btn-danger" id="trx-drw-cancel">Batalkan</button>' : '') +
        '</div>' +
      '</div>';

    document.body.appendChild(backdrop);

    function closeDrw() { backdrop.remove(); }
    backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) closeDrw(); });
    backdrop.querySelector('#trx-drw-close').addEventListener('click', closeDrw);

    backdrop.querySelector('#trx-drw-print').addEventListener('click', function () {
      UKUtils.cetakStruk(trx, tenant, settings);
    });

    var completeBtn = backdrop.querySelector('#trx-drw-complete');
    if (completeBtn) {
      completeBtn.addEventListener('click', function () {
        db.transactions.update(trx.id, { status: 'Selesai' }, tid);
        UKUtils.toast('Status transaksi diubah menjadi Selesai.', 'success');
        closeDrw();
        if (onUpdated) onUpdated();
      });
    }

    var cancelBtn = backdrop.querySelector('#trx-drw-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        var modalId = 'uk-trx-cancel-modal';
        var mEl = UKUtils.openModal({
          id: modalId,
          size: 'sm',
          title: 'Batalkan Transaksi ' + trx.id,
          bodyHTML:
            '<p style="margin:0 0 10px;font-size:12.5px;color:var(--muted)">Stok produk pada transaksi ini akan dikembalikan otomatis ke persediaan.</p>' +
            '<div class="field" style="margin-bottom:0"><label for="trx-cancel-reason">Alasan Pembatalan *</label><textarea id="trx-cancel-reason" rows="2" placeholder="Contoh: Salah input item" required></textarea></div>',
          footerHTML:
            '<button type="button" class="btn btn-light" data-no-cancel>Tutup</button>' +
            '<button type="button" class="btn btn-danger" data-yes-cancel>Konfirmasi Batalkan</button>'
        });
        mEl.querySelector('[data-no-cancel]').addEventListener('click', function () { UKUtils.closeModal(modalId); });
        mEl.querySelector('[data-yes-cancel]').addEventListener('click', function () {
          var reason = UKUtils.cleanSpaces(mEl.querySelector('#trx-cancel-reason').value);
          if (!reason) {
            UKUtils.toast('Alasan pembatalan wajib diisi.', 'error');
            return;
          }
          (trx.items || []).forEach(function (it) {
            var prod = db.products.get(it.productId, tid);
            if (!prod) return;
            var nextStok = (Number(prod.stok) || 0) + (Number(it.qty) || 0);
            db.products.update(prod.id, { stok: nextStok }, tid);
            db.stockMovements.create({
              tenantId: tid,
              productId: prod.id,
              tipe: 'masuk',
              jumlah: Number(it.qty) || 0,
              saldoSesudah: nextStok,
              catatan: 'Pengembalian batal ' + trx.id + ': ' + reason,
              waktu: new Date().toISOString()
            });
          });
          db.transactions.update(trx.id, { status: 'Dibatalkan', alasanBatal: reason }, tid);
          UKUtils.closeModal(modalId);
          closeDrw();
          UKUtils.toast('Transaksi dibatalkan dan stok dikembalikan.', 'success');
          window.UK.refreshShell();
          if (onUpdated) onUpdated();
        });
      });
    }
  }

  function render(root) {
    var tid = window.UK.getSession().tenantId;
    var allTrx = db.transactions.list({ tenantId: tid });
    var customers = db.customers.list({ tenantId: tid });
    var custMap = {};
    customers.forEach(function (c) { custMap[c.id] = c.nama; });

    var q = state.search.trim().toLowerCase();
    var filtered = allTrx.filter(function (t) {
      if (state.status !== 'semua' && t.status !== state.status) return false;
      if (state.metode !== 'semua' && t.metode !== state.metode) return false;
      var dStr = String(t.waktu || '').slice(0, 10);
      if (state.from && dStr < state.from) return false;
      if (state.to && dStr > state.to) return false;
      if (q) {
        var cName = (t.pelangganId && custMap[t.pelangganId]) ? custMap[t.pelangganId] : 'umum';
        if ((t.id + ' ' + cName).toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      if (state.sort === 'terlama') return new Date(a.waktu) - new Date(b.waktu);
      if (state.sort === 'total_desc') return Number(b.total) - Number(a.total);
      if (state.sort === 'total_asc') return Number(a.total) - Number(b.total);
      return new Date(b.waktu) - new Date(a.waktu);
    });

    var filteredSum = filtered.reduce(function (s, t) {
      return t.status === 'Dibatalkan' ? s : s + (Number(t.total) || 0);
    }, 0);

    var totalPages = Math.max(1, Math.ceil(filtered.length / state.perPage));
    if (state.page > totalPages) state.page = totalPages;
    var startIdx = (state.page - 1) * state.perPage;
    var paged = filtered.slice(startIdx, startIdx + state.perPage);

    var pageButtons = '';
    for (var pg = 1; pg <= totalPages; pg++) {
      pageButtons += '<button type="button" class="page-btn ' + (pg === state.page ? 'active' : '') + '" data-page="' + pg + '">' + pg + '</button>';
    }

    var rowsHTML = paged.length ? paged.map(function (t) {
      var stCls = t.status === 'Selesai' ? 'success' : (t.status === 'Menunggu' ? 'pending' : 'danger');
      var itemQty = (t.items || []).reduce(function (s, i) { return s + (Number(i.qty) || 0); }, 0);
      var custName = (t.pelangganId && custMap[t.pelangganId]) ? custMap[t.pelangganId] : 'Pelanggan Umum';
      return (
        '<tr class="is-clickable trx-row" data-id="' + UKUtils.escapeHTML(t.id) + '">' +
          '<td><strong>' + UKUtils.escapeHTML(t.id) + '</strong></td>' +
          '<td>' + UKUtils.escapeHTML(UKUtils.tanggalIndo(t.waktu, true)) + '</td>' +
          '<td>' + UKUtils.escapeHTML(custName) + '</td>' +
          '<td class="num">' + itemQty + '</td>' +
          '<td>' + UKUtils.escapeHTML(t.metode) + '</td>' +
          '<td class="num"><strong>' + UKUtils.escapeHTML(UKUtils.rupiah(t.total)) + '</strong></td>' +
          '<td><span class="status ' + stCls + '">' + UKUtils.escapeHTML(t.status) + '</span></td>' +
        '</tr>'
      );
    }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">Tidak ada transaksi sesuai filter.</td></tr>';

    root.innerHTML =
      '<div class="page-header">' +
        '<div>' +
          '<h1 class="page-title">Riwayat Transaksi</h1>' +
          '<p class="page-subtitle">Klik baris transaksi untuk melihat detail, cetak ulang struk, atau membatalkan transaksi.</p>' +
        '</div>' +
        '<button type="button" class="btn btn-light" id="trx-export-csv">Ekspor CSV</button>' +
      '</div>' +

      '<div class="panel">' +
        '<div class="toolbar">' +
          '<div class="toolbar-group">' +
            '<input type="search" id="trx-search" class="uk-input" placeholder="Cari ID nota / pelanggan..." value="' + UKUtils.escapeHTML(state.search) + '" style="width:200px" />' +
            '<select id="trx-status" class="uk-select" style="width:auto">' +
              '<option value="semua"' + (state.status === 'semua' ? ' selected' : '') + '>Semua Status</option>' +
              '<option value="Selesai"' + (state.status === 'Selesai' ? ' selected' : '') + '>Selesai</option>' +
              '<option value="Menunggu"' + (state.status === 'Menunggu' ? ' selected' : '') + '>Menunggu</option>' +
              '<option value="Dibatalkan"' + (state.status === 'Dibatalkan' ? ' selected' : '') + '>Dibatalkan</option>' +
            '</select>' +
            '<select id="trx-metode" class="uk-select" style="width:auto">' +
              '<option value="semua"' + (state.metode === 'semua' ? ' selected' : '') + '>Semua Metode</option>' +
              '<option value="Tunai"' + (state.metode === 'Tunai' ? ' selected' : '') + '>Tunai</option>' +
              '<option value="QRIS"' + (state.metode === 'QRIS' ? ' selected' : '') + '>QRIS</option>' +
              '<option value="Transfer"' + (state.metode === 'Transfer' ? ' selected' : '') + '>Transfer</option>' +
            '</select>' +
            '<input type="date" id="trx-from" class="uk-input" value="' + UKUtils.escapeHTML(state.from) + '" style="width:auto" aria-label="Dari tanggal" />' +
            '<input type="date" id="trx-to" class="uk-input" value="' + UKUtils.escapeHTML(state.to) + '" style="width:auto" aria-label="Sampai tanggal" />' +
            '<select id="trx-sort" class="uk-select" style="width:auto">' +
              '<option value="terbaru"' + (state.sort === 'terbaru' ? ' selected' : '') + '>Terbaru</option>' +
              '<option value="terlama"' + (state.sort === 'terlama' ? ' selected' : '') + '>Terlama</option>' +
              '<option value="total_desc"' + (state.sort === 'total_desc' ? ' selected' : '') + '>Total Tertinggi</option>' +
              '<option value="total_asc"' + (state.sort === 'total_asc' ? ' selected' : '') + '>Total Terendah</option>' +
            '</select>' +
          '</div>' +
        '</div>' +

        '<div class="table-wrap">' +
          '<table class="uk-table">' +
            '<thead><tr><th>ID Nota</th><th>Tanggal</th><th>Pelanggan</th><th class="num">Item</th><th>Metode</th><th class="num">Total</th><th>Status</th></tr></thead>' +
            '<tbody>' + rowsHTML + '</tbody>' +
            '<tfoot><tr><td colspan="5">Total Nilai Terfilter (non-batal)</td><td class="num">' + UKUtils.escapeHTML(UKUtils.rupiah(filteredSum)) + '</td><td></td></tr></tfoot>' +
          '</table>' +
        '</div>' +

        '<div class="pagination">' +
          '<span>Menampilkan ' + (filtered.length ? (startIdx + 1) : 0) + '–' + Math.min(startIdx + state.perPage, filtered.length) + ' dari ' + filtered.length + ' transaksi</span>' +
          '<div class="pagination-pages">' +
            '<button type="button" class="page-btn" data-page="' + (state.page - 1) + '"' + (state.page <= 1 ? ' disabled' : '') + '>&lsaquo;</button>' +
            pageButtons +
            '<button type="button" class="page-btn" data-page="' + (state.page + 1) + '"' + (state.page >= totalPages ? ' disabled' : '') + '>&rsaquo;</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var sInp = root.querySelector('#trx-search');
    sInp.addEventListener('input', UKUtils.debounce(function () {
      state.search = sInp.value;
      state.page = 1;
      render(root);
      var next = root.querySelector('#trx-search');
      if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
    }, 220));

    root.querySelector('#trx-status').addEventListener('change', function () { state.status = this.value; state.page = 1; render(root); });
    root.querySelector('#trx-metode').addEventListener('change', function () { state.metode = this.value; state.page = 1; render(root); });
    root.querySelector('#trx-from').addEventListener('change', function () { state.from = this.value; state.page = 1; render(root); });
    root.querySelector('#trx-to').addEventListener('change', function () { state.to = this.value; state.page = 1; render(root); });
    root.querySelector('#trx-sort').addEventListener('change', function () { state.sort = this.value; state.page = 1; render(root); });

    root.querySelectorAll('[data-page]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        state.page = Number(btn.getAttribute('data-page'));
        render(root);
      });
    });

    root.querySelectorAll('.trx-row').forEach(function (row) {
      row.addEventListener('click', function () {
        openDetailDrawer(tid, row.getAttribute('data-id'), function () { render(root); });
      });
    });

    root.querySelector('#trx-export-csv').addEventListener('click', function () {
      var rows = [['ID Nota', 'Tanggal', 'Pelanggan', 'Jumlah Item', 'Metode', 'Subtotal', 'Diskon', 'Pajak', 'Total', 'Status']];
      filtered.forEach(function (t) {
        var qty = (t.items || []).reduce(function (s, i) { return s + (Number(i.qty) || 0); }, 0);
        rows.push([
          t.id,
          UKUtils.tanggalIndo(t.waktu, true),
          (t.pelangganId && custMap[t.pelangganId]) ? custMap[t.pelangganId] : 'Pelanggan Umum',
          qty,
          t.metode,
          t.subtotal,
          t.diskon,
          t.pajak,
          t.total,
          t.status
        ]);
      });
      UKUtils.downloadCSV('riwayat-transaksi.csv', rows);
    });
  }

  window.UK.registerModule('transaksi', { render: render });
})();
