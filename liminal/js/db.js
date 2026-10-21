// on-device storage only (IndexedDB). nothing ever leaves the phone.
const DB = 'liminal', STORE = 'moments';
let dbp;
function open(){
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { const s = r.result.createObjectStore(STORE, { keyPath: 'id' }); s.createIndex('t', 't'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function tx(mode, fn){
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), s = t.objectStore(STORE); let out;
    Promise.resolve(fn(s)).then(v => out = v);
    t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  });
}
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
export const all = () => tx('readonly', s => req(s.getAll())).then(a => a.sort((x, y) => y.t - x.t));
export const put = m => tx('readwrite', s => req(s.put(m)));
export const putMany = ms => tx('readwrite', s => { ms.forEach(m => s.put(m)); });
export const remove = id => tx('readwrite', s => req(s.delete(id)));
export const clear = () => tx('readwrite', s => req(s.clear()));
