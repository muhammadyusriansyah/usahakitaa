/* UsahaKita — Autentikasi Demo (Klien)
 * CATATAN PRODUKSI:
 * Autentikasi di browser hanya untuk prototype. Di lingkungan produksi WAJIB:
 * 1. Verifikasi kredensial di sisi server (backend API) melalui HTTPS.
 * 2. Penyimpanan kata sandi ter-hash kuat (bcrypt / Argon2id), bukan plain text.
 * 3. Pembatasan percobaan login (rate limiting) & proteksi CSRF/JWT HttpOnly cookie.
 */
(function (global) {
  'use strict';

  var KEY_OWNER = 'uk_session_owner';
  var KEY_ADMIN = 'uk_session_admin';
  var KEY_REMEMBER = 'uk_remember_owner';
  var memSession = { pemilik: null, admin: null };

  function readSessionStorage(key) {
    try {
      var raw = global.sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeSessionStorage(key, val) {
    try {
      if (val === null) global.sessionStorage.removeItem(key);
      else global.sessionStorage.setItem(key, JSON.stringify(val));
    } catch (_) {
      /* Abaikan jika sessionStorage tidak tersedia */
    }
  }

  function readRememberedOwner() {
    try {
      var raw = global.localStorage.getItem(KEY_REMEMBER);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeRememberedOwner(val) {
    try {
      if (val === null) global.localStorage.removeItem(KEY_REMEMBER);
      else global.localStorage.setItem(KEY_REMEMBER, JSON.stringify(val));
    } catch (_) {}
  }

  function currentSession(peran) {
    var role = peran === 'admin' ? 'admin' : 'pemilik';
    var key = role === 'admin' ? KEY_ADMIN : KEY_OWNER;
    var s = readSessionStorage(key) || memSession[role];
    if (!s && role === 'pemilik') {
      var rem = readRememberedOwner();
      if (rem) {
        writeSessionStorage(KEY_OWNER, rem);
        memSession.pemilik = rem;
        s = rem;
      }
    }
    if (!s) return null;
    if (role === 'pemilik' && global.db) {
      var tenant = global.db.tenants.get(s.tenantId);
      if (!tenant || tenant.status === 'Ditangguhkan') {
        logout('pemilik');
        return null;
      }
    }
    return s;
  }

  function login(identifier, password, peran, opts) {
    var role = peran === 'admin' ? 'admin' : 'pemilik';
    var idTrim = String(identifier || '').trim();
    var pass = String(password || '');

    if (role === 'admin') {
      if (idTrim === 'admin' && pass === 'admin') {
        var adminSession = {
          role: 'admin',
          userId: 'admin_platform',
          nama: 'Admin UsahaKita',
          email: 'admin@usahakita.id',
          loginAt: new Date().toISOString()
        };
        memSession.admin = adminSession;
        writeSessionStorage(KEY_ADMIN, adminSession);
        return { ok: true, session: adminSession };
      }
      return { ok: false, code: 'INVALID_CREDENTIALS', error: 'Username atau kata sandi salah.' };
    }

    if (!global.db) {
      return { ok: false, code: 'NO_DB', error: 'Lapisan data belum siap.' };
    }

    var user = global.db.users.findByEmail(idTrim);
    if (!user || user.passwordDemo !== pass) {
      return { ok: false, code: 'INVALID_CREDENTIALS', error: 'Email atau kata sandi tidak sesuai.' };
    }

    var tenant = global.db.tenants.get(user.tenantId);
    if (!tenant) {
      return { ok: false, code: 'NO_TENANT', error: 'Data usaha tidak ditemukan.' };
    }
    if (tenant.status === 'Ditangguhkan') {
      return {
        ok: false,
        code: 'SUSPENDED',
        error: 'Akun usaha Anda sedang ditangguhkan oleh admin platform. Hubungi dukungan untuk informasi lebih lanjut.'
      };
    }

    var ownerSession = {
      role: 'pemilik',
      userId: user.id,
      tenantId: user.tenantId,
      nama: user.nama,
      email: user.email,
      peranUser: user.peran || 'pemilik',
      loginAt: new Date().toISOString()
    };
    memSession.pemilik = ownerSession;
    writeSessionStorage(KEY_OWNER, ownerSession);
    if (opts && opts.remember) {
      writeRememberedOwner(ownerSession);
    } else {
      writeRememberedOwner(null);
    }
    return { ok: true, session: ownerSession };
  }

  function setSessionDirect(sessionObj, remember) {
    memSession.pemilik = sessionObj;
    writeSessionStorage(KEY_OWNER, sessionObj);
    if (remember) writeRememberedOwner(sessionObj);
  }

  function logout(peran) {
    var role = peran === 'admin' ? 'admin' : 'pemilik';
    memSession[role] = null;
    writeSessionStorage(role === 'admin' ? KEY_ADMIN : KEY_OWNER, null);
    if (role === 'pemilik') {
      writeRememberedOwner(null);
    }
  }

  function requireAuth(peran, loginPath) {
    var role = peran === 'admin' ? 'admin' : 'pemilik';
    var session = currentSession(role);
    if (!session) {
      if (role === 'pemilik') {
        var target = loginPath || (global.location.pathname.indexOf('/app/') !== -1 ? '../masuk.html' : 'masuk.html');
        global.location.replace(target);
      }
      return null;
    }
    return session;
  }

  global.UKAuth = {
    login: login,
    logout: logout,
    currentSession: currentSession,
    requireAuth: requireAuth,
    setSessionDirect: setSessionDirect
  };
})(window);
