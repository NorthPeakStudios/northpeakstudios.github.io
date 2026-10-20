/* Axon local storage (IndexedDB) · Northpeak Studios */
(function () {
  'use strict';
  var db = null;
  function open() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('axon-vault', 1);
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains('notes')) d.createObjectStore('notes', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('folders')) d.createObjectStore('folders', { keyPath: 'path' });
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'k' });
      };
      r.onsuccess = function () {
        db = r.result;
        db.onversionchange = function () { try { db.close(); } catch (e) {} db = null; };
        db.onclose = function () { db = null; };
        res(db);
      };
      r.onerror = function () { rej(r.error); };
    });
  }
  /* iOS can drop a home-screen app's database connection while it sits in the background
     ("connection is closing" / "connection lost"). Without this, every save after that fails
     silently until the app is restarted. Reopen once and retry; saves are plain puts/deletes,
     so running one again is harmless. */
  function lost(e) { var s = String((e && (e.name + ' ' + e.message)) || ''); return /InvalidState|UnknownError|TransactionInactive|clos|lost|connection/i.test(s) && !/Quota/i.test(s); }
  function run(d, store, mode, fn) {
    return new Promise(function (res, rej) {
      var t, out;
      try { t = d.transaction(store, mode); var r = fn(t.objectStore(store)); if (r && 'onsuccess' in r) r.onsuccess = function () { out = r.result; }; }
      catch (e) { rej(e); return; }
      t.oncomplete = function () { res(out); };
      t.onerror = t.onabort = function () { rej(t.error || new Error('Storage transaction aborted')); };
    });
  }
  function tx(store, mode, fn) {
    return (db ? Promise.resolve(db) : open()).then(function (d) { return run(d, store, mode, fn); }).catch(function (e) {
      if (!lost(e)) throw e;
      db = null;
      return open().then(function (d) { return run(d, store, mode, fn); });
    });
  }
  /* images live in their own database so the notes database is never upgraded or touched */
  var mdb = null;
  function mopen() {
    if (mdb) return Promise.resolve(mdb);
    return new Promise(function (res, rej) {
      var r = indexedDB.open('axon-media', 1);
      r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains('images')) d.createObjectStore('images', { keyPath: 'id' }); };
      r.onsuccess = function () { mdb = r.result; mdb.onversionchange = function () { mdb.close(); mdb = null; }; res(mdb); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function mtx(mode, fn) {
    return mopen().then(function (d) { return run(d, 'images', mode, fn); }).catch(function (e) {
      if (!lost(e)) throw e;
      try { mdb && mdb.close(); } catch (x) {} mdb = null;
      return mopen().then(function (d) { return run(d, 'images', mode, fn); });
    });
  }

  /* Recall schedules live in their own database too: notes are never migrated */
  var rdb = null;
  function ropen() {
    if (rdb) return Promise.resolve(rdb);
    return new Promise(function (res, rej) {
      var r = indexedDB.open('axon-recall', 1);
      r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains('cards')) d.createObjectStore('cards', { keyPath: 'id' }); if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'k' }); };
      r.onsuccess = function () { rdb = r.result; rdb.onversionchange = function () { rdb.close(); rdb = null; }; res(rdb); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function rtx(store, mode, fn) {
    return ropen().then(function (d) { return run(d, store, mode, fn); }).catch(function (e) {
      if (!lost(e)) throw e;
      try { rdb && rdb.close(); } catch (x) {} rdb = null;
      return ropen().then(function (d) { return run(d, store, mode, fn); });
    });
  }

  window.RC = {
    all: function (s) { return rtx(s, 'readonly', function (st) { return st.getAll(); }); },
    put: function (s, o) { return rtx(s, 'readwrite', function (st) { return st.put(o); }); },
    del: function (s, ids) { return rtx(s, 'readwrite', function (st) { ids.forEach(function (k) { st.delete(k); }); }); },
    clear: function (s) { return rtx(s, 'readwrite', function (st) { return st.clear(); }); }
  };
  /* Discover keeps its fetched cards and hidden titles in a separate database */
  var ddb = null;
  function dopen() {
    if (ddb) return Promise.resolve(ddb);
    return new Promise(function (res, rej) {
      var r = indexedDB.open('axon-discover', 1);
      r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains('cache')) d.createObjectStore('cache', { keyPath: 'k' }); if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'k' }); };
      r.onsuccess = function () { ddb = r.result; ddb.onversionchange = function () { ddb.close(); ddb = null; }; res(ddb); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function dtx(store, mode, fn) {
    return dopen().then(function (d) { return run(d, store, mode, fn); }).catch(function (e) {
      if (!lost(e)) throw e;
      try { ddb && ddb.close(); } catch (x) {} ddb = null;
      return dopen().then(function (d) { return run(d, store, mode, fn); });
    });
  }

  window.DC = {
    all: function (s) { return dtx(s, 'readonly', function (st) { return st.getAll(); }); },
    get: function (s, k) { return dtx(s, 'readonly', function (st) { return st.get(k); }); },
    put: function (s, o) { return dtx(s, 'readwrite', function (st) { return st.put(o); }); },
    clear: function (s) { return dtx(s, 'readwrite', function (st) { return st.clear(); }); }
  };
  window.IMG = {
    put: function (o) { return mtx('readwrite', function (s) { return s.put(o); }); },
    get: function (id) { return mtx('readonly', function (s) { return s.get(id); }); },
    keys: function () { return mtx('readonly', function (s) { return s.getAllKeys(); }); },
    del: function (ids) { return mtx('readwrite', function (s) { ids.forEach(function (k) { s.delete(k); }); }); },
    clear: function () { return mtx('readwrite', function (s) { return s.clear(); }); }
  };
  /* note history (versions) lives in its own database too */
  var hdb = null;
  function hopen() {
    if (hdb) return Promise.resolve(hdb);
    return new Promise(function (res, rej) {
      var r = indexedDB.open('axon-history', 1);
      r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains('versions')) { var s = d.createObjectStore('versions', { keyPath: 'k' }); s.createIndex('id', 'id', { unique: false }); } };
      r.onsuccess = function () { hdb = r.result; hdb.onversionchange = function () { hdb.close(); hdb = null; }; res(hdb); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function htx(mode, fn) {
    return hopen().then(function (d) { return run(d, 'versions', mode, fn); }).catch(function (e) {
      if (!lost(e)) throw e;
      try { hdb && hdb.close(); } catch (x) {} hdb = null;
      return hopen().then(function (d) { return run(d, 'versions', mode, fn); });
    });
  }

  window.HIST = {
    list: function (id) { return htx('readonly', function (s) { return s.index('id').getAll(id); }); },
    all: function () { return htx('readonly', function (s) { return s.getAll(); }); },
    put: function (o) { return htx('readwrite', function (s) { return s.put(o); }); },
    del: function (keys) { return htx('readwrite', function (s) { keys.forEach(function (k) { s.delete(k); }); }); },
    clear: function () { return htx('readwrite', function (s) { return s.clear(); }); }
  };
  window.DB = {
    open: open,
    all: function (s) { return tx(s, 'readonly', function (st) { return st.getAll(); }); },
    get: function (s, k) { return tx(s, 'readonly', function (st) { return st.get(k); }); },
    put: function (s, o) { return tx(s, 'readwrite', function (st) { return st.put(o); }); },
    putMany: function (s, arr) { return tx(s, 'readwrite', function (st) { arr.forEach(function (o) { st.put(o); }); }); },
    del: function (s, k) { return tx(s, 'readwrite', function (st) { return st.delete(k); }); },
    delMany: function (s, keys) { return tx(s, 'readwrite', function (st) { keys.forEach(function (k) { st.delete(k); }); }); },
    clear: function (s) { return tx(s, 'readwrite', function (st) { return st.clear(); }); }
  };
})();
