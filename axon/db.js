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
      r.onsuccess = function () { db = r.result; res(db); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function tx(store, mode, fn) {
    return new Promise(function (res, rej) {
      var t = db.transaction(store, mode), s = t.objectStore(store), out;
      var r = fn(s);
      if (r && 'onsuccess' in r) r.onsuccess = function () { out = r.result; };
      t.oncomplete = function () { res(out); };
      t.onerror = t.onabort = function () { rej(t.error); };
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
    return mopen().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction('images', mode), s = t.objectStore('images'), out, r = fn(s);
        if (r && 'onsuccess' in r) r.onsuccess = function () { out = r.result; };
        t.oncomplete = function () { res(out); };
        t.onerror = t.onabort = function () { rej(t.error); };
      });
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
    return ropen().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(store, mode), s = t.objectStore(store), out, r = fn(s);
        if (r && 'onsuccess' in r) r.onsuccess = function () { out = r.result; };
        t.oncomplete = function () { res(out); };
        t.onerror = t.onabort = function () { rej(t.error); };
      });
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
    return dopen().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(store, mode), s = t.objectStore(store), out, r = fn(s);
        if (r && 'onsuccess' in r) r.onsuccess = function () { out = r.result; };
        t.oncomplete = function () { res(out); };
        t.onerror = t.onabort = function () { rej(t.error); };
      });
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
