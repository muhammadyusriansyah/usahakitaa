/* Modul Kasir / POS — UsahaKita */
(function () {
  'use strict';

  var cart = [];
  var selectedCat = 'semua';
  var searchQuery = '';
  var selectedCustomerId = '';
  var discountType = 'rp'; /* 'rp' | 'pct' */
  var discountVal = 0;
  var payMethod = 'Tunai';
  var cashReceived = 0;
  var keyHandlerRef = null;

  function holdStorageKey(tid) {
    return 'uk_pos_held_' + tid;
  }

  function getHeldList(tid) {
    try {
      var raw = localStorage.getItem(holdStorageKey(tid));
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveHeldList(tid, list) {
    try {
      localStorage.setItem(holdStorageKey(tid), JSON.stringify(list));
    } catch (_) {}
  }

  function calcTotals(settings) {
    var subtotal = cart.reduce(function (s, it) {
      return s + (Number(it.qty) || 0) * (Number(it.harga) || 0);
    }, 0);
    var dVal = Math.max(0, Number(discountVal) || 0);
    var diskon = discountType === 'pct'
      ? Math.round(subtotal * (Math.min(100, dVal) / 100))
      : Math.min(subtotal, dVal);
    var dpp = Math.max(0, subtotal - diskon);
    var pajakPersen = Math.max(0, Number(settings.pajakPersen) || 0);
    var pajak = Math.round(dpp * (pajakPersen / 100));
    var total = dpp + pajak;
    var dibayar = Math.max(0, Number(cashReceived) || 0);
    var kembalian = Math.max(0, dibayar - total);
    return {
      subtotal: subtotal,
      diskon: diskon,
      pajakPersen: pajakPersen,
      pajak: pajak,
      total: total,
      dibayar: dibayar,
      kembalian: kembalian
    };
  }

  function addProductToCart(tid, prod, variantObj, root) {
    if (!prod || prod.stok <= 0) {
      UKUtils.toast('Stok produk habis.', 'warning');
      return;
    }
    var varName = variantObj ? variantObj.nama : '';
    var unitPrice = Number(prod.hargaJual) + (variantObj ? Number(variantObj.hargaTambahan) || 0 : 0);
    var itemName = varName ? (prod.nama + ' (' + varName + ')') : prod.nama;
    var key = prod.id + '::' + varName;

    var existing = cart.find(function (c) { return c.key === key; });
    var totalQtyForProd = cart
      .filter(function (c) { return c.productId === prod.id; })
      .reduce(function (s, c) { return s + c.qty; }, 0);

    if (totalQtyForProd + 1 > Number(prod.stok)) {
      UKUtils.toast('Jumlah melebihi stok tersedia (' + prod.stok + ').', 'warning');
      return;
    }

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        key: key,
        productId: prod.id,
        nama: itemName,
        harga: unitPrice,
        hargaBeli: Number(prod.hargaBeli) || 0,
        qty: 1,
        maxStok: Number(prod.stok)
      });
    }
    if (payMethod !== 'Tunai') {
      var settings = window.UK.getSettings();
      cashReceived = calcTotals(settings).total;
    }
    render(root);
  }

  function openVariantPicker(tid, prod, root) {
    var modalId = 'uk-pos-var-modal';
    var optsHTML = '<button type="button" class="btn btn-light" data-var-idx="-1" style="justify-content:space-between;width:100%"><span>Standar</span><strong>' + UKUtils.escapeHTML(UKUtils.rupiah(prod.hargaJual)) + '</strong></button>';
    (prod.varian || []).forEach(function (v, idx) {
      var pr = Number(prod.hargaJual) + (Number(v.hargaTambahan) || 0);
      optsHTML += '<button type="button" class="btn btn-light" data-var-idx="' + idx + '" style="justify-content:space-between;width:100%"><span>' + UKUtils.escapeHTML(v.nama) + '</span><strong>' + UKUtils.escapeHTML(UKUtils.rupiah(pr)) + '</strong></button>';
    });
    var el = UKUtils.openModal({
      id: modalId,
      size: 'sm',
      title: 'Pilih Varian — ' + prod.nama,
      bodyHTML: '<div style="display:flex;flex-direction:column;gap:8px">' + optsHTML + '</div>'
    });
    el.querySelectorAll('[data-var-idx]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.getAttribute('data-var-idx'));
        var v = idx >= 0 ? prod.varian[idx] : null;
        UKUtils.closeModal(modalId);
        addProductToCart(tid, prod, v, root);
      });
    });
  }

  function openQuickCustomerModal(tid, onCreated) {
    var modalId = 'uk-pos-cust-modal';
    var el = UKUtils.openModal({
      id: modalId,
      size: 'sm',
      title: 'Tambah Pelanggan Cepat',
      bodyHTML:
        '<div class="field"><label for="qcust-nama">Nama Pelanggan *</label><input type="text" id="qcust-nama" required /></div>' +
        '<div class="field" style="margin-bottom:0"><label for="qcust-tel">Nomor WhatsApp / Telepon *</label><input type="tel" id="qcust-tel" placeholder="0812..." required /></div>',
      footerHTML:
        '<button type="button" class="btn btn-light" data-cancel-qcust>Batal</button>' +
        '<button type="button" class="btn btn-primary" data-save-qcust>Simpan</button>'
    });
    el.querySelector('[data-cancel-qcust]').addEventListener('click', function () { UKUtils.closeModal(modalId); });
    el.querySelector('[data-save-qcust]').addEventListener('click', function () {
      var nama = UKUtils.cleanSpaces(el.querySelector('#qcust-nama').value);
      var tel = UKUtils.normalisasiWA(el.querySelector('#qcust-tel').value);
      if (!nama) { UKUtils.toast('Nama pelanggan wajib diisi.', 'error'); return; }
      if (!tel || tel.length < 9) { UKUtils.toast('Nomor telepon tidak valid.', 'error'); return; }
      var dup = db.customers.list({ tenantId: tid }).some(function (c) { return c.telepon === tel; });
      if (dup) { UKUtils.toast('Nomor telepon sudah terdaftar.', 'error'); return; }
      var created = db.customers.create({
        tenantId: tid,
        nama: nama,
        telepon: tel,
        piutang: 0,
        riwayatPiutang: []
      });
      UKUtils.closeModal(modalId);
      UKUtils.toast('Pelanggan ditambahkan.', 'success');
      if (onCreated) onCreated(created);
    });
  }

  function showReceiptModal(trx, tenant, settings, root) {
    var modalId = 'uk-pos-receipt-modal';
    var el = UKUtils.openModal({
      id: modalId,
      size: 'sm',
      title: 'Transaksi Berhasil — ' + trx.id,
      bodyHTML: UKUtils.renderStrukHTML(trx, tenant, settings),
      footerHTML:
        '<button type="button" class="btn btn-light" id="rcp-print">Cetak</button>' +
        '<button type="button" class="btn btn-light" id="rcp-pdf">Unduh PDF</button>' +
        '<button type="button" class="btn btn-primary" id="rcp-new">Transaksi Baru</button>'
    });
    el.querySelector('#rcp-print').addEventListener('click', function () {
      UKUtils.cetakStruk(trx, tenant, settings);
    });
    el.querySelector('#rcp-pdf').addEventListener('click', function () {
      UKUtils.toast('Pilih "Simpan sebagai PDF" pada dialog cetak.', 'info');
      UKUtils.cetakStruk(trx, tenant, settings);
    });
    el.querySelector('#rcp-new').addEventListener('click', function () {
      UKUtils.closeModal(modalId);
      render(root);
    });
  }

  function render(root) {
    var session = window.UK.getSession();
    var tenant = window.UK.getTenant();
    var settings = window.UK.getSettings();
    var tid = session.tenantId;

    var allProds = db.products.list({ tenantId: tid }).filter(function (p) { return p.status !== 'diarsipkan'; });
    var cats = db.categories.list({ tenantId: tid });
    var customers = db.customers.list({ tenantId: tid });
    var heldList = getHeldList(tid);

    var metodeList = (Array.isArray(settings.metodeAktif) && settings.metodeAktif.length) ? settings.metodeAktif : ['Tunai', 'QRIS', 'Transfer'];
    if (metodeList.indexOf(payMethod) === -1) payMethod = metodeList[0];

    var q = searchQuery.trim().toLowerCase();
    var filtered = allProds.filter(function (p) {
      if (selectedCat !== 'semua' && p.kategoriId !== selectedCat) return false;
      if (q) {
        var hay = (p.nama + ' ' + p.kode + ' ' + (p.barcode || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    var totals = calcTotals(settings);
    if (payMethod !== 'Tunai' && cashReceived === 0 && totals.total > 0) {
      cashReceived = totals.total;
      totals = calcTotals(settings);
    }

    var catChipsHTML = '<button type="button" class="chip ' + (selectedCat === 'semua' ? 'active' : '') + '" data-pos-cat="semua">Semua</button>' +
      cats.map(function (c) {
        return '<button type="button" class="chip ' + (selectedCat === c.id ? 'active' : '') + '" data-pos-cat="' + UKUtils.escapeHTML(c.id) + '">' + UKUtils.escapeHTML(c.nama) + '</button>';
      }).join('');

    var gridHTML = filtered.length ? filtered.map(function (p) {
      var habis = Number(p.stok) <= 0;
      var imgBox = p.foto
        ? '<img src="' + UKUtils.escapeHTML(p.foto) + '" alt="' + UKUtils.escapeHTML(p.nama) + '" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px" />'
        : '<div style="width:100%;aspect-ratio:1/1;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:28px">' + UKUtils.escapeHTML(p.emoji || '📦') + '</div>';
      return (
        '<button type="button" class="card pos-prod-card" data-prod-id="' + UKUtils.escapeHTML(p.id) + '"' + (habis ? ' disabled' : '') + ' style="padding:10px;text-align:left;cursor:' + (habis ? 'not-allowed' : 'pointer') + ';opacity:' + (habis ? '0.48' : '1') + ';display:flex;flex-direction:column;gap:6px">' +
          imgBox +
          '<div style="font-size:12px;font-weight:700;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + UKUtils.escapeHTML(p.nama) + '</div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto">' +
            '<strong class="tabular-nums" style="font-size:12px;color:var(--orange-dark)">' + UKUtils.escapeHTML(UKUtils.rupiah(p.hargaJual)) + '</strong>' +
            '<span style="font-size:10.5px;color:' + (habis ? 'var(--red)' : 'var(--muted)') + '">' + (habis ? 'Habis' : 'Stok ' + p.stok) + '</span>' +
          '</div>' +
        '</button>'
      );
    }).join('') : '<div class="empty-note" style="grid-column:1/-1">Produk tidak ditemukan.</div>';

    var cartHTML = cart.length ? cart.map(function (item, idx) {
      return (
        '<div style="padding:8px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:8px;align-items:center">' +
          '<div style="min-width:0;flex:1">' +
            '<div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + UKUtils.escapeHTML(item.nama) + '</div>' +
            '<div class="tabular-nums" style="font-size:11px;color:var(--muted)">' + UKUtils.escapeHTML(UKUtils.rupiah(item.harga)) + '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:4px">' +
            '<button type="button" class="btn btn-light btn-sm pos-qty-dec" data-idx="' + idx + '" style="min-height:26px;padding:0 8px" aria-label="Kurangi jumlah">−</button>' +
            '<input type="number" class="uk-input pos-qty-inp tabular-nums" data-idx="' + idx + '" value="' + item.qty + '" min="1" max="' + item.maxStok + '" style="width:48px;padding:3px 4px;text-align:center" />' +
            '<button type="button" class="btn btn-light btn-sm pos-qty-inc" data-idx="' + idx + '" style="min-height:26px;padding:0 8px" aria-label="Tambah jumlah">+</button>' +
            '<button type="button" class="btn btn-ghost btn-sm pos-item-del" data-idx="' + idx + '" style="min-height:26px;padding:0 6px;color:var(--red)" aria-label="Hapus item">&times;</button>' +
          '</div>' +
        '</div>'
      );
    }).join('') : '<div class="empty-note" style="padding:20px 10px">Keranjang kosong. Pilih produk di sebelah kiri.</div>';

    var custOpts = '<option value="">Pelanggan Umum (Tanpa Nama)</option>' + customers.map(function (c) {
      return '<option value="' + UKUtils.escapeHTML(c.id) + '"' + (selectedCustomerId === c.id ? ' selected' : '') + '>' + UKUtils.escapeHTML(c.nama) + ' (+' + UKUtils.escapeHTML(c.telepon) + ')</option>';
    }).join('');

    var payChips = metodeList.map(function (m) {
      return '<button type="button" class="chip ' + (payMethod === m ? 'active' : '') + '" data-pay-method="' + UKUtils.escapeHTML(m) + '">' + UKUtils.escapeHTML(m) + '</button>';
    }).join('');

    var shortfall = totals.total - totals.dibayar;
    var creditNote = (shortfall > 0 && selectedCustomerId && cart.length > 0)
      ? '<div style="font-size:11.5px;color:var(--amber);margin-top:4px">Kurang bayar ' + UKUtils.escapeHTML(UKUtils.rupiah(shortfall)) + ' akan dicatat ke piutang pelanggan.</div>'
      : '';

    root.innerHTML =
      '<div class="page-header">' +
        '<div>' +
          '<h1 class="page-title">Kasir / POS</h1>' +
          '<p class="page-subtitle">Pintasan: <strong>F2</strong> fokus cari/barcode · <strong>F9</strong> proses bayar</p>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button type="button" class="btn btn-light" id="pos-btn-resume"' + (heldList.length ? '' : ' disabled') + '>Lanjutkan Tertahan (' + heldList.length + ')</button>' +
          '<button type="button" class="btn btn-light" id="pos-btn-hold"' + (cart.length ? '' : ' disabled') + '>Tahan Transaksi</button>' +
        '</div>' +
      '</div>' +

      '<div class="pos-layout" style="display:grid;grid-template-columns:1.35fr 1fr;gap:16px;align-items:start">' +
        '<section class="panel">' +
          '<div style="display:flex;gap:8px;margin-bottom:10px">' +
            '<input type="search" id="pos-search" class="uk-input" placeholder="Cari nama, kode SKU, atau scan barcode lalu Enter..." value="' + UKUtils.escapeHTML(searchQuery) + '" />' +
          '</div>' +
          '<div class="chips" style="margin-bottom:12px">' + catChipsHTML + '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(138px,1fr));gap:10px">' + gridHTML + '</div>' +
        '</section>' +

        '<section class="panel" style="position:sticky;top:74px">' +
          '<div class="panel-header" style="margin-bottom:10px">' +
            '<h2 class="panel-title">Keranjang Belanja</h2>' +
            (cart.length ? '<button type="button" class="btn btn-ghost btn-sm" id="pos-clear-cart" style="color:var(--red)">Kosongkan</button>' : '') +
          '</div>' +

          '<div style="display:flex;gap:6px;margin-bottom:10px">' +
            '<select id="pos-cust-select" class="uk-select" style="flex:1">' + custOpts + '</select>' +
            '<button type="button" class="btn btn-light btn-sm" id="pos-quick-cust" title="Tambah pelanggan baru">+ Pelanggan</button>' +
          '</div>' +

          '<div style="max-height:240px;overflow-y:auto;margin-bottom:10px">' + cartHTML + '</div>' +

          '<div style="border-top:1px solid var(--line);padding-top:10px;display:flex;flex-direction:column;gap:8px">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12.5px">' +
              '<span>Diskon</span>' +
              '<div style="display:flex;gap:4px;align-items:center">' +
                '<select id="pos-disc-type" class="uk-select" style="width:62px;padding:5px 6px">' +
                  '<option value="rp"' + (discountType === 'rp' ? ' selected' : '') + '>Rp</option>' +
                  '<option value="pct"' + (discountType === 'pct' ? ' selected' : '') + '>%</option>' +
                '</select>' +
                '<input type="number" id="pos-disc-val" class="uk-input tabular-nums" min="0" value="' + Number(discountVal || 0) + '" style="width:105px;padding:5px 8px;text-align:right" />' +
              '</div>' +
            '</div>' +

            '<div style="display:flex;justify-content:space-between;font-size:12.5px"><span>Subtotal</span><span class="tabular-nums">' + UKUtils.escapeHTML(UKUtils.rupiah(totals.subtotal)) + '</span></div>' +
            (totals.diskon > 0 ? '<div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--green)"><span>Diskon</span><span class="tabular-nums">-' + UKUtils.escapeHTML(UKUtils.rupiah(totals.diskon)) + '</span></div>' : '') +
            '<div style="display:flex;justify-content:space-between;font-size:12.5px"><span>Pajak (' + totals.pajakPersen + '%)</span><span class="tabular-nums">' + UKUtils.escapeHTML(UKUtils.rupiah(totals.pajak)) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;padding-top:4px;border-top:1px dashed var(--line)"><span>Total</span><span class="tabular-nums" style="color:var(--orange-dark)">' + UKUtils.escapeHTML(UKUtils.rupiah(totals.total)) + '</span></div>' +

            '<div style="margin-top:4px">' +
              '<div style="font-size:12px;font-weight:600;margin-bottom:5px">Metode Pembayaran</div>' +
              '<div class="chips">' + payChips + '</div>' +
            '</div>' +

            '<div>' +
              '<label for="pos-cash-in" style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Uang Diterima (Rp)</label>' +
              '<input type="number" id="pos-cash-in" class="uk-input tabular-nums" min="0" value="' + Number(cashReceived || 0) + '" style="font-weight:700;font-size:14px" />' +
              '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">' +
                '<button type="button" class="btn btn-light btn-sm pos-quick-cash" data-cash="exact">Uang Pas</button>' +
                '<button type="button" class="btn btn-light btn-sm pos-quick-cash" data-cash="20000">20rb</button>' +
                '<button type="button" class="btn btn-light btn-sm pos-quick-cash" data-cash="50000">50rb</button>' +
                '<button type="button" class="btn btn-light btn-sm pos-quick-cash" data-cash="100000">100rb</button>' +
              '</div>' +
              creditNote +
            '</div>' +

            '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;background:#fafbfd;padding:8px 10px;border-radius:8px;border:1px solid var(--line)">' +
              '<span>Kembalian</span>' +
              '<span class="tabular-nums" id="pos-change-text" style="color:var(--green)">' + UKUtils.escapeHTML(UKUtils.rupiah(totals.kembalian)) + '</span>' +
            '</div>' +

            '<button type="button" class="btn btn-primary" id="pos-btn-pay" style="width:100%;min-height:42px;font-size:14px">Proses Pembayaran (F9)</button>' +
          '</div>' +
        '</section>' +
      '</div>';

    if (window.innerWidth <= 900) {
      var layout = root.querySelector('.pos-layout');
      if (layout) layout.style.gridTemplateColumns = '1fr';
    }

    var searchEl = root.querySelector('#pos-search');
    searchEl.addEventListener('input', function () {
      searchQuery = searchEl.value;
      var cursorPos = searchEl.selectionStart || searchQuery.length;
      render(root);
      var nextInput = root.querySelector('#pos-search');
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(cursorPos, cursorPos);
      }
    });
    searchEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var term = searchEl.value.trim().toLowerCase();
        if (!term) return;
        var exact = filtered.find(function (p) {
          return (p.barcode && p.barcode.toLowerCase() === term) || p.kode.toLowerCase() === term;
        }) || filtered[0];
        if (exact) {
          if (exact.varian && exact.varian.length) openVariantPicker(tid, exact, root);
          else addProductToCart(tid, exact, null, root);
          searchQuery = '';
          render(root);
          var ni = root.querySelector('#pos-search');
          if (ni) ni.focus();
        }
      }
    });

    root.querySelectorAll('[data-pos-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () { selectedCat = btn.getAttribute('data-pos-cat'); render(root); });
    });

    root.querySelectorAll('.pos-prod-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pid = btn.getAttribute('data-prod-id');
        var prod = db.products.get(pid, tid);
        if (!prod) return;
        if (prod.varian && prod.varian.length) openVariantPicker(tid, prod, root);
        else addProductToCart(tid, prod, null, root);
      });
    });

    root.querySelectorAll('.pos-qty-dec').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = Number(btn.getAttribute('data-idx'));
        if (cart[i].qty <= 1) cart.splice(i, 1);
        else cart[i].qty -= 1;
        render(root);
      });
    });

    root.querySelectorAll('.pos-qty-inc').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = Number(btn.getAttribute('data-idx'));
        var item = cart[i];
        var prod = db.products.get(item.productId, tid);
        var usedOther = cart.filter(function (c, idx) { return idx !== i && c.productId === item.productId; }).reduce(function (s, c) { return s + c.qty; }, 0);
        if (prod && item.qty + 1 + usedOther > Number(prod.stok)) {
          UKUtils.toast('Stok maksimum tercapai.', 'warning');
          return;
        }
        item.qty += 1;
        render(root);
      });
    });

    root.querySelectorAll('.pos-qty-inp').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var i = Number(inp.getAttribute('data-idx'));
        var val = Math.max(1, Math.floor(Number(inp.value) || 1));
        var item = cart[i];
        var prod = db.products.get(item.productId, tid);
        var maxAllowed = prod ? Number(prod.stok) : item.maxStok;
        if (val > maxAllowed) {
          val = maxAllowed;
          UKUtils.toast('Disesuaikan ke stok maksimum (' + maxAllowed + ').', 'warning');
        }
        item.qty = val;
        render(root);
      });
    });

    root.querySelectorAll('.pos-item-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        cart.splice(Number(btn.getAttribute('data-idx')), 1);
        render(root);
      });
    });

    var clearBtn = root.querySelector('#pos-clear-cart');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        cart = [];
        discountVal = 0;
        cashReceived = 0;
        render(root);
      });
    }

    root.querySelector('#pos-cust-select').addEventListener('change', function () {
      selectedCustomerId = this.value;
      render(root);
    });
    root.querySelector('#pos-quick-cust').addEventListener('click', function () {
      openQuickCustomerModal(tid, function (created) {
        selectedCustomerId = created.id;
        render(root);
      });
    });

    root.querySelector('#pos-disc-type').addEventListener('change', function () {
      discountType = this.value;
      render(root);
    });
    root.querySelector('#pos-disc-val').addEventListener('change', function () {
      discountVal = Math.max(0, Number(this.value) || 0);
      render(root);
    });

    root.querySelectorAll('[data-pay-method]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        payMethod = btn.getAttribute('data-pay-method');
        if (payMethod !== 'Tunai') cashReceived = calcTotals(settings).total;
        render(root);
      });
    });

    var cashInp = root.querySelector('#pos-cash-in');
    cashInp.addEventListener('input', function () {
      cashReceived = Math.max(0, Number(cashInp.value) || 0);
      var tNow = calcTotals(settings);
      root.querySelector('#pos-change-text').textContent = UKUtils.rupiah(tNow.kembalian);
    });

    root.querySelectorAll('.pos-quick-cash').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-cash');
        cashReceived = mode === 'exact' ? calcTotals(settings).total : Number(mode);
        render(root);
      });
    });

    root.querySelector('#pos-btn-hold').addEventListener('click', function () {
      if (!cart.length) return;
      var list = getHeldList(tid);
      list.unshift({
        id: 'HOLD-' + Date.now(),
        waktu: new Date().toISOString(),
        cart: cart.slice(),
        selectedCustomerId: selectedCustomerId,
        discountType: discountType,
        discountVal: discountVal
      });
      saveHeldList(tid, list);
      cart = [];
      discountVal = 0;
      cashReceived = 0;
      selectedCustomerId = '';
      UKUtils.toast('Transaksi ditahan sementara.', 'info');
      render(root);
    });

    root.querySelector('#pos-btn-resume').addEventListener('click', function () {
      var list = getHeldList(tid);
      if (!list.length) return;
      var modalId = 'uk-pos-hold-modal';
      var rowsHTML = list.map(function (h, idx) {
        var sum = h.cart.reduce(function (s, i) { return s + i.qty * i.harga; }, 0);
        return (
          '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)">' +
            '<div><strong>' + UKUtils.tanggalIndo(h.waktu, true) + '</strong><div style="font-size:12px;color:var(--muted)">' + h.cart.length + ' jenis item · ' + UKUtils.rupiah(sum) + '</div></div>' +
            '<div style="display:flex;gap:6px">' +
              '<button type="button" class="btn btn-primary btn-sm hold-pick" data-idx="' + idx + '">Lanjutkan</button>' +
              '<button type="button" class="btn btn-ghost btn-sm hold-del" data-idx="' + idx + '" style="color:var(--red)">Hapus</button>' +
            '</div>' +
          '</div>'
        );
      }).join('');
      var el = UKUtils.openModal({
        id: modalId,
        title: 'Transaksi Tertahan',
        bodyHTML: rowsHTML
      });
      el.querySelectorAll('.hold-pick').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx = Number(btn.getAttribute('data-idx'));
          var picked = list.splice(idx, 1)[0];
          saveHeldList(tid, list);
          cart = picked.cart || [];
          selectedCustomerId = picked.selectedCustomerId || '';
          discountType = picked.discountType || 'rp';
          discountVal = picked.discountVal || 0;
          UKUtils.closeModal(modalId);
          render(root);
        });
      });
      el.querySelectorAll('.hold-del').forEach(function (btn) {
        btn.addEventListener('click', function () {
          list.splice(Number(btn.getAttribute('data-idx')), 1);
          saveHeldList(tid, list);
          UKUtils.closeModal(modalId);
          render(root);
        });
      });
    });

    function processPayment() {
      if (!cart.length) {
        UKUtils.toast('Keranjang masih kosong.', 'warning');
        return;
      }
      var tFinal = calcTotals(settings);
      if (tFinal.dibayar < tFinal.total && !selectedCustomerId) {
        UKUtils.toast('Uang diterima kurang dari total pembayaran.', 'error');
        return;
      }

      /* Validasi ulang stok terbaru sebelum commit */
      for (var cIdx = 0; cIdx < cart.length; cIdx++) {
        var ci = cart[cIdx];
        var freshProd = db.products.get(ci.productId, tid);
        if (!freshProd || Number(freshProd.stok) < ci.qty) {
          UKUtils.toast('Stok "' + ci.nama + '" tidak mencukupi.', 'error');
          return;
        }
      }

      var trx = db.transactions.create({
        tenantId: tid,
        waktu: new Date().toISOString(),
        pelangganId: selectedCustomerId || null,
        items: cart.map(function (c) {
          return { productId: c.productId, nama: c.nama, qty: c.qty, harga: c.harga, hargaBeli: c.hargaBeli };
        }),
        subtotal: tFinal.subtotal,
        diskon: tFinal.diskon,
        pajak: tFinal.pajak,
        total: tFinal.total,
        metode: payMethod,
        dibayar: tFinal.dibayar,
        kembalian: tFinal.kembalian,
        status: 'Selesai',
        alasanBatal: ''
      });

      cart.forEach(function (c) {
        var prod = db.products.get(c.productId, tid);
        var nextStock = Math.max(0, Number(prod.stok) - Number(c.qty));
        db.products.update(c.productId, { stok: nextStock }, tid);
        db.stockMovements.create({
          tenantId: tid,
          productId: c.productId,
          tipe: 'penjualan',
          jumlah: -Number(c.qty),
          saldoSesudah: nextStock,
          catatan: 'Penjualan ' + trx.id,
          waktu: trx.waktu
        });
      });

      if (tFinal.dibayar < tFinal.total && selectedCustomerId) {
        var sisaHutang = tFinal.total - tFinal.dibayar;
        var cust = db.customers.get(selectedCustomerId, tid);
        if (cust) {
          var hist = Array.isArray(cust.riwayatPiutang) ? cust.riwayatPiutang.slice() : [];
          hist.unshift({ waktu: trx.waktu, jumlah: sisaHutang, tipe: 'tambah', catatan: 'Kurang bayar ' + trx.id });
          db.customers.update(cust.id, {
            piutang: (Number(cust.piutang) || 0) + sisaHutang,
            riwayatPiutang: hist
          }, tid);
        }
      }

      cart = [];
      discountVal = 0;
      cashReceived = 0;
      selectedCustomerId = '';
      window.UK.refreshShell();
      showReceiptModal(trx, tenant, settings, root);
    }

    root.querySelector('#pos-btn-pay').addEventListener('click', processPayment);

    if (keyHandlerRef) document.removeEventListener('keydown', keyHandlerRef);
    keyHandlerRef = function (e) {
      if (window.location.hash.indexOf('#/pos') !== 0) {
        document.removeEventListener('keydown', keyHandlerRef);
        return;
      }
      if (e.key === 'F2') {
        e.preventDefault();
        var s = document.getElementById('pos-search');
        if (s) s.focus();
      } else if (e.key === 'F9') {
        e.preventDefault();
        processPayment();
      }
    };
    document.addEventListener('keydown', keyHandlerRef);
  }

  window.UK.registerModule('pos', {
    render: render,
    onEnter: function (root) {
      var s = root.querySelector('#pos-search');
      if (s) s.focus();
    }
  });
})();
