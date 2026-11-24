/* Modul Pesan Pelanggan — UsahaKita */
(function () {
  'use strict';

  var state = {
    search: '',
    filter: 'semua',
    activeId: '',
    mobileShowChat: false
  };

  function openAskPhoneModal(tid, conv, tenant, onSaved) {
    var modalId = 'uk-msg-phone-modal';
    var el = UKUtils.openModal({
      id: modalId,
      size: 'sm',
      title: 'Isi Nomor WhatsApp Pelanggan',
      bodyHTML:
        '<p style="margin:0 0 10px;font-size:12.5px;color:var(--muted)">Nomor WhatsApp untuk <strong>' + UKUtils.escapeHTML(conv.nama) + '</strong> belum tersedia. Masukkan nomor untuk melanjutkan ke WhatsApp.</p>' +
        '<div class="field" style="margin-bottom:0"><label for="msg-wa-inp">Nomor WhatsApp *</label><input type="tel" id="msg-wa-inp" placeholder="0812..." required /></div>',
      footerHTML:
        '<button type="button" class="btn btn-light" data-cancel-mwa>Batal</button>' +
        '<button type="button" class="btn btn-primary" data-save-mwa>Simpan &amp; Lanjut WA</button>'
    });
    el.querySelector('[data-cancel-mwa]').addEventListener('click', function () { UKUtils.closeModal(modalId); });
    el.querySelector('[data-save-mwa]').addEventListener('click', function () {
      var norm = UKUtils.normalisasiWA(el.querySelector('#msg-wa-inp').value);
      if (!norm || norm.length < 9) {
        UKUtils.toast('Nomor WhatsApp tidak valid.', 'error');
        return;
      }
      db.conversations.update(conv.id, { telepon: norm }, tid);
      UKUtils.closeModal(modalId);
      if (onSaved) onSaved(norm);
    });
  }

  function render(root) {
    var tid = window.UK.getSession().tenantId;
    var tenant = window.UK.getTenant();
    var allConvs = db.conversations.list({ tenantId: tid }).slice().sort(function (a, b) {
      var la = (a.messages && a.messages.length) ? a.messages[a.messages.length - 1].waktu : '';
      var lb = (b.messages && b.messages.length) ? b.messages[b.messages.length - 1].waktu : '';
      return new Date(lb || 0) - new Date(la || 0);
    });

    var q = state.search.trim().toLowerCase();
    var filtered = allConvs.filter(function (c) {
      if (state.filter === 'unread' && !(Number(c.unread) > 0)) return false;
      if (state.filter === 'wa' && c.kanal !== 'WhatsApp') return false;
      if (q) {
        var lastTxt = (c.messages && c.messages.length) ? c.messages[c.messages.length - 1].teks : '';
        if ((c.nama + ' ' + lastTxt).toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    });

    if (!state.activeId && filtered.length) {
      state.activeId = filtered[0].id;
    }
    var activeConv = allConvs.find(function (c) { return c.id === state.activeId; }) || null;
    if (activeConv && Number(activeConv.unread) > 0 && (window.innerWidth > 768 || state.mobileShowChat)) {
      db.conversations.update(activeConv.id, { unread: 0 }, tid);
      activeConv.unread = 0;
      window.UK.refreshShell();
    }

    var isMob = window.innerWidth <= 768;
    var showList = !isMob || !state.mobileShowChat;
    var showChat = !isMob || state.mobileShowChat;

    var listHTML = filtered.length ? filtered.map(function (c) {
      var msgs = c.messages || [];
      var last = msgs.length ? msgs[msgs.length - 1] : null;
      var isAct = activeConv && activeConv.id === c.id;
      return (
        '<button type="button" class="msg-conv-item" data-id="' + UKUtils.escapeHTML(c.id) + '" style="width:100%;text-align:left;padding:11px 12px;border:none;border-bottom:1px solid var(--line);background:' + (isAct ? 'var(--orange-soft)' : 'transparent') + ';cursor:pointer;display:flex;flex-direction:column;gap:4px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px">' +
            '<strong style="font-size:13px">' + UKUtils.escapeHTML(c.nama) + '</strong>' +
            (Number(c.unread) > 0 ? '<span class="nav-badge" style="margin-left:0">' + Number(c.unread) + '</span>' : '<span style="font-size:10.5px;color:var(--muted)">' + UKUtils.escapeHTML(c.kanal) + '</span>') +
          '</div>' +
          '<div style="font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + UKUtils.escapeHTML(last ? last.teks : 'Belum ada pesan') + '</div>' +
        '</button>'
      );
    }).join('') : '<div class="empty-note" style="margin:12px">Tidak ada percakapan.</div>';

    var chatHTML = '';
    var infoHTML = '';
    if (!activeConv) {
      chatHTML = '<div class="empty-note" style="margin:24px">Pilih percakapan untuk mulai membalas.</div>';
      infoHTML = '<div style="color:var(--muted);font-size:12px">Pilih percakapan untuk melihat info pelanggan.</div>';
    } else {
      var msgs = activeConv.messages || [];
      var lastDateLabel = '';
      var bubblesHTML = msgs.map(function (m) {
        var dLbl = UKUtils.tanggalIndo(m.waktu);
        var dateSep = '';
        if (dLbl !== lastDateLabel) {
          lastDateLabel = dLbl;
          dateSep = '<div style="text-align:center;margin:10px 0"><span style="font-size:10.5px;color:var(--muted);background:#eef0f5;padding:3px 9px;border-radius:999px">' + UKUtils.escapeHTML(dLbl) + '</span></div>';
        }
        var isOwner = m.dari === 'pemilik';
        var timeOnly = new Date(m.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        return dateSep +
          '<div style="display:flex;justify-content:' + (isOwner ? 'flex-end' : 'flex-start') + ';margin-bottom:8px">' +
            '<div style="max-width:78%;padding:9px 12px;border-radius:12px;font-size:12.5px;background:' + (isOwner ? 'var(--navy)' : '#f1f3f8') + ';color:' + (isOwner ? '#fff' : 'var(--ink)') + '">' +
              '<div style="white-space:pre-wrap;word-break:break-word">' + UKUtils.escapeHTML(m.teks) + '</div>' +
              '<div style="font-size:10px;opacity:0.72;margin-top:3px;text-align:right">' + UKUtils.escapeHTML(timeOnly) + '</div>' +
            '</div>' +
          '</div>';
      }).join('');

      chatHTML =
        '<div style="padding:12px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:8px">' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            (isMob ? '<button type="button" class="btn btn-light btn-sm" id="msg-back-btn">&larr; Daftar</button>' : '') +
            '<div><strong style="font-size:14px">' + UKUtils.escapeHTML(activeConv.nama) + '</strong><div style="font-size:11px;color:var(--muted)">Kanal: ' + UKUtils.escapeHTML(activeConv.kanal) + (activeConv.telepon ? ' · +' + UKUtils.escapeHTML(activeConv.telepon) : '') + '</div></div>' +
          '</div>' +
          '<button type="button" class="btn btn-light btn-sm" id="msg-wa-top">Lanjut WhatsApp</button>' +
        '</div>' +
        '<div id="msg-scroll-box" style="flex:1;overflow-y:auto;padding:14px;min-height:280px;max-height:420px;background:#fff">' + bubblesHTML + '</div>' +
        '<div style="padding:10px 12px;border-top:1px solid var(--line);background:#fafbfd">' +
          '<div class="chips" style="margin-bottom:8px">' +
            ['Produk masih tersedia', 'Cek pengiriman', 'Terima kasih'].map(function (qr) {
              return '<button type="button" class="chip msg-quick-reply" data-text="' + UKUtils.escapeHTML(qr) + '">' + UKUtils.escapeHTML(qr) + '</button>';
            }).join('') +
          '</div>' +
          '<div style="display:flex;gap:8px;align-items:flex-end">' +
            '<textarea id="msg-input" class="uk-textarea" rows="2" placeholder="Tulis balasan... (Enter kirim, Shift+Enter baris baru)" style="min-height:44px;resize:none"></textarea>' +
            '<button type="button" class="btn btn-primary" id="msg-send-btn">Kirim</button>' +
          '</div>' +
        '</div>';

      var lastContact = msgs.length ? UKUtils.tanggalIndo(msgs[msgs.length - 1].waktu, true) : '-';
      infoHTML =
        '<div style="display:flex;flex-direction:column;gap:10px">' +
          '<div><div style="font-size:11px;color:var(--muted)">Sumber Pesan</div><strong>' + UKUtils.escapeHTML(activeConv.kanal) + '</strong></div>' +
          '<div><div style="font-size:11px;color:var(--muted)">Status Percakapan</div><span class="status ' + (Number(activeConv.unread) > 0 ? 'pending' : 'success') + '">' + (Number(activeConv.unread) > 0 ? 'Belum dibaca' : 'Terbaca') + '</span></div>' +
          '<div><div style="font-size:11px;color:var(--muted)">Terakhir Dihubungi</div><span style="font-size:12.5px">' + UKUtils.escapeHTML(lastContact) + '</span></div>' +
          '<div><div style="font-size:11px;color:var(--muted)">WhatsApp</div><span class="tabular-nums" style="font-size:12.5px">' + (activeConv.telepon ? '+' + UKUtils.escapeHTML(activeConv.telepon) : 'Belum diisi') + '</span></div>' +
          '<div class="field" style="margin-bottom:4px">' +
            '<label for="msg-note-inp">Catatan Pelanggan</label>' +
            '<textarea id="msg-note-inp" rows="3" placeholder="Tulis catatan internal...">' + UKUtils.escapeHTML(activeConv.catatan || '') + '</textarea>' +
          '</div>' +
          '<button type="button" class="btn btn-light btn-sm" id="msg-save-note">Simpan Catatan</button>' +
          '<button type="button" class="btn btn-primary btn-sm" id="msg-wa-side">Lanjut WhatsApp</button>' +
        '</div>';
    }

    root.innerHTML =
      '<div class="page-header">' +
        '<div>' +
          '<h1 class="page-title">Pesan Pelanggan</h1>' +
          '<p class="page-subtitle">Kelola pertanyaan dari form katalog website dan percakapan WhatsApp dalam satu tempat.</p>' +
        '</div>' +
      '</div>' +

      '<div class="panel" style="padding:0;overflow:hidden">' +
        '<div style="display:grid;grid-template-columns:' + (isMob ? '1fr' : '270px 1fr 250px') + ';min-height:500px">' +
          (showList ? (
            '<div style="border-right:1px solid var(--line);display:flex;flex-direction:column">' +
              '<div style="padding:12px;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:8px">' +
                '<input type="search" id="msg-search" class="uk-input" placeholder="Cari pelanggan atau pesan..." value="' + UKUtils.escapeHTML(state.search) + '" />' +
                '<div class="chips">' +
                  [['semua', 'Semua'], ['unread', 'Belum dibaca'], ['wa', 'WhatsApp']].map(function (f) {
                    return '<button type="button" class="chip ' + (state.filter === f[0] ? 'active' : '') + '" data-msg-filter="' + f[0] + '">' + f[1] + '</button>';
                  }).join('') +
                '</div>' +
              '</div>' +
              '<div style="flex:1;overflow-y:auto;max-height:460px">' + listHTML + '</div>' +
            '</div>'
          ) : '') +

          (showChat ? '<div style="display:flex;flex-direction:column;min-width:0">' + chatHTML + '</div>' : '') +

          (!isMob ? '<div style="border-left:1px solid var(--line);padding:14px;background:#fafbfd">' + infoHTML + '</div>' : '') +
        '</div>' +
      '</div>';

    var scrollBox = root.querySelector('#msg-scroll-box');
    if (scrollBox) scrollBox.scrollTop = scrollBox.scrollHeight;

    var sInp = root.querySelector('#msg-search');
    if (sInp) {
      sInp.addEventListener('input', UKUtils.debounce(function () {
        state.search = sInp.value;
        render(root);
        var n = root.querySelector('#msg-search');
        if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
      }, 220));
    }

    root.querySelectorAll('[data-msg-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.filter = btn.getAttribute('data-msg-filter');
        render(root);
      });
    });

    root.querySelectorAll('.msg-conv-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cid = btn.getAttribute('data-id');
        state.activeId = cid;
        state.mobileShowChat = true;
        db.conversations.update(cid, { unread: 0 }, tid);
        window.UK.refreshShell();
        render(root);
      });
    });

    var backBtn = root.querySelector('#msg-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        state.mobileShowChat = false;
        render(root);
      });
    }

    if (activeConv) {
      function sendMessage(text) {
        var clean = String(text || '').trim();
        if (!clean) return;
        var nextMsgs = (activeConv.messages || []).slice();
        nextMsgs.push({ dari: 'pemilik', teks: clean, waktu: new Date().toISOString() });
        db.conversations.update(activeConv.id, { messages: nextMsgs, unread: 0 }, tid);
        render(root);
      }

      var msgInput = root.querySelector('#msg-input');
      if (msgInput) {
        msgInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(msgInput.value);
          }
        });
      }
      var sendBtn = root.querySelector('#msg-send-btn');
      if (sendBtn) {
        sendBtn.addEventListener('click', function () {
          sendMessage(msgInput.value);
        });
      }
      root.querySelectorAll('.msg-quick-reply').forEach(function (btn) {
        btn.addEventListener('click', function () {
          msgInput.value = btn.getAttribute('data-text');
          msgInput.focus();
        });
      });

      var saveNoteBtn = root.querySelector('#msg-save-note');
      if (saveNoteBtn) {
        saveNoteBtn.addEventListener('click', function () {
          var noteVal = root.querySelector('#msg-note-inp').value;
          db.conversations.update(activeConv.id, { catatan: noteVal }, tid);
          UKUtils.toast('Catatan pelanggan disimpan.', 'success');
        });
      }

      function triggerWA() {
        var greet = 'Halo ' + activeConv.nama + ', saya dari ' + tenant.nama + ' menindaklanjuti pertanyaan Anda.';
        if (activeConv.telepon) {
          var url = UKUtils.buatLinkWA(activeConv.telepon, greet);
          var link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener';
          link.click();
        } else {
          openAskPhoneModal(tid, activeConv, tenant, function (norm) {
            render(root);
            var url = UKUtils.buatLinkWA(norm, greet);
            var link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener';
            link.click();
          });
        }
      }

      var waTop = root.querySelector('#msg-wa-top');
      var waSide = root.querySelector('#msg-wa-side');
      if (waTop) waTop.addEventListener('click', triggerWA);
      if (waSide) waSide.addEventListener('click', triggerWA);
    }
  }

  window.UK.registerModule('pesan', { render: render });
})();
