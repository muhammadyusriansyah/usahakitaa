/* Modul Pengaturan Usaha — UsahaKita */
(function () {
  'use strict';

  var activeTab = 'profil';
  var DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  function render(root) {
    if (window.UK.state.settingsTab) {
      activeTab = window.UK.state.settingsTab;
      window.UK.state.settingsTab = '';
    }

    var session = window.UK.getSession();
    var tid = session.tenantId;
    var tenant = window.UK.getTenant();
    var settings = window.UK.getSettings();
    var plans = db.plans.list();
    var curPlan = db.plans.get(tenant.paket) || plans[0];

    var tabsHTML = [
      ['profil', 'Profil Usaha'],
      ['katalog', 'Katalog Online'],
      ['struk', 'Transaksi & Struk'],
      ['pengguna', 'Pengguna'],
      ['paket', 'Paket'],
      ['bahaya', 'Zona Berbahaya']
    ].map(function (t) {
      return '<button type="button" class="tab-btn ' + (activeTab === t[0] ? 'active' : '') + '" data-set-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('');

    var bodyHTML = '';

    if (activeTab === 'profil') {
      var bCats = db.businessCategories.list(true);
      var catOpts = bCats.map(function (c) {
        return '<option value="' + UKUtils.escapeHTML(c.nama) + '"' + (tenant.jenis === c.nama ? ' selected' : '') + '>' + UKUtils.escapeHTML(c.nama) + '</option>';
      }).join('');
      var hours = tenant.jamOperasional || {};
      var hoursRows = DAYS.map(function (d) {
        var h = hours[d] || { buka: true, jamBuka: '08:00', jamTutup: '21:00' };
        return (
          '<div class="uk-hours-row">' +
            '<strong>' + d + '</strong>' +
            '<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px"><input type="checkbox" class="hr-open" data-day="' + d + '"' + (h.buka ? ' checked' : '') + ' /> Buka</label>' +
            '<input type="time" class="uk-input hr-start" data-day="' + d + '" value="' + UKUtils.escapeHTML(h.jamBuka || '08:00') + '"' + (h.buka ? '' : ' disabled') + ' />' +
            '<input type="time" class="uk-input hr-end" data-day="' + d + '" value="' + UKUtils.escapeHTML(h.jamTutup || '21:00') + '"' + (h.buka ? '' : ' disabled') + ' />' +
          '</div>'
        );
      }).join('');

      bodyHTML =
        '<form id="set-profil-form" style="max-width:720px">' +
          '<div class="form-grid-2">' +
            '<div class="field"><label for="set-nama">Nama Usaha *</label><input type="text" id="set-nama" value="' + UKUtils.escapeHTML(tenant.nama) + '" required /></div>' +
            '<div class="field"><label for="set-jenis">Jenis Usaha *</label><select id="set-jenis">' + catOpts + '</select></div>' +
          '</div>' +
          '<div class="form-grid-2">' +
            '<div class="field"><label for="set-email">Email Usaha *</label><input type="email" id="set-email" value="' + UKUtils.escapeHTML(tenant.email) + '" required /></div>' +
            '<div class="field"><label for="set-wa">Nomor WhatsApp *</label><input type="tel" id="set-wa" value="' + UKUtils.escapeHTML(tenant.wa) + '" required /></div>' +
          '</div>' +
          '<div class="field"><label for="set-alamat">Alamat Usaha *</label><input type="text" id="set-alamat" value="' + UKUtils.escapeHTML(tenant.alamat) + '" required /></div>' +
          '<div class="field"><label for="set-desc">Deskripsi Singkat</label><textarea id="set-desc" rows="2">' + UKUtils.escapeHTML(tenant.deskripsi || '') + '</textarea></div>' +
          '<div class="field">' +
            '<label for="set-logo">Logo Usaha (maks 300 KB)</label>' +
            '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
              '<div id="set-logo-prev" style="width:54px;height:54px;border-radius:12px;border:1px solid var(--line);background:var(--bg);display:flex;align-items:center;justify-content:center;overflow:hidden;font-weight:800;font-size:20px;color:var(--orange-dark)">' +
                (tenant.logo ? '<img src="' + UKUtils.escapeHTML(tenant.logo) + '" alt="Logo" style="width:100%;height:100%;object-fit:cover" />' : UKUtils.escapeHTML(String(tenant.nama || 'U').charAt(0).toUpperCase())) +
              '</div>' +
              '<input type="file" id="set-logo" accept="image/*" style="flex:1;min-width:180px" />' +
              '<button type="button" class="btn btn-light btn-sm" id="set-logo-clear">Hapus Logo</button>' +
            '</div>' +
          '</div>' +
          '<div class="field"><label>Jam Operasional</label><div>' + hoursRows + '</div></div>' +
          '<button type="submit" class="btn btn-primary">Simpan Profil Usaha</button>' +
        '</form>';
    } else if (activeTab === 'katalog') {
      var catUrl = new URL('../toko/index.html?u=' + encodeURIComponent(tenant.slug), window.location.href).href;
      var tmpl = settings.pesanWADefault || '';
      var previewMsg = tmpl
        .replace(/\{produk\}/g, 'Kopi Sanger Arabika')
        .replace(/\{harga\}/g, 'Rp 18.000')
        .replace(/\{jumlah\}/g, '2')
        .replace(/\{tautan\}/g, catUrl);

      bodyHTML =
        '<form id="set-katalog-form" style="max-width:700px">' +
          '<div class="field">' +
            '<label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer">' +
              '<input type="checkbox" id="set-kat-aktif"' + (tenant.katalogAktif ? ' checked' : '') + ' />' +
              '<span>Aktifkan Website Katalog Publik</span>' +
            '</label>' +
            '<div class="field-hint">Jika dimatikan, halaman katalog toko akan menampilkan pesan "Katalog tidak tersedia".</div>' +
          '</div>' +
          '<div class="field">' +
            '<label for="set-slug">Slug / Tautan Toko *</label>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
              '<input type="text" id="set-slug" value="' + UKUtils.escapeHTML(tenant.slug) + '" style="flex:1;min-width:200px" required />' +
              '<button type="button" class="btn btn-light" id="set-copy-url">Salin Tautan</button>' +
              '<a href="../toko/index.html?u=' + encodeURIComponent(tenant.slug) + '" target="_blank" rel="noopener" class="btn btn-light">Buka Katalog</a>' +
            '</div>' +
            '<div class="field-hint" id="set-url-preview">' + UKUtils.escapeHTML(catUrl) + '</div>' +
          '</div>' +
          '<div class="field">' +
            '<label for="set-wa-tmpl">Template Pesan WhatsApp Default</label>' +
            '<textarea id="set-wa-tmpl" rows="5">' + UKUtils.escapeHTML(tmpl) + '</textarea>' +
            '<div class="field-hint">Placeholder tersedia: <code>{produk}</code> <code>{harga}</code> <code>{jumlah}</code> <code>{tautan}</code></div>' +
          '</div>' +
          '<div class="field">' +
            '<label>Pratinjau Pesan WhatsApp</label>' +
            '<pre id="set-wa-preview" style="margin:0;padding:12px;border-radius:10px;background:#fafbfd;border:1px solid var(--line);font-family:inherit;font-size:12.5px;white-space:pre-wrap">' + UKUtils.escapeHTML(previewMsg) + '</pre>' +
          '</div>' +
          '<button type="submit" class="btn btn-primary">Simpan Pengaturan Katalog</button>' +
        '</form>';
    } else if (activeTab === 'struk') {
      var methods = Array.isArray(settings.metodeAktif) ? settings.metodeAktif : ['Tunai', 'QRIS', 'Transfer'];
      var sampleTrx = {
        id: 'TRX-00099',
        waktu: new Date().toISOString(),
        metode: methods[0] || 'Tunai',
        items: [{ nama: 'Kopi Sanger Arabika', qty: 2, harga: 18000 }],
        subtotal: 36000,
        diskon: 0,
        pajak: Math.round(36000 * ((Number(settings.pajakPersen) || 0) / 100)),
        total: 36000 + Math.round(36000 * ((Number(settings.pajakPersen) || 0) / 100)),
        dibayar: 50000,
        kembalian: 50000 - (36000 + Math.round(36000 * ((Number(settings.pajakPersen) || 0) / 100)))
      };

      bodyHTML =
        '<div class="uk-struk-grid">' +
          '<form id="set-struk-form">' +
            '<div class="field"><label for="set-pajak">Persentase Pajak (%)</label><input type="number" id="set-pajak" min="0" max="100" step="0.5" value="' + Number(settings.pajakPersen || 0) + '" /></div>' +
            '<div class="field">' +
              '<label>Metode Pembayaran Aktif</label>' +
              '<div style="display:flex;gap:14px;flex-wrap:wrap">' +
                ['Tunai', 'QRIS', 'Transfer'].map(function (m) {
                  return '<label style="display:inline-flex;align-items:center;gap:6px;font-weight:500"><input type="checkbox" class="set-metode-cb" value="' + m + '"' + (methods.indexOf(m) !== -1 ? ' checked' : '') + ' /> ' + m + '</label>';
                }).join('') +
              '</div>' +
            '</div>' +
            '<div class="field"><label for="set-footer-struk">Catatan Footer Struk</label><textarea id="set-footer-struk" rows="3">' + UKUtils.escapeHTML(settings.footerStruk || '') + '</textarea></div>' +
            '<button type="submit" class="btn btn-primary">Simpan Pengaturan Struk</button>' +
          '</form>' +
          '<div>' +
            '<div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px;text-align:center">PRATINJAU STRUK 58MM</div>' +
            '<div id="set-struk-preview">' + UKUtils.renderStrukHTML(sampleTrx, tenant, settings) + '</div>' +
          '</div>' +
        '</div>';
    } else if (activeTab === 'pengguna') {
      var users = db.users.list({ tenantId: tid });
      var limitUsers = (curPlan && curPlan.batas && curPlan.batas.pengguna) || 1;
      var atUserLimit = users.length >= limitUsers;

      bodyHTML =
        '<div style="max-width:740px">' +
          '<div class="banner info" style="margin-bottom:14px">' +
            '<span>Pengguna terdaftar: <strong>' + users.length + ' / ' + limitUsers + '</strong> (Paket ' + UKUtils.escapeHTML(curPlan.nama) + '). Peran <strong>Kasir</strong> hanya mengakses Kasir/POS, Transaksi, dan Produk (baca).</span>' +
          '</div>' +
          '<div class="table-wrap" style="margin-bottom:16px">' +
            '<table class="uk-table" style="min-width:460px">' +
              '<thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th style="text-align:right">Aksi</th></tr></thead>' +
              '<tbody>' + users.map(function (u) {
                return '<tr><td><strong>' + UKUtils.escapeHTML(u.nama) + '</strong></td><td>' + UKUtils.escapeHTML(u.email) + '</td><td><span class="status ' + (u.peran === 'pemilik' ? 'success' : 'neutral') + '" style="text-transform:capitalize">' + UKUtils.escapeHTML(u.peran) + '</span></td><td style="text-align:right">' + (u.peran === 'kasir' ? '<button type="button" class="btn btn-ghost btn-sm usr-del" data-id="' + UKUtils.escapeHTML(u.id) + '" style="color:var(--red)">Hapus</button>' : '<span style="font-size:11px;color:var(--muted)">Pemilik utama</span>') + '</td></tr>';
              }).join('') + '</tbody>' +
            '</table>' +
          '</div>' +
          '<form id="set-user-form" class="card" style="padding:16px">' +
            '<h3 class="panel-title" style="margin-bottom:10px">Tambah Akun Kasir</h3>' +
            '<div class="form-grid-2">' +
              '<div class="field"><label for="usr-nama">Nama Kasir *</label><input type="text" id="usr-nama" required /></div>' +
              '<div class="field"><label for="usr-email">Email Login *</label><input type="email" id="usr-email" required /></div>' +
            '</div>' +
            '<div class="field"><label for="usr-pass">Kata Sandi Demo *</label><input type="password" id="usr-pass" minlength="6" placeholder="Minimal 6 karakter" required /></div>' +
            '<button type="submit" class="btn btn-primary"' + (atUserLimit ? ' disabled' : '') + '>' + (atUserLimit ? 'Kuota Pengguna Penuh' : '+ Tambah Kasir') + '</button>' +
          '</form>' +
        '</div>';
    } else if (activeTab === 'paket') {
      bodyHTML =
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px">' +
          plans.map(function (p) {
            var isCur = p.id === tenant.paket;
            return (
              '<div class="card" style="display:flex;flex-direction:column;gap:10px;' + (isCur ? 'border-color:var(--orange)' : '') + '">' +
                '<div style="display:flex;justify-content:space-between;align-items:center">' +
                  '<strong style="font-size:16px">' + UKUtils.escapeHTML(p.nama) + '</strong>' +
                  (isCur ? '<span class="status success">Paket Aktif</span>' : '') +
                '</div>' +
                '<div style="font-size:22px;font-weight:800" class="tabular-nums">' + (Number(p.harga) === 0 ? 'Gratis' : UKUtils.escapeHTML(UKUtils.rupiah(p.harga)) + '<small style="font-size:12px;font-weight:500;color:var(--muted)"> /bln</small>') + '</div>' +
                '<div style="font-size:12px;color:var(--muted)">Batas: ' + p.batas.produk + ' produk · ' + p.batas.pengguna + ' pengguna · ' + p.batas.cabang + ' cabang</div>' +
                '<ul style="margin:0;padding-left:16px;font-size:12.5px;flex:1">' + (p.fitur || []).map(function (f) { return '<li>' + UKUtils.escapeHTML(f) + '</li>'; }).join('') + '</ul>' +
                (isCur
                  ? '<button type="button" class="btn btn-light" disabled>Sedang Digunakan</button>'
                  : '<button type="button" class="btn btn-primary set-upgrade-btn">Upgrade ke ' + UKUtils.escapeHTML(p.nama) + '</button>') +
              '</div>'
            );
          }).join('') +
        '</div>';
    } else {
      bodyHTML =
        '<div class="card" style="max-width:520px;border-color:#f3c5c5">' +
          '<h3 class="panel-title" style="color:var(--red);margin-bottom:6px">Reset Data Demo</h3>' +
          '<p style="margin:0 0 12px;font-size:12.5px;color:var(--muted)">Tindakan ini akan mengembalikan seluruh data prototype UsahaKita (produk, transaksi, pelanggan, dan akun demo) ke kondisi awal.</p>' +
          '<div class="field"><label for="set-reset-confirm">Ketik <strong>RESET</strong> untuk mengonfirmasi:</label><input type="text" id="set-reset-confirm" placeholder="RESET" /></div>' +
          '<button type="button" class="btn btn-danger" id="set-btn-reset">Reset Semua Data Demo</button>' +
        '</div>';
    }

    root.innerHTML =
      '<div class="page-header">' +
        '<div>' +
          '<h1 class="page-title">Pengaturan Usaha</h1>' +
          '<p class="page-subtitle">Atur profil usaha, katalog WhatsApp, pajak struk, dan pengguna kasir.</p>' +
        '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<div style="margin-bottom:16px"><div class="tabs">' + tabsHTML + '</div></div>' +
        bodyHTML +
      '</div>';

    root.querySelectorAll('[data-set-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeTab = btn.getAttribute('data-set-tab');
        render(root);
      });
    });

    if (activeTab === 'profil') {
      var logoData = tenant.logo || '';
      root.querySelectorAll('.hr-open').forEach(function (cb) {
        cb.addEventListener('change', function () {
          var d = cb.getAttribute('data-day');
          root.querySelector('.hr-start[data-day="' + d + '"]').disabled = !cb.checked;
          root.querySelector('.hr-end[data-day="' + d + '"]').disabled = !cb.checked;
        });
      });

      root.querySelector('#set-logo').addEventListener('change', function () {
        var f = this.files && this.files[0];
        if (!f) return;
        if (f.size > 300 * 1024) {
          UKUtils.toast('Ukuran logo maksimal 300 KB.', 'error');
          this.value = '';
          return;
        }
        var rd = new FileReader();
        rd.onload = function (ev) {
          logoData = ev.target.result;
          root.querySelector('#set-logo-prev').innerHTML = '<img src="' + UKUtils.escapeHTML(logoData) + '" alt="Logo" style="width:100%;height:100%;object-fit:cover" />';
        };
        rd.readAsDataURL(f);
      });

      root.querySelector('#set-logo-clear').addEventListener('click', function () {
        logoData = '';
        root.querySelector('#set-logo').value = '';
        root.querySelector('#set-logo-prev').textContent = String(root.querySelector('#set-nama').value || 'U').charAt(0).toUpperCase();
      });

      root.querySelector('#set-profil-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var nama = UKUtils.cleanSpaces(root.querySelector('#set-nama').value);
        var jenis = root.querySelector('#set-jenis').value;
        var email = root.querySelector('#set-email').value.trim();
        var wa = UKUtils.normalisasiWA(root.querySelector('#set-wa').value);
        var alamat = UKUtils.cleanSpaces(root.querySelector('#set-alamat').value);
        var deskripsi = UKUtils.cleanSpaces(root.querySelector('#set-desc').value);

        if (!nama || !email || !alamat) { UKUtils.toast('Nama, email, dan alamat usaha wajib diisi.', 'error'); return; }
        if (!wa || wa.length < 10) { UKUtils.toast('Nomor WhatsApp tidak valid.', 'error'); return; }

        var nextHours = {};
        DAYS.forEach(function (d) {
          nextHours[d] = {
            buka: root.querySelector('.hr-open[data-day="' + d + '"]').checked,
            jamBuka: root.querySelector('.hr-start[data-day="' + d + '"]').value || '08:00',
            jamTutup: root.querySelector('.hr-end[data-day="' + d + '"]').value || '21:00'
          };
        });

        db.tenants.update(tid, {
          nama: nama,
          jenis: jenis,
          email: email,
          wa: wa,
          alamat: alamat,
          deskripsi: deskripsi,
          logo: logoData,
          jamOperasional: nextHours
        });
        UKUtils.toast('Profil usaha disimpan.', 'success');
        window.UK.refreshShell();
        render(root);
      });
    } else if (activeTab === 'katalog') {
      var slugInp = root.querySelector('#set-slug');
      var tmplInp = root.querySelector('#set-wa-tmpl');
      function updatePreview() {
        var s = UKUtils.slugify(slugInp.value);
        var url = new URL('../toko/index.html?u=' + encodeURIComponent(s), window.location.href).href;
        root.querySelector('#set-url-preview').textContent = url;
        root.querySelector('#set-wa-preview').textContent = tmplInp.value
          .replace(/\{produk\}/g, 'Kopi Sanger Arabika')
          .replace(/\{harga\}/g, 'Rp 18.000')
          .replace(/\{jumlah\}/g, '2')
          .replace(/\{tautan\}/g, url);
      }
      slugInp.addEventListener('input', updatePreview);
      tmplInp.addEventListener('input', updatePreview);

      root.querySelector('#set-copy-url').addEventListener('click', function () {
        var url = root.querySelector('#set-url-preview').textContent;
        if (navigator.clipboard) navigator.clipboard.writeText(url);
        UKUtils.toast('Tautan katalog disalin.', 'success');
      });

      root.querySelector('#set-katalog-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var nextSlug = UKUtils.slugify(slugInp.value);
        var dup = db.tenants.list().some(function (t) { return t.id !== tid && t.slug === nextSlug; });
        if (dup) { UKUtils.toast('Slug sudah dipakai usaha lain. Pilih slug berbeda.', 'error'); return; }

        db.tenants.update(tid, {
          katalogAktif: root.querySelector('#set-kat-aktif').checked,
          slug: nextSlug
        });
        db.settings.update(tid, { pesanWADefault: tmplInp.value });
        UKUtils.toast('Pengaturan katalog disimpan.', 'success');
        render(root);
      });
    } else if (activeTab === 'struk') {
      var pajakInp = root.querySelector('#set-pajak');
      var footInp = root.querySelector('#set-footer-struk');
      function updateReceiptPreview() {
        var pjk = Math.max(0, Math.min(100, Number(pajakInp.value) || 0));
        var taxAmt = Math.round(36000 * (pjk / 100));
        var total = 36000 + taxAmt;
        var sTrx = {
          id: 'TRX-00099',
          waktu: new Date().toISOString(),
          metode: 'Tunai',
          items: [{ nama: 'Kopi Sanger Arabika', qty: 2, harga: 18000 }],
          subtotal: 36000,
          diskon: 0,
          pajak: taxAmt,
          total: total,
          dibayar: Math.max(50000, total),
          kembalian: Math.max(50000, total) - total
        };
        root.querySelector('#set-struk-preview').innerHTML = UKUtils.renderStrukHTML(sTrx, tenant, { footerStruk: footInp.value });
      }
      pajakInp.addEventListener('input', updateReceiptPreview);
      footInp.addEventListener('input', updateReceiptPreview);

      root.querySelector('#set-struk-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var pjk = Math.max(0, Math.min(100, Number(pajakInp.value) || 0));
        var selectedMethods = [];
        root.querySelectorAll('.set-metode-cb:checked').forEach(function (cb) { selectedMethods.push(cb.value); });
        if (!selectedMethods.length) {
          UKUtils.toast('Pilih minimal satu metode pembayaran.', 'error');
          return;
        }
        db.settings.update(tid, {
          pajakPersen: pjk,
          metodeAktif: selectedMethods,
          footerStruk: footInp.value
        });
        UKUtils.toast('Pengaturan transaksi & struk disimpan.', 'success');
      });
    } else if (activeTab === 'pengguna') {
      root.querySelectorAll('.usr-del').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var uid = btn.getAttribute('data-id');
          UKUtils.confirmDialog('Hapus akun kasir ini?', { confirmText: 'Ya, Hapus', danger: true }).then(function (ok) {
            if (!ok) return;
            db.users.remove(uid, tid);
            UKUtils.toast('Akun kasir dihapus.', 'success');
            render(root);
          });
        });
      });

      root.querySelector('#set-user-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var nama = UKUtils.cleanSpaces(root.querySelector('#usr-nama').value);
        var email = root.querySelector('#usr-email').value.trim().toLowerCase();
        var pass = root.querySelector('#usr-pass').value;
        if (!nama || !email || pass.length < 6) {
          UKUtils.toast('Nama, email, dan sandi (min 6 karakter) wajib diisi.', 'error');
          return;
        }
        if (db.users.findByEmail(email)) {
          UKUtils.toast('Email sudah terdaftar.', 'error');
          return;
        }
        db.users.create({ tenantId: tid, nama: nama, email: email, passwordDemo: pass, peran: 'kasir' });
        UKUtils.toast('Akun kasir ditambahkan.', 'success');
        render(root);
      });
    } else if (activeTab === 'paket') {
      root.querySelectorAll('.set-upgrade-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          UKUtils.toast('Pembayaran belum tersedia di demo', 'info');
        });
      });
    } else {
      root.querySelector('#set-btn-reset').addEventListener('click', function () {
        var val = root.querySelector('#set-reset-confirm').value.trim();
        if (val !== 'RESET') {
          UKUtils.toast('Ketik RESET dengan huruf besar untuk konfirmasi.', 'error');
          return;
        }
        db.reset();
        UKAuth.logout('pemilik');
        UKUtils.toast('Data demo berhasil direset.', 'success');
        setTimeout(function () { window.location.replace('../masuk.html'); }, 500);
      });
    }
  }

  window.UK.registerModule('pengaturan', { render: render });
})();
