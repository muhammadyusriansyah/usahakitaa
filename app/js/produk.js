/* Modul Produk & Kategori — UsahaKita */
(function () {
  'use strict';

  var state = {
    search: '',
    categoryId: 'semua',
    status: 'aktif',
    sort: 'nama',
    view: 'table',
    page: 1,
    perPage: 10
  };

  function cropImageSquareDataURL(file, cb) {
    if (!file) return cb('File tidak ditemukan.');
    if (file.size > 500 * 1024) {
      return cb('Ukuran foto maksimal 500 KB.');
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var size = Math.min(img.width, img.height);
        var sx = (img.width - size) / 2;
        var sy = (img.height - size) / 2;
        var target = 360;
        var canvas = document.createElement('canvas');
        canvas.width = target;
        canvas.height = target;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, size, size, 0, 0, target, target);
        var dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        cb(null, dataUrl);
      };
      img.onerror = function () { cb('Gagal membaca gambar.'); };
      img.src = ev.target.result;
    };
    reader.onerror = function () { cb('Gagal memuat file.'); };
    reader.readAsDataURL(file);
  }

  function statusBadge(st) {
    if (st === 'dipublikasikan') return '<span class="status success">Dipublikasikan</span>';
    if (st === 'diarsipkan') return '<span class="status danger">Diarsipkan</span>';
    return '<span class="status pending">Draf</span>';
  }

  function thumbHTML(p) {
    if (p.foto) {
      return '<img src="' + UKUtils.escapeHTML(p.foto) + '" alt="' + UKUtils.escapeHTML(p.nama) + '" style="width:38px;height:38px;border-radius:8px;object-fit:cover;border:1px solid var(--line);flex-shrink:0" />';
    }
    return '<div style="width:38px;height:38px;border-radius:8px;background:var(--bg);border:1px solid var(--line);display:inline-flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">' + UKUtils.escapeHTML(p.emoji || '📦') + '</div>';
  }

  function openCategoryModal(tid, onDone) {
    var modalId = 'uk-cat-modal';
    function draw() {
      var cats = db.categories.list({ tenantId: tid });
      var prods = db.products.list({ tenantId: tid });
      var rowsHTML = cats.map(function (c) {
        var usedCount = prods.filter(function (p) { return p.kategoriId === c.id; }).length;
        return (
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--line)">' +
            '<div style="display:flex;align-items:center;gap:8px;flex:1">' +
              '<input type="text" class="uk-input cat-rename-input" data-cat-id="' + UKUtils.escapeHTML(c.id) + '" value="' + UKUtils.escapeHTML(c.nama) + '" style="padding:6px 9px" />' +
              '<span style="font-size:11px;color:var(--muted);white-space:nowrap">' + usedCount + ' produk</span>' +
            '</div>' +
            '<div style="display:flex;gap:6px">' +
              '<button type="button" class="btn btn-light btn-sm cat-save-btn" data-cat-id="' + UKUtils.escapeHTML(c.id) + '">Simpan</button>' +
              '<button type="button" class="btn btn-ghost btn-sm cat-del-btn" data-cat-id="' + UKUtils.escapeHTML(c.id) + '" style="color:var(--red)">Hapus</button>' +
            '</div>' +
          '</div>'
        );
      }).join('');

      var el = UKUtils.openModal({
        id: modalId,
        title: 'Kelola Kategori Produk',
        bodyHTML:
          '<form id="uk-cat-add-form" style="display:flex;gap:8px;margin-bottom:14px">' +
            '<input type="text" id="uk-cat-new-name" class="uk-input" placeholder="Nama kategori baru..." required />' +
            '<button type="submit" class="btn btn-primary">Tambah</button>' +
          '</form>' +
          '<div>' + (rowsHTML || '<div class="empty-note">Belum ada kategori.</div>') + '</div>',
        footerHTML: '<button type="button" class="btn btn-light" data-close-cat>Selesai</button>'
      });

      el.querySelector('[data-close-cat]').addEventListener('click', function () {
        UKUtils.closeModal(modalId);
        if (onDone) onDone();
      });

      el.querySelector('#uk-cat-add-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var raw = UKUtils.titleCase(el.querySelector('#uk-cat-new-name').value);
        if (!raw) { UKUtils.toast('Nama kategori wajib diisi.', 'error'); return; }
        var dup = db.categories.list({ tenantId: tid }).some(function (c) {
          return c.nama.toLowerCase() === raw.toLowerCase();
        });
        if (dup) { UKUtils.toast('Kategori "' + raw + '" sudah ada.', 'error'); return; }
        db.categories.create({ tenantId: tid, nama: raw });
        UKUtils.toast('Kategori "' + raw + '" ditambahkan.', 'success');
        draw();
      });

      el.querySelectorAll('.cat-save-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cid = btn.getAttribute('data-cat-id');
          var inp = el.querySelector('.cat-rename-input[data-cat-id="' + cid + '"]');
          var nextName = UKUtils.titleCase(inp.value);
          if (!nextName) { UKUtils.toast('Nama kategori tidak boleh kosong.', 'error'); return; }
          var dup = db.categories.list({ tenantId: tid }).some(function (c) {
            return c.id !== cid && c.nama.toLowerCase() === nextName.toLowerCase();
          });
          if (dup) { UKUtils.toast('Nama kategori duplikat.', 'error'); return; }
          db.categories.update(cid, { nama: nextName }, tid);
          UKUtils.toast('Kategori diperbarui.', 'success');
          draw();
        });
      });

      el.querySelectorAll('.cat-del-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cid = btn.getAttribute('data-cat-id');
          var used = db.products.list({ tenantId: tid }).some(function (p) { return p.kategoriId === cid; });
          if (used) {
            UKUtils.toast('Kategori masih digunakan oleh produk, tidak dapat dihapus.', 'error');
            return;
          }
          db.categories.remove(cid, tid);
          UKUtils.toast('Kategori dihapus.', 'success');
          draw();
        });
      });
    }
    draw();
  }

  function openProductModal(tid, product, onSaved) {
    var isEdit = Boolean(product);
    var modalId = 'uk-prod-modal';
    var cats = db.categories.list({ tenantId: tid });
    var currentFoto = (product && product.foto) || '';
    var variants = (product && Array.isArray(product.varian)) ? product.varian.map(function (v) { return Object.assign({}, v); }) : [];

    var catOpts = cats.map(function (c) {
      var sel = product && product.kategoriId === c.id ? ' selected' : '';
      return '<option value="' + UKUtils.escapeHTML(c.id) + '"' + sel + '>' + UKUtils.escapeHTML(c.nama) + '</option>';
    }).join('');

    var bodyHTML =
      '<form id="uk-prod-form" novalidate>' +
        '<div class="form-grid-2">' +
          '<div class="field">' +
            '<label for="prd-nama">Nama Produk *</label>' +
            '<input type="text" id="prd-nama" value="' + UKUtils.escapeHTML((product && product.nama) || '') + '" required />' +
          '</div>' +
          '<div class="field">' +
            '<label for="prd-kode">Kode SKU (opsional, otomatis jika kosong)</label>' +
            '<input type="text" id="prd-kode" value="' + UKUtils.escapeHTML((product && product.kode) || '') + '" placeholder="PRD-001" />' +
          '</div>' +
        '</div>' +

        '<div class="form-grid-2">' +
          '<div class="field">' +
            '<label for="prd-barcode">Barcode</label>' +
            '<input type="text" id="prd-barcode" value="' + UKUtils.escapeHTML((product && product.barcode) || '') + '" placeholder="899..." />' +
          '</div>' +
          '<div class="field">' +
            '<label for="prd-kat">Kategori *</label>' +
            '<div style="display:flex;gap:6px">' +
              '<select id="prd-kat" style="flex:1">' + catOpts + '</select>' +
              '<button type="button" class="btn btn-light btn-sm" id="btn-inline-cat" title="Tambah kategori baru">+ Baru</button>' +
            '</div>' +
            '<div id="inline-cat-box" style="display:none;margin-top:6px;gap:6px">' +
              '<input type="text" id="inline-cat-name" placeholder="Nama kategori baru" class="uk-input" style="flex:1;padding:6px 9px" />' +
              '<button type="button" class="btn btn-primary btn-sm" id="btn-save-inline-cat">Simpan</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="field">' +
          '<label for="prd-desc">Deskripsi Singkat <span id="prd-desc-count" style="font-weight:400;color:var(--muted)">(0/200)</span></label>' +
          '<textarea id="prd-desc" maxlength="200" rows="2" placeholder="Maksimal 200 karakter">' + UKUtils.escapeHTML((product && product.deskripsi) || '') + '</textarea>' +
        '</div>' +

        '<div class="form-grid-2">' +
          '<div class="field">' +
            '<label for="prd-beli">Harga Beli (Rp) *</label>' +
            '<input type="number" id="prd-beli" min="0" value="' + Number((product && product.hargaBeli) || 0) + '" required />' +
          '</div>' +
          '<div class="field">' +
            '<label for="prd-jual">Harga Jual (Rp) *</label>' +
            '<input type="number" id="prd-jual" min="0" value="' + Number((product && product.hargaJual) || 0) + '" required />' +
          '</div>' +
        '</div>' +
        '<div id="prd-price-warn" class="banner warning" style="display:none;margin-bottom:12px">Peringatan: Harga jual lebih rendah dari harga beli (margin negatif).</div>' +

        '<div class="form-grid-2">' +
          '<div class="field">' +
            '<label for="prd-stok">' + (isEdit ? 'Stok Saat Ini (ubah di menu Stok)' : 'Stok Awal *') + '</label>' +
            '<input type="number" id="prd-stok" min="0" value="' + Number((product && product.stok) || 0) + '"' + (isEdit ? ' readonly style="background:#f5f6fa"' : '') + ' />' +
          '</div>' +
          '<div class="field">' +
            '<label for="prd-stokmin">Stok Minimum *</label>' +
            '<input type="number" id="prd-stokmin" min="0" value="' + Number((product && product.stokMin) != null ? product.stokMin : 5) + '" />' +
          '</div>' +
        '</div>' +

        '<div class="form-grid-2">' +
          '<div class="field">' +
            '<label for="prd-status">Status Publikasi</label>' +
            '<select id="prd-status">' +
              '<option value="dipublikasikan"' + ((!product || product.status === 'dipublikasikan') ? ' selected' : '') + '>Dipublikasikan (tampil di katalog)</option>' +
              '<option value="draf"' + ((product && product.status === 'draf') ? ' selected' : '') + '>Draf (sembunyikan dari katalog)</option>' +
            '</select>' +
          '</div>' +
          '<div class="field">' +
            '<label for="prd-emoji">Ikon Emoji Cadangan</label>' +
            '<input type="text" id="prd-emoji" maxlength="4" value="' + UKUtils.escapeHTML((product && product.emoji) || '📦') + '" />' +
          '</div>' +
        '</div>' +

        '<div class="field">' +
          '<label for="prd-foto">Foto Produk (maks 500 KB, otomatis dipotong 1:1)</label>' +
          '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
            '<div id="prd-foto-preview" style="width:60px;height:60px;border-radius:10px;border:1px solid var(--line);background:var(--bg);display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:24px"></div>' +
            '<input type="file" id="prd-foto" accept="image/*" style="flex:1;min-width:180px" />' +
            '<button type="button" class="btn btn-light btn-sm" id="prd-foto-clear">Hapus Foto</button>' +
          '</div>' +
        '</div>' +

        '<div class="field" style="margin-bottom:0">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<label style="margin:0">Varian Produk (opsional)</label>' +
            '<button type="button" class="btn btn-light btn-sm" id="prd-add-var">+ Tambah Varian</button>' +
          '</div>' +
          '<div id="prd-var-list" style="display:flex;flex-direction:column;gap:6px"></div>' +
        '</div>' +
      '</form>';

    var el = UKUtils.openModal({
      id: modalId,
      size: 'lg',
      title: isEdit ? 'Ubah Produk' : 'Tambah Produk Baru',
      bodyHTML: bodyHTML,
      footerHTML:
        '<button type="button" class="btn btn-light" data-cancel-prod>Batal</button>' +
        '<button type="button" class="btn btn-primary" data-save-prod>' + (isEdit ? 'Simpan Perubahan' : 'Simpan Produk') + '</button>'
    });

    function renderPreview() {
      var prev = el.querySelector('#prd-foto-preview');
      if (currentFoto) {
        prev.innerHTML = '<img src="' + UKUtils.escapeHTML(currentFoto) + '" alt="Preview" style="width:100%;height:100%;object-fit:cover" />';
      } else {
        prev.textContent = el.querySelector('#prd-emoji').value || '📦';
      }
    }
    renderPreview();

    function checkPriceWarn() {
      var b = Number(el.querySelector('#prd-beli').value) || 0;
      var j = Number(el.querySelector('#prd-jual').value) || 0;
      el.querySelector('#prd-price-warn').style.display = j < b ? 'flex' : 'none';
    }
    checkPriceWarn();
    el.querySelector('#prd-beli').addEventListener('input', checkPriceWarn);
    el.querySelector('#prd-jual').addEventListener('input', checkPriceWarn);

    var descEl = el.querySelector('#prd-desc');
    var descCount = el.querySelector('#prd-desc-count');
    function updateDescCount() {
      descCount.textContent = '(' + descEl.value.length + '/200)';
    }
    updateDescCount();
    descEl.addEventListener('input', updateDescCount);

    el.querySelector('#prd-emoji').addEventListener('input', renderPreview);
    el.querySelector('#prd-foto').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      cropImageSquareDataURL(file, function (err, dataUrl) {
        if (err) {
          UKUtils.toast(err, 'error');
          return;
        }
        currentFoto = dataUrl;
        renderPreview();
      });
    });
    el.querySelector('#prd-foto-clear').addEventListener('click', function () {
      currentFoto = '';
      el.querySelector('#prd-foto').value = '';
      renderPreview();
    });

    /* Inline tambah kategori */
    var inlineBox = el.querySelector('#inline-cat-box');
    el.querySelector('#btn-inline-cat').addEventListener('click', function () {
      inlineBox.style.display = inlineBox.style.display === 'none' ? 'flex' : 'none';
    });
    el.querySelector('#btn-save-inline-cat').addEventListener('click', function () {
      var namaKat = UKUtils.titleCase(el.querySelector('#inline-cat-name').value);
      if (!namaKat) { UKUtils.toast('Nama kategori wajib diisi.', 'error'); return; }
      var existing = db.categories.list({ tenantId: tid }).find(function (c) { return c.nama.toLowerCase() === namaKat.toLowerCase(); });
      if (existing) {
        el.querySelector('#prd-kat').value = existing.id;
        inlineBox.style.display = 'none';
        return;
      }
      var created = db.categories.create({ tenantId: tid, nama: namaKat });
      var opt = document.createElement('option');
      opt.value = created.id;
      opt.textContent = created.nama;
      el.querySelector('#prd-kat').appendChild(opt);
      el.querySelector('#prd-kat').value = created.id;
      el.querySelector('#inline-cat-name').value = '';
      inlineBox.style.display = 'none';
      UKUtils.toast('Kategori "' + created.nama + '" ditambahkan.', 'success');
    });

    /* Varian */
    var varListEl = el.querySelector('#prd-var-list');
    function drawVariants() {
      if (!variants.length) {
        varListEl.innerHTML = '<div style="font-size:12px;color:var(--muted)">Belum ada varian.</div>';
        return;
      }
      varListEl.innerHTML = variants.map(function (v, idx) {
        return (
          '<div style="display:flex;gap:8px;align-items:center">' +
            '<input type="text" class="uk-input var-name" data-idx="' + idx + '" value="' + UKUtils.escapeHTML(v.nama) + '" placeholder="Nama varian (mis. Besar)" style="flex:2" />' +
            '<input type="number" class="uk-input var-price" data-idx="' + idx + '" value="' + Number(v.hargaTambahan || 0) + '" placeholder="+ Harga (Rp)" style="flex:1" />' +
            '<button type="button" class="btn btn-ghost btn-sm var-del" data-idx="' + idx + '" style="color:var(--red)">Hapus</button>' +
          '</div>'
        );
      }).join('');
      varListEl.querySelectorAll('.var-name').forEach(function (inp) {
        inp.addEventListener('input', function () { variants[Number(inp.dataset.idx)].nama = inp.value; });
      });
      varListEl.querySelectorAll('.var-price').forEach(function (inp) {
        inp.addEventListener('input', function () { variants[Number(inp.dataset.idx)].hargaTambahan = Number(inp.value) || 0; });
      });
      varListEl.querySelectorAll('.var-del').forEach(function (btn) {
        btn.addEventListener('click', function () {
          variants.splice(Number(btn.dataset.idx), 1);
          drawVariants();
        });
      });
    }
    drawVariants();
    el.querySelector('#prd-add-var').addEventListener('click', function () {
      variants.push({ nama: '', hargaTambahan: 0 });
      drawVariants();
    });

    el.querySelector('[data-cancel-prod]').addEventListener('click', function () { UKUtils.closeModal(modalId); });
    el.querySelector('[data-save-prod]').addEventListener('click', function () {
      var nama = UKUtils.cleanSpaces(el.querySelector('#prd-nama').value);
      var kode = UKUtils.cleanSpaces(el.querySelector('#prd-kode').value).toUpperCase();
      var barcode = UKUtils.cleanSpaces(el.querySelector('#prd-barcode').value);
      var kategoriId = el.querySelector('#prd-kat').value;
      var deskripsi = UKUtils.cleanSpaces(descEl.value).slice(0, 200);
      var hargaBeli = Number(el.querySelector('#prd-beli').value);
      var hargaJual = Number(el.querySelector('#prd-jual').value);
      var stok = Number(el.querySelector('#prd-stok').value);
      var stokMin = Number(el.querySelector('#prd-stokmin').value);
      var status = el.querySelector('#prd-status').value;
      var emoji = UKUtils.cleanSpaces(el.querySelector('#prd-emoji').value) || '📦';

      if (!nama) { UKUtils.toast('Nama produk wajib diisi.', 'error'); return; }
      if (!kategoriId) { UKUtils.toast('Kategori produk wajib dipilih.', 'error'); return; }
      if (isNaN(hargaBeli) || hargaBeli < 0 || isNaN(hargaJual) || hargaJual < 0) {
        UKUtils.toast('Harga beli dan harga jual tidak boleh negatif.', 'error');
        return;
      }
      if (isNaN(stok) || stok < 0 || isNaN(stokMin) || stokMin < 0) {
        UKUtils.toast('Stok dan stok minimum tidak boleh negatif.', 'error');
        return;
      }

      var cleanVariants = variants
        .map(function (v) { return { nama: UKUtils.cleanSpaces(v.nama), hargaTambahan: Math.max(0, Number(v.hargaTambahan) || 0) }; })
        .filter(function (v) { return v.nama !== ''; });

      if (!kode) {
        var count = db.products.list({ tenantId: tid }).length + 1;
        kode = 'PRD-' + String(count).padStart(3, '0');
      }

      if (isEdit) {
        db.products.update(product.id, {
          nama: nama,
          kode: kode,
          barcode: barcode,
          kategoriId: kategoriId,
          deskripsi: deskripsi,
          hargaBeli: hargaBeli,
          hargaJual: hargaJual,
          stokMin: stokMin,
          status: status,
          emoji: emoji,
          foto: currentFoto,
          varian: cleanVariants
        }, tid);
        UKUtils.toast('Produk berhasil diperbarui.', 'success');
      } else {
        var created = db.products.create({
          tenantId: tid,
          nama: nama,
          kode: kode,
          barcode: barcode,
          kategoriId: kategoriId,
          deskripsi: deskripsi,
          hargaBeli: hargaBeli,
          hargaJual: hargaJual,
          stok: stok,
          stokMin: stokMin,
          status: status,
          emoji: emoji,
          foto: currentFoto,
          varian: cleanVariants
        });
        db.stockMovements.create({
          tenantId: tid,
          productId: created.id,
          tipe: 'masuk',
          jumlah: stok,
          saldoSesudah: stok,
          catatan: 'Stok awal produk',
          waktu: new Date().toISOString()
        });
        UKUtils.toast('Produk baru ditambahkan.', 'success');
      }
      UKUtils.closeModal(modalId);
      window.UK.refreshShell();
      if (onSaved) onSaved();
    });
  }

  function render(root) {
    var session = window.UK.getSession();
    var tenant = window.UK.getTenant();
    var tid = session.tenantId;
    var isKasir = window.UK.isKasir();

    if (window.UK.state.productSearch) {
      state.search = window.UK.state.productSearch;
      window.UK.state.productSearch = '';
      state.page = 1;
    }

    var allProds = db.products.list({ tenantId: tid });
    var cats = db.categories.list({ tenantId: tid });
    var catMap = {};
    cats.forEach(function (c) { catMap[c.id] = c.nama; });

    var plan = db.plans.get(tenant.paket) || { nama: 'Free', batas: { produk: 25 } };
    var activeProdsCount = allProds.filter(function (p) { return p.status !== 'diarsipkan'; }).length;
    var limitProd = (plan.batas && plan.batas.produk) || 25;
    var pctLimit = Math.min(100, Math.round((activeProdsCount / limitProd) * 100));
    var atLimit = activeProdsCount >= limitProd;

    var q = state.search.trim().toLowerCase();
    var filtered = allProds.filter(function (p) {
      if (state.status === 'aktif') {
        if (p.status === 'diarsipkan') return false;
      } else if (state.status !== 'semua') {
        if (p.status !== state.status) return false;
      }
      if (state.categoryId !== 'semua' && p.kategoriId !== state.categoryId) return false;
      if (q) {
        var hay = (p.nama + ' ' + p.kode + ' ' + (p.barcode || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      if (state.sort === 'harga_asc') return a.hargaJual - b.hargaJual;
      if (state.sort === 'harga_desc') return b.hargaJual - a.hargaJual;
      if (state.sort === 'stok_asc') return a.stok - b.stok;
      if (state.sort === 'stok_desc') return b.stok - a.stok;
      return String(a.nama).localeCompare(String(b.nama), 'id');
    });

    var totalPages = Math.max(1, Math.ceil(filtered.length / state.perPage));
    if (state.page > totalPages) state.page = totalPages;
    var startIdx = (state.page - 1) * state.perPage;
    var paged = filtered.slice(startIdx, startIdx + state.perPage);

    var catalogUrl = new URL('../toko/index.html?u=' + encodeURIComponent(tenant.slug), window.location.href).href;

    var catOptions = '<option value="semua">Semua Kategori</option>' + cats.map(function (c) {
      return '<option value="' + UKUtils.escapeHTML(c.id) + '"' + (state.categoryId === c.id ? ' selected' : '') + '>' + UKUtils.escapeHTML(c.nama) + '</option>';
    }).join('');

    var bodyViewHTML = '';
    if (!paged.length) {
      bodyViewHTML =
        '<div class="empty-note">' +
          '<div style="font-size:28px">📦</div>' +
          '<h4>Tidak ada produk ditemukan</h4>' +
          '<p>Ubah filter pencarian atau tambahkan produk baru untuk mulai berjualan.</p>' +
          (!isKasir ? '<button type="button" class="btn btn-primary btn-sm" id="prd-empty-add">+ Tambah Produk</button>' : '') +
        '</div>';
    } else if (state.view === 'card') {
      bodyViewHTML =
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px">' +
          paged.map(function (p) {
            return (
              '<div class="card" style="padding:14px;display:flex;flex-direction:column;gap:10px">' +
                '<div style="display:flex;gap:10px;align-items:center">' +
                  thumbHTML(p) +
                  '<div style="min-width:0;flex:1">' +
                    '<div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + UKUtils.escapeHTML(p.nama) + '</div>' +
                    '<div style="font-size:11px;color:var(--muted)">' + UKUtils.escapeHTML(p.kode) + ' · ' + UKUtils.escapeHTML(catMap[p.kategoriId] || '-') + '</div>' +
                  '</div>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;align-items:center">' +
                  '<strong class="tabular-nums">' + UKUtils.escapeHTML(UKUtils.rupiah(p.hargaJual)) + '</strong>' +
                  '<span style="font-size:12px;color:' + (p.stok <= p.stokMin ? 'var(--red)' : 'var(--muted)') + '">Stok: <strong>' + Number(p.stok) + '</strong></span>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;align-items:center">' +
                  statusBadge(p.status) +
                  (!isKasir ? '<div style="display:flex;gap:4px">' +
                    '<button type="button" class="btn btn-light btn-sm prd-edit-btn" data-id="' + UKUtils.escapeHTML(p.id) + '">Ubah</button>' +
                    (p.status === 'diarsipkan'
                      ? '<button type="button" class="btn btn-light btn-sm prd-restore-btn" data-id="' + UKUtils.escapeHTML(p.id) + '">Pulihkan</button>'
                      : '<button type="button" class="btn btn-ghost btn-sm prd-arch-btn" data-id="' + UKUtils.escapeHTML(p.id) + '" style="color:var(--red)">Arsip</button>') +
                  '</div>' : '') +
                '</div>' +
              '</div>'
            );
          }).join('') +
        '</div>';
    } else {
      bodyViewHTML =
        '<div class="table-wrap">' +
          '<table class="uk-table">' +
            '<thead><tr>' +
              '<th>Produk</th><th>Kode</th><th>Kategori</th><th class="num">Harga Beli</th><th class="num">Harga Jual</th><th class="num">Margin</th><th class="num">Stok</th><th>Status</th>' +
              (!isKasir ? '<th style="text-align:right">Aksi</th>' : '') +
            '</tr></thead>' +
            '<tbody>' +
              paged.map(function (p) {
                var margin = p.hargaJual > 0 ? Math.round(((p.hargaJual - p.hargaBeli) / p.hargaJual) * 100) : 0;
                return (
                  '<tr>' +
                    '<td><div style="display:flex;align-items:center;gap:10px">' + thumbHTML(p) + '<div><strong>' + UKUtils.escapeHTML(p.nama) + '</strong>' + (p.varian && p.varian.length ? '<div style="font-size:11px;color:var(--muted)">' + p.varian.length + ' varian</div>' : '') + '</div></div></td>' +
                    '<td class="tabular-nums">' + UKUtils.escapeHTML(p.kode) + '</td>' +
                    '<td>' + UKUtils.escapeHTML(catMap[p.kategoriId] || '-') + '</td>' +
                    '<td class="num">' + UKUtils.escapeHTML(UKUtils.rupiah(p.hargaBeli)) + '</td>' +
                    '<td class="num"><strong>' + UKUtils.escapeHTML(UKUtils.rupiah(p.hargaJual)) + '</strong></td>' +
                    '<td class="num" style="color:' + (margin < 0 ? 'var(--red)' : 'var(--green)') + '">' + margin + '%</td>' +
                    '<td class="num" style="color:' + (p.stok <= p.stokMin ? 'var(--red)' : 'var(--ink)') + '"><strong>' + Number(p.stok) + '</strong></td>' +
                    '<td>' + statusBadge(p.status) + '</td>' +
                    (!isKasir ? '<td style="text-align:right;white-space:nowrap">' +
                      '<button type="button" class="btn btn-light btn-sm prd-edit-btn" data-id="' + UKUtils.escapeHTML(p.id) + '">Ubah</button> ' +
                      (p.status === 'diarsipkan'
                        ? '<button type="button" class="btn btn-light btn-sm prd-restore-btn" data-id="' + UKUtils.escapeHTML(p.id) + '">Pulihkan</button>'
                        : '<button type="button" class="btn btn-ghost btn-sm prd-arch-btn" data-id="' + UKUtils.escapeHTML(p.id) + '" style="color:var(--red)">Arsipkan</button>') +
                    '</td>' : '') +
                  '</tr>'
                );
              }).join('') +
            '</tbody>' +
          '</table>' +
        '</div>';
    }

    var pageButtons = '';
    for (var pg = 1; pg <= totalPages; pg++) {
      pageButtons += '<button type="button" class="page-btn ' + (pg === state.page ? 'active' : '') + '" data-page="' + pg + '">' + pg + '</button>';
    }

    root.innerHTML =
      '<div class="page-header">' +
        '<div>' +
          '<h1 class="page-title">Produk &amp; Kategori</h1>' +
          '<p class="page-subtitle">Kelola katalog produk usaha Anda. Hanya produk berstatus <strong>Dipublikasikan</strong> yang tampil di katalog online.</p>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button type="button" class="btn btn-light" id="prd-copy-link">Salin Tautan Katalog</button>' +
          '<a href="../toko/index.html?u=' + encodeURIComponent(tenant.slug) + '" target="_blank" rel="noopener" class="btn btn-light">Lihat di Katalog</a>' +
          (!isKasir ? '<button type="button" class="btn btn-light" id="prd-manage-cat">Kelola Kategori</button>' : '') +
          (!isKasir ? '<button type="button" class="btn btn-primary" id="prd-btn-add">+ Tambah Produk</button>' : '') +
        '</div>' +
      '</div>' +

      '<div class="panel" style="padding:12px 16px;margin-bottom:14px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;margin-bottom:6px">' +
          '<span>Kuota Produk Paket <strong>' + UKUtils.escapeHTML(plan.nama) + '</strong>: <strong class="tabular-nums">' + activeProdsCount + ' / ' + limitProd + '</strong> produk</span>' +
          (atLimit ? '<span style="color:var(--red);font-weight:600">Batas tercapai — <a href="#/pengaturan" style="text-decoration:underline;color:var(--orange-dark)">Upgrade Paket</a></span>' : '') +
        '</div>' +
        '<div style="height:6px;background:#eef0f5;border-radius:999px;overflow:hidden"><div style="height:100%;width:' + pctLimit + '%;background:' + (atLimit ? 'var(--red)' : 'var(--orange)') + '"></div></div>' +
      '</div>' +

      '<div class="panel">' +
        '<div class="toolbar">' +
          '<div class="toolbar-group" style="flex:1;min-width:220px">' +
            '<input type="search" id="prd-search" class="uk-input" placeholder="Cari nama, kode, barcode..." value="' + UKUtils.escapeHTML(state.search) + '" style="max-width:240px" />' +
            '<select id="prd-filter-cat" class="uk-select" style="width:auto">' + catOptions + '</select>' +
            '<select id="prd-filter-status" class="uk-select" style="width:auto">' +
              '<option value="aktif"' + (state.status === 'aktif' ? ' selected' : '') + '>Aktif (Publik &amp; Draf)</option>' +
              '<option value="dipublikasikan"' + (state.status === 'dipublikasikan' ? ' selected' : '') + '>Dipublikasikan</option>' +
              '<option value="draf"' + (state.status === 'draf' ? ' selected' : '') + '>Draf</option>' +
              '<option value="diarsipkan"' + (state.status === 'diarsipkan' ? ' selected' : '') + '>Diarsipkan</option>' +
            '</select>' +
            '<select id="prd-sort" class="uk-select" style="width:auto">' +
              '<option value="nama"' + (state.sort === 'nama' ? ' selected' : '') + '>Urut: Nama A-Z</option>' +
              '<option value="harga_asc"' + (state.sort === 'harga_asc' ? ' selected' : '') + '>Harga Terendah</option>' +
              '<option value="harga_desc"' + (state.sort === 'harga_desc' ? ' selected' : '') + '>Harga Tertinggi</option>' +
              '<option value="stok_asc"' + (state.sort === 'stok_asc' ? ' selected' : '') + '>Stok Terdikit</option>' +
              '<option value="stok_desc"' + (state.sort === 'stok_desc' ? ' selected' : '') + '>Stok Terbanyak</option>' +
            '</select>' +
          '</div>' +
          '<div class="tabs" role="group" aria-label="Mode tampilan produk">' +
            '<button type="button" class="tab-btn ' + (state.view === 'table' ? 'active' : '') + '" data-view="table">Tabel</button>' +
            '<button type="button" class="tab-btn ' + (state.view === 'card' ? 'active' : '') + '" data-view="card">Kartu</button>' +
          '</div>' +
        '</div>' +

        bodyViewHTML +

        '<div class="pagination">' +
          '<span>Menampilkan ' + (filtered.length ? (startIdx + 1) : 0) + '–' + Math.min(startIdx + state.perPage, filtered.length) + ' dari ' + filtered.length + ' produk</span>' +
          '<div class="pagination-pages">' +
            '<button type="button" class="page-btn" data-page="' + (state.page - 1) + '"' + (state.page <= 1 ? ' disabled' : '') + '>&lsaquo;</button>' +
            pageButtons +
            '<button type="button" class="page-btn" data-page="' + (state.page + 1) + '"' + (state.page >= totalPages ? ' disabled' : '') + '>&rsaquo;</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var searchInput = root.querySelector('#prd-search');
    searchInput.addEventListener('input', UKUtils.debounce(function () {
      state.search = searchInput.value;
      state.page = 1;
      render(root);
      var refocused = root.querySelector('#prd-search');
      if (refocused) {
        refocused.focus();
        refocused.setSelectionRange(refocused.value.length, refocused.value.length);
      }
    }, 220));

    root.querySelector('#prd-filter-cat').addEventListener('change', function () { state.categoryId = this.value; state.page = 1; render(root); });
    root.querySelector('#prd-filter-status').addEventListener('change', function () { state.status = this.value; state.page = 1; render(root); });
    root.querySelector('#prd-sort').addEventListener('change', function () { state.sort = this.value; state.page = 1; render(root); });

    root.querySelectorAll('[data-view]').forEach(function (btn) {
      btn.addEventListener('click', function () { state.view = btn.getAttribute('data-view'); render(root); });
    });
    root.querySelectorAll('[data-page]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        state.page = Number(btn.getAttribute('data-page'));
        render(root);
      });
    });

    root.querySelector('#prd-copy-link').addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(catalogUrl).then(function () {
          UKUtils.toast('Tautan katalog disalin ke clipboard.', 'success');
        }).catch(function () {
          UKUtils.toast('Tautan katalog: ' + catalogUrl, 'info');
        });
      } else {
        UKUtils.toast('Tautan katalog: ' + catalogUrl, 'info');
      }
    });

    function triggerAdd() {
      if (atLimit) {
        UKUtils.toast('Kuota produk paket ' + plan.nama + ' (' + limitProd + ') penuh. Silakan upgrade paket.', 'warning');
        return;
      }
      openProductModal(tid, null, function () { render(root); });
    }

    var btnAdd = root.querySelector('#prd-btn-add');
    if (btnAdd) btnAdd.addEventListener('click', triggerAdd);
    var btnEmptyAdd = root.querySelector('#prd-empty-add');
    if (btnEmptyAdd) btnEmptyAdd.addEventListener('click', triggerAdd);

    var btnCat = root.querySelector('#prd-manage-cat');
    if (btnCat) btnCat.addEventListener('click', function () { openCategoryModal(tid, function () { render(root); }); });

    root.querySelectorAll('.prd-edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var prod = db.products.get(btn.getAttribute('data-id'), tid);
        if (prod) openProductModal(tid, prod, function () { render(root); });
      });
    });

    root.querySelectorAll('.prd-arch-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var prod = db.products.get(id, tid);
        if (!prod) return;
        UKUtils.confirmDialog('Arsipkan produk "' + prod.nama + '"?', {
          subtitle: 'Produk yang diarsipkan tidak tampil di katalog maupun POS, namun tetap dapat dipulihkan.',
          confirmText: 'Ya, Arsipkan',
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          db.products.update(id, { status: 'diarsipkan' }, tid);
          UKUtils.toast('Produk diarsipkan.', 'success');
          window.UK.refreshShell();
          render(root);
        });
      });
    });

    root.querySelectorAll('.prd-restore-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        db.products.update(id, { status: 'draf' }, tid);
        UKUtils.toast('Produk dipulihkan ke status Draf.', 'success');
        window.UK.refreshShell();
        render(root);
      });
    });
  }

  window.UK.registerModule('produk', { render: render });
})();
