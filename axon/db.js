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
