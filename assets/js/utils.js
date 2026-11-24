/* UsahaKita — Utilitas Bersama */
(function (global) {
  'use strict';

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function rupiah(n) {
    var num = Number(n);
    if (!Number.isFinite(num)) num = 0;
    var neg = num < 0;
    var abs = Math.round(Math.abs(num));
    var formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-Rp ' : 'Rp ') + formatted;
  }

  var BULAN_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  function tanggalIndo(input, withTime) {
    if (!input) return '-';
    var d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return '-';
    var tgl = String(d.getDate()).padStart(2, '0');
    var bln = BULAN_ID[d.getMonth()];
    var thn = d.getFullYear();
    var base = tgl + ' ' + bln + ' ' + thn;
    if (!withTime) return base;
    var jam = String(d.getHours()).padStart(2, '0');
    var mnt = String(d.getMinutes()).padStart(2, '0');
    return base + ', ' + jam + ':' + mnt;
  }

  function hariIndo(date) {
    var d = date instanceof Date ? date : new Date(date || Date.now());
    return HARI_ID[d.getDay()];
  }

  function slugify(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'usaha';
  }

  function titleCase(str) {
    return String(str || '')
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(function (w) {
        return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '';
      })
      .join(' ');
  }

  function cleanSpaces(str) {
    return String(str || '').trim().replace(/\s+/g, ' ');
  }

  function debounce(fn, wait) {
    var timer = null;
    var delay = typeof wait === 'number' ? wait : 250;
    return function () {
      var ctx = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, delay);
    };
  }

  function normalisasiWA(nomor) {
    var digits = String(nomor || '').replace(/[^0-9]/g, '');
    if (!digits) return '';
    if (digits.startsWith('0')) {
      digits = '62' + digits.slice(1);
    } else if (digits.startsWith('8')) {
      digits = '62' + digits;
    } else if (!digits.startsWith('62') && digits.length >= 8) {
      digits = '62' + digits;
    }
    return digits;
  }

  function buatLinkWA(nomor, teks) {
    var wa = normalisasiWA(nomor);
    if (!wa) return '#';
    return 'https://wa.me/' + wa + (teks ? '?text=' + encodeURIComponent(teks) : '');
  }

  function toast(msg, type) {
    var container = document.getElementById('uk-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'uk-toast-container';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    var item = document.createElement('div');
    item.className = 'toast ' + (type || 'info');
    var span = document.createElement('span');
    span.textContent = String(msg || '');
    item.appendChild(span);
    container.appendChild(item);
    setTimeout(function () {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 3200);
  }

  var modalStack = [];
  function onEscModal(e) {
    if (e.key === 'Escape' && modalStack.length > 0) {
      var top = modalStack[modalStack.length - 1];
      closeModal(top.id);
    }
  }

  function openModal(opts) {
    var o = opts || {};
    var id = o.id || 'uk-modal-' + Date.now();
    closeModal(id);

    var previousFocus = document.activeElement;
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = id;
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');

    var sizeClass = o.size === 'lg' ? 'modal-lg' : o.size === 'sm' ? 'modal-sm' : '';
    var modal = document.createElement('div');
    modal.className = 'modal ' + sizeClass;

    var header = document.createElement('div');
    header.className = 'modal-header';
    var h3 = document.createElement('h3');
    h3.className = 'modal-title';
    h3.textContent = o.title || '';
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close';
    closeBtn.setAttribute('aria-label', 'Tutup dialog');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', function () {
      closeModal(id);
    });
    header.appendChild(h3);
    header.appendChild(closeBtn);

    var body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof o.bodyHTML === 'string') {
      body.innerHTML = o.bodyHTML;
    } else if (o.bodyEl) {
      body.appendChild(o.bodyEl);
    }

    modal.appendChild(header);
    modal.appendChild(body);

    if (o.footerHTML) {
      var footer = document.createElement('div');
      footer.className = 'modal-footer';
      footer.innerHTML = o.footerHTML;
      modal.appendChild(footer);
    }

    backdrop.appendChild(modal);
    backdrop.addEventListener('mousedown', function (e) {
      if (e.target === backdrop && o.closeOnBackdrop !== false) {
        closeModal(id);
      }
    });

    document.body.appendChild(backdrop);
    if (modalStack.length === 0) {
      document.addEventListener('keydown', onEscModal);
    }
    modalStack.push({ id: id, el: backdrop, prevFocus: previousFocus, onClose: o.onClose });
    closeBtn.focus();
    return backdrop;
  }

  function closeModal(id) {
    var idx = -1;
    for (var i = modalStack.length - 1; i >= 0; i--) {
      if (!id || modalStack[i].id === id) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return;
    var entry = modalStack.splice(idx, 1)[0];
    if (entry.el && entry.el.parentNode) {
      entry.el.parentNode.removeChild(entry.el);
    }
    if (typeof entry.onClose === 'function') {
      entry.onClose();
    }
    if (modalStack.length === 0) {
      document.removeEventListener('keydown', onEscModal);
    }
    if (entry.prevFocus && typeof entry.prevFocus.focus === 'function') {
      try { entry.prevFocus.focus(); } catch (_) {}
    }
  }

  function confirmDialog(msg, opts) {
    var o = opts || {};
    return new Promise(function (resolve) {
      var settled = false;
      var modalId = 'uk-confirm-' + Date.now();
      var bodyHTML = '<p style="margin:0 0 6px;font-size:13.5px;color:var(--ink)">' + escapeHTML(msg) + '</p>';
      if (o.subtitle) {
        bodyHTML += '<p style="margin:0;font-size:12px;color:var(--muted)">' + escapeHTML(o.subtitle) + '</p>';
      }
      var footerHTML =
        '<button type="button" class="btn btn-light" data-confirm-no>' + escapeHTML(o.cancelText || 'Batal') + '</button>' +
        '<button type="button" class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" data-confirm-yes>' + escapeHTML(o.confirmText || 'Ya, Lanjutkan') + '</button>';

      var el = openModal({
        id: modalId,
        size: 'sm',
        title: o.title || 'Konfirmasi',
        bodyHTML: bodyHTML,
        footerHTML: footerHTML,
        onClose: function () {
          if (!settled) {
            settled = true;
            resolve(false);
          }
        }
      });

      el.querySelector('[data-confirm-no]').addEventListener('click', function () {
        settled = true;
        closeModal(modalId);
        resolve(false);
      });
      el.querySelector('[data-confirm-yes]').addEventListener('click', function () {
        settled = true;
        closeModal(modalId);
        resolve(true);
      });
    });
  }

  function downloadCSV(namaFile, rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      toast('Tidak ada data untuk diekspor.', 'warning');
      return;
    }
    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        var val = cell === null || cell === undefined ? '' : String(cell);
        val = val.replace(/"/g, '""');
        return '"' + val + '"';
      }).join(',');
    }).join('\r\n');

    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = namaFile || 'ekspor.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function renderStrukHTML(trx, tenant, settings) {
    var t = tenant || {};
    var s = settings || {};
    var itemsHTML = (trx.items || []).map(function (it) {
      var lineTotal = Number(it.qty) * Number(it.harga);
      return (
        '<div style="display:flex;justify-content:space-between;gap:6px;margin-bottom:3px">' +
        '<span>' + escapeHTML(it.nama) + ' x' + Number(it.qty) + '</span>' +
        '<span style="white-space:nowrap">' + escapeHTML(rupiah(lineTotal)) + '</span>' +
        '</div>'
      );
    }).join('');

    var waDisplay = t.wa ? ('WA: +' + normalisasiWA(t.wa)) : '';
    return (
      '<div class="uk-receipt-box" style="font-family:\'Courier New\',monospace;font-size:11.5px;line-height:1.45;color:#111;max-width:260px;margin:0 auto;padding:10px;border:1px dashed #cfd4df;border-radius:8px;background:#fff">' +
        '<div style="text-align:center;margin-bottom:8px">' +
          '<div style="font-weight:700;font-size:13px">' + escapeHTML(t.nama || 'UsahaKita') + '</div>' +
          (t.alamat ? '<div style="font-size:10.5px;color:#444">' + escapeHTML(t.alamat) + '</div>' : '') +
          (waDisplay ? '<div style="font-size:10.5px;color:#444">' + escapeHTML(waDisplay) + '</div>' : '') +
        '</div>' +
        '<div style="border-top:1px dashed #999;border-bottom:1px dashed #999;padding:5px 0;margin-bottom:6px;font-size:10.5px">' +
          '<div>No: ' + escapeHTML(trx.id) + '</div>' +
          '<div>Tgl: ' + escapeHTML(tanggalIndo(trx.waktu, true)) + '</div>' +
          '<div>Metode: ' + escapeHTML(trx.metode || 'Tunai') + '</div>' +
        '</div>' +
        '<div style="margin-bottom:6px">' + itemsHTML + '</div>' +
        '<div style="border-top:1px dashed #999;padding-top:5px">' +
          '<div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>' + escapeHTML(rupiah(trx.subtotal)) + '</span></div>' +
          (Number(trx.diskon) > 0 ? '<div style="display:flex;justify-content:space-between"><span>Diskon</span><span>-' + escapeHTML(rupiah(trx.diskon)) + '</span></div>' : '') +
          (Number(trx.pajak) > 0 ? '<div style="display:flex;justify-content:space-between"><span>Pajak</span><span>' + escapeHTML(rupiah(trx.pajak)) + '</span></div>' : '') +
          '<div style="display:flex;justify-content:space-between;font-weight:700;font-size:12.5px;margin-top:3px"><span>TOTAL</span><span>' + escapeHTML(rupiah(trx.total)) + '</span></div>' +
          '<div style="display:flex;justify-content:space-between;margin-top:3px"><span>Dibayar</span><span>' + escapeHTML(rupiah(trx.dibayar)) + '</span></div>' +
          '<div style="display:flex;justify-content:space-between"><span>Kembalian</span><span>' + escapeHTML(rupiah(trx.kembalian)) + '</span></div>' +
        '</div>' +
        '<div style="text-align:center;border-top:1px dashed #999;margin-top:8px;padding-top:6px;font-size:10.5px;color:#444">' +
          escapeHTML(s.footerStruk || 'Terima kasih telah berbelanja!') +
        '</div>' +
      '</div>'
    );
  }

  function cetakStruk(trx, tenant, settings) {
    var root = document.getElementById('uk-print-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'uk-print-root';
      document.body.appendChild(root);
    }
    root.innerHTML = renderStrukHTML(trx, tenant, settings);
    document.body.classList.add('uk-printing-receipt');
    try {
      window.print();
    } finally {
      setTimeout(function () {
        document.body.classList.remove('uk-printing-receipt');
      }, 300);
    }
  }

  global.UKUtils = {
    escapeHTML: escapeHTML,
    rupiah: rupiah,
    tanggalIndo: tanggalIndo,
    hariIndo: hariIndo,
    slugify: slugify,
    titleCase: titleCase,
    cleanSpaces: cleanSpaces,
    debounce: debounce,
    normalisasiWA: normalisasiWA,
    buatLinkWA: buatLinkWA,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    confirmDialog: confirmDialog,
    downloadCSV: downloadCSV,
    renderStrukHTML: renderStrukHTML,
    cetakStruk: cetakStruk
  };
})(window);
