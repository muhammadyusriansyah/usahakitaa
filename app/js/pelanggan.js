/* Modul Pelanggan & Piutang — UsahaKita */
(function () {
  'use strict';

  var state = {
    search: '',
    onlyDebt: false
  };

  function openCustomerModal(tid, cust, onSaved) {
    var isEdit = Boolean(cust);
    var modalId = 'uk-cust-modal';
    var el = UKUtils.openModal({
      id: modalId,
      size: 'sm',
      title: isEdit ? 'Ubah Data Pelanggan' : 'Tambah Pelanggan',
      bodyHTML:
        '<div class="field"><label for="cst-nama">Nama Pelanggan *</label><input type="text" id="cst-nama" value="' + UKUtils.escapeHTML((cust && cust.nama) || '') + '" required /></div>' +
        '<div class="field" style="margin-bottom:0"><label for="cst-tel">Nomor Telepon / WhatsApp *</label><input type="tel" id="cst-tel" value="' + UKUtils.escapeHTML((cust && cust.telepon) || '') + '" placeholder="0812..." required /></div>',
      footerHTML:
        '<button type="button" class="btn btn-light" data-cancel-cst>Batal</button>' +
        '<button type="button" class="btn btn-primary" data-save-cst>' + (isEdit ? 'Simpan' : 'Tambah') + '</button>'
    });
    el.querySelector('[data-cancel-cst]').addEventListener('click', function () { UKUtils.closeModal(modalId); });
    el.querySelector('[data-save-cst]').addEventListener('click', function () {
      var nama = UKUtils.cleanSpaces(el.querySelector('#cst-nama').value);
      var tel = UKUtils.normalisasiWA(el.querySelector('#cst-tel').value);
      if (!nama) { UKUtils.toast('Nama pelanggan wajib diisi.', 'error'); return; }
      if (!tel || tel.length < 9) { UKUtils.toast('Nomor telepon tidak valid.', 'error'); return; }

      var dup = db.customers.list({ tenantId: tid }).some(function (c) {
        return (!isEdit || c.id !== cust.id) && c.telepon === tel;
      });
      if (dup) { UKUtils.toast('Nomor telepon sudah digunakan pelanggan lain.', 'error'); return; }

      if (isEdit) {
        db.customers.update(cust.id, { nama: nama, telepon: tel }, tid);
        UKUtils.toast('Data pelanggan diperbarui.', 'success');
      } else {
        db.customers.create({
          tenantId: tid,
          nama: nama,
          telepon: tel,
          piutang: 0,
          riwayatPiutang: []
        });
        UKUtils.toast('Pelanggan baru ditambahkan.', 'success');
      }
      UKUtils.closeModal(modalId);
      if (onSaved) onSaved();
    });
  }

  function openCustomerDrawer(tid, custId, onChanged) {
    var cust = db.customers.get(custId, tid);
    if (!cust) return;
    var tenant = window.UK.getTenant();
    var existing = document.getElementById('uk-cust-drawer');
    if (existing) existing.remove();

    var trxList = db.transactions.list({ tenantId: tid })
      .filter(function (t) { return t.pelangganId === cust.id; })
      .sort(function (a, b) { return new Date(b.waktu) - new Date(a.waktu); });

    var doneTrx = trxList.filter(function (t) { return t.status === 'Selesai'; });
    var totalSpend = doneTrx.reduce(function (s, t) { return s + (Number(t.total) || 0); }, 0);
    var debt = Number(cust.piutang) || 0;
    var debtHist = Array.isArray(cust.riwayatPiutang) ? cust.riwayatPiutang : [];

    var waText = 'Halo ' + cust.nama + ', terima kasih telah berbelanja di ' + tenant.nama + '.' +
      (debt > 0 ? (' Kami ingin menginformasikan sisa tagihan piutang sebesar ' + UKUtils.rupiah(debt) + '.') : '');

    var backdrop = document.createElement('div');
    backdrop.id = 'uk-cust-drawer';
    backdrop.className = 'drawer-backdrop';
    backdrop.innerHTML =
      '<div class="drawer" role="dialog" aria-modal="true" aria-label="Detail Pelanggan">' +
        '<div class="modal-header">' +
          '<div>' +
            '<h3 class="modal-title">' + UKUtils.escapeHTML(cust.nama) + '</h3>' +
            '<div style="font-size:12px;color:var(--muted)">+' + UKUtils.escapeHTML(cust.telepon) + '</div>' +
          '</div>' +
          '<button type="button" class="modal-close" id="cst-drw-close" aria-label="Tutup panel">&times;</button>' +
        '</div>' +
        '<div class="modal-body" style="flex:1">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">' +
            '<div class="stat-card" style="padding:10px 12px"><div class="stat-label">Total Belanja</div><div class="stat-value" style="font-size:16px">' + UKUtils.escapeHTML(UKUtils.rupiah(totalSpend)) + '</div><div class="stat-meta">' + doneTrx.length + ' transaksi selesai</div></div>' +
            '<div class="stat-card" style="padding:10px 12px"><div class="stat-label">Sisa Piutang</div><div class="stat-value" style="font-size:16px;color:' + (debt > 0 ? 'var(--red)' : 'var(--green)') + '">' + UKUtils.escapeHTML(UKUtils.rupiah(debt)) + '</div></div>' +
          '</div>' +

          (debt > 0 ? (
            '<div style="background:var(--amber-soft);border:1px solid #f0d7a8;border-radius:10px;padding:12px;margin-bottom:14px">' +
              '<div style="font-weight:700;font-size:12.5px;margin-bottom:8px">Catat Pembayaran Piutang</div>' +
              '<div style="display:flex;gap:6px;margin-bottom:6px">' +
                '<input type="number" id="cst-pay-amt" class="uk-input tabular-nums" min="1" max="' + debt + '" value="' + debt + '" placeholder="Nominal bayar" />' +
                '<button type="button" class="btn btn-primary btn-sm" id="cst-pay-btn">Bayar</button>' +
              '</div>' +
              '<input type="text" id="cst-pay-note" class="uk-input" placeholder="Catatan pembayaran (opsional)" />' +
            '</div>'
          ) : '') +

          '<div style="margin-bottom:14px">' +
            '<div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px">RIWAYAT PIUTANG</div>' +
            (debtHist.length ? debtHist.map(function (h) {
              var isPay = h.tipe === 'bayar';
              return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line);font-size:12px">' +
                '<div><strong>' + (isPay ? 'Pembayaran' : 'Tagihan') + '</strong> · ' + UKUtils.escapeHTML(h.catatan || '-') + '<div style="color:var(--muted);font-size:11px">' + UKUtils.escapeHTML(UKUtils.tanggalIndo(h.waktu, true)) + '</div></div>' +
                '<strong class="tabular-nums" style="color:' + (isPay ? 'var(--green)' : 'var(--red)') + '">' + (isPay ? '−' : '+') + UKUtils.escapeHTML(UKUtils.rupiah(h.jumlah)) + '</strong>' +
              '</div>';
            }).join('') : '<div style="font-size:12px;color:var(--muted)">Belum ada catatan piutang.</div>') +
          '</div>' +

          '<div>' +
            '<div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px">RIWAYAT TRANSAKSI (' + trxList.length + ')</div>' +
            (trxList.length ? trxList.slice(0, 10).map(function (t) {
              return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line);font-size:12px">' +
                '<div><strong>' + UKUtils.escapeHTML(t.id) + '</strong> · ' + UKUtils.escapeHTML(t.status) + '<div style="color:var(--muted);font-size:11px">' + UKUtils.escapeHTML(UKUtils.tanggalIndo(t.waktu, true)) + '</div></div>' +
                '<strong class="tabular-nums">' + UKUtils.escapeHTML(UKUtils.rupiah(t.total)) + '</strong>' +
              '</div>';
            }).join('') : '<div style="font-size:12px;color:var(--muted)">Belum ada transaksi.</div>') +
          '</div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<a href="' + UKUtils.escapeHTML(UKUtils.buatLinkWA(cust.telepon, waText)) + '" target="_blank" rel="noopener" class="btn btn-primary">Hubungi via WhatsApp</a>' +
        '</div>' +
      '</div>';

    document.body.appendChild(backdrop);
    function closeDrw() { backdrop.remove(); }
    backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) closeDrw(); });
    backdrop.querySelector('#cst-drw-close').addEventListener('click', closeDrw);

    var payBtn = backdrop.querySelector('#cst-pay-btn');
    if (payBtn) {
      payBtn.addEventListener('click', function () {
        var amt = Math.floor(Number(backdrop.querySelector('#cst-pay-amt').value));
        var note = UKUtils.cleanSpaces(backdrop.querySelector('#cst-pay-note').value) || 'Pembayaran piutang';
        if (isNaN(amt) || amt <= 0) {
          UKUtils.toast('Nominal pembayaran harus lebih dari 0.', 'error');
          return;
        }
        if (amt > debt) {
          UKUtils.toast('Pembayaran tidak boleh melebihi sisa piutang (' + UKUtils.rupiah(debt) + ').', 'error');
          return;
        }
        var nextDebt = debt - amt;
        var nextHist = debtHist.slice();
        nextHist.unshift({ waktu: new Date().toISOString(), jumlah: amt, tipe: 'bayar', catatan: note });
        db.customers.update(cust.id, { piutang: nextDebt, riwayatPiutang: nextHist }, tid);
        UKUtils.toast('Pembayaran piutang dicatat.', 'success');
        closeDrw();
        openCustomerDrawer(tid, cust.id, onChanged);
        if (onChanged) onChanged();
      });
    }
  }

  function render(root) {
    var tid = window.UK.getSession().tenantId;
    var customers = db.customers.list({ tenantId: tid });
    var transactions = db.transactions.list({ tenantId: tid }).filter(function (t) { return t.status === 'Selesai'; });

    var cutoff30 = new Date();
    cutoff30.setDate(cutoff30.getDate() - 30);

    var enriched = customers.map(function (c) {
      var cTrx = transactions.filter(function (t) { return t.pelangganId === c.id; });
      var totalSpend = cTrx.reduce(function (s, t) { return s + (Number(t.total) || 0); }, 0);
      var lastDate = cTrx.length
        ? cTrx.reduce(function (latest, t) { return new Date(t.waktu) > new Date(latest) ? t.waktu : latest; }, cTrx[0].waktu)
        : null;
      var active30 = (lastDate && new Date(lastDate) >= cutoff30) || (c.dibuatPada && new Date(c.dibuatPada) >= cutoff30);
      return {
        raw: c,
        trxCount: cTrx.length,
        totalSpend: totalSpend,
        lastDate: lastDate,
        active30: active30
      };
    });

    var activeCount = enriched.filter(function (e) { return e.active30; }).length;
    var totalDebt = enriched.reduce(function (s, e) { return s + (Number(e.raw.piutang) || 0); }, 0);

    var q = state.search.trim().toLowerCase();
    var filtered = enriched.filter(function (e) {
      if (state.onlyDebt && !(Number(e.raw.piutang) > 0)) return false;
      if (q && (e.raw.nama + ' ' + e.raw.telepon).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });

    var rowsHTML = filtered.length ? filtered.map(function (e) {
      var c = e.raw;
      var debt = Number(c.piutang) || 0;
      return (
        '<tr class="is-clickable cst-row" data-id="' + UKUtils.escapeHTML(c.id) + '">' +
          '<td><strong>' + UKUtils.escapeHTML(c.nama) + '</strong></td>' +
          '<td class="tabular-nums">+' + UKUtils.escapeHTML(c.telepon) + '</td>' +
          '<td class="num">' + e.trxCount + '</td>' +
          '<td class="num"><strong>' + UKUtils.escapeHTML(UKUtils.rupiah(e.totalSpend)) + '</strong></td>' +
          '<td class="num" style="color:' + (debt > 0 ? 'var(--red)' : 'var(--muted)') + ';font-weight:' + (debt > 0 ? '700' : '400') + '">' + UKUtils.escapeHTML(UKUtils.rupiah(debt)) + '</td>' +
          '<td>' + (e.lastDate ? UKUtils.escapeHTML(UKUtils.tanggalIndo(e.lastDate)) : '-') + '</td>' +
          '<td><span class="status ' + (e.active30 ? 'success' : 'neutral') + '">' + (e.active30 ? 'Aktif' : 'Tidak aktif') + '</span></td>' +
          '<td style="text-align:right;white-space:nowrap">' +
            '<button type="button" class="btn btn-light btn-sm cst-edit" data-id="' + UKUtils.escapeHTML(c.id) + '">Ubah</button> ' +
            '<button type="button" class="btn btn-ghost btn-sm cst-del" data-id="' + UKUtils.escapeHTML(c.id) + '" style="color:var(--red)">Hapus</button>' +
          '</td>' +
        '</tr>'
      );
    }).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">Tidak ada pelanggan ditemukan.</td></tr>';

    root.innerHTML =
      '<div class="page-header">' +
        '<div>' +
          '<h1 class="page-title">Pelanggan &amp; Piutang</h1>' +
          '<p class="page-subtitle">Klik baris pelanggan untuk melihat riwayat transaksi dan mencatat pembayaran piutang.</p>' +
        '</div>' +
        '<button type="button" class="btn btn-primary" id="cst-btn-add">+ Tambah Pelanggan</button>' +
      '</div>' +

      '<div class="stats-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:16px">' +
        '<div class="stat-card"><div class="stat-label">Total Pelanggan</div><div class="stat-value">' + customers.length + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">Pelanggan Aktif (30 Hari)</div><div class="stat-value" style="color:var(--green)">' + activeCount + '</div></div>' +
        '<div class="stat-card"><div class="stat-label">Total Piutang Berjalan</div><div class="stat-value" style="color:' + (totalDebt > 0 ? 'var(--red)' : 'var(--ink)') + '">' + UKUtils.escapeHTML(UKUtils.rupiah(totalDebt)) + '</div></div>' +
      '</div>' +

      '<div class="panel">' +
        '<div class="toolbar">' +
          '<div class="toolbar-group">' +
            '<input type="search" id="cst-search" class="uk-input" placeholder="Cari nama atau nomor telepon..." value="' + UKUtils.escapeHTML(state.search) + '" style="width:240px" />' +
            '<button type="button" class="chip ' + (state.onlyDebt ? 'active' : '') + '" id="cst-only-debt">Punya piutang</button>' +
          '</div>' +
        '</div>' +

        '<div class="table-wrap">' +
          '<table class="uk-table">' +
            '<thead><tr><th>Nama</th><th>Telepon</th><th class="num">Transaksi</th><th class="num">Total Belanja</th><th class="num">Piutang</th><th>Transaksi Terakhir</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead>' +
            '<tbody>' + rowsHTML + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';

    root.querySelector('#cst-btn-add').addEventListener('click', function () {
      openCustomerModal(tid, null, function () { render(root); });
    });

    var sEl = root.querySelector('#cst-search');
    sEl.addEventListener('input', UKUtils.debounce(function () {
      state.search = sEl.value;
      render(root);
      var n = root.querySelector('#cst-search');
      if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
    }, 220));

    root.querySelector('#cst-only-debt').addEventListener('click', function () {
      state.onlyDebt = !state.onlyDebt;
      render(root);
    });

    root.querySelectorAll('.cst-edit').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var cust = db.customers.get(btn.getAttribute('data-id'), tid);
        if (cust) openCustomerModal(tid, cust, function () { render(root); });
      });
    });

    root.querySelectorAll('.cst-del').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-id');
        var cust = db.customers.get(id, tid);
        if (!cust) return;
        UKUtils.confirmDialog('Hapus pelanggan "' + cust.nama + '"?', {
          confirmText: 'Ya, Hapus',
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          db.customers.remove(id, tid);
          UKUtils.toast('Pelanggan dihapus.', 'success');
          render(root);
        });
      });
    });

    root.querySelectorAll('.cst-row').forEach(function (row) {
      row.addEventListener('click', function () {
        openCustomerDrawer(tid, row.getAttribute('data-id'), function () { render(root); });
      });
    });
  }

  window.UK.registerModule('pelanggan', { render: render });
})();
