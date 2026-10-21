// liminal · account, cloud sync and pro. moments are encrypted on this phone (AES-GCM, key from your password via
// PBKDF2, 600k rounds) before they're sent; the server only stores scrambled records it can't read.
export const API = 'https://liminal-sync.sites.tab.bot';
export const SYNAPSE = 'https://odin-cards.sites.tab.bot'; // mints Northpeak All-Access codes (SYN-…) and vouches for them
const te = new TextEncoder(), td = new TextDecoder(), ITER = 600000;
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const b64 = u => { let s = ''; const C = 0x8000; for (let i = 0; i < u.length; i += C) s += String.fromCharCode.apply(null, u.subarray(i, i + C)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export const normUser = u => String(u || '').trim().toLowerCase();
export const validUser = u => /^[a-z0-9][a-z0-9_.-]{2,31}$/.test(u);
/* Northpeak accounts sign in with an email (Oct 21, 2026); the same email + password is the person's Northpeak account in
   Synapse, so one login works in Synapse, Axon and Liminal, and All-Access follows it. Old username accounts still sign in. */
export const normEmail = e => { const s = String(e || '').trim().toLowerCase(); return s.length <= 254 && /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/.test(s) ? s : ''; };

const LS = { get: (k, d) => { try { const v = localStorage.getItem('lim.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set: (k, v) => { try { v == null ? localStorage.removeItem('lim.' + k) : localStorage.setItem('lim.' + k, JSON.stringify(v)); } catch {} } };

/* ---- account state (this phone) ---- */
export const acct = Object.assign({ user: '', kdf: '', token: '', key: '', seq: 0, pro: false, via: null, trialEnd: 0, allAccess: null, request: null, synced: 0, checked: 0 }, LS.get('acct', {}));
const save = () => LS.set('acct', acct);
export const signedIn = () => !!(acct.user && acct.token && acct.key);
export const trialLeft = () => Math.max(0, (acct.trialEnd || 0) - Date.now());
export const isPro = () => signedIn() && (acct.pro || trialLeft() > 0);
export const onTrial = () => signedIn() && !acct.pro && trialLeft() > 0;

async function derive(user, pass){
  const base = await crypto.subtle.importKey('raw', te.encode(String(pass).normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: te.encode('liminal-sync/v1:' + normUser(user)), iterations: ITER }, base, 512));
  return { raw: bits.slice(0, 32), auth: hex(bits.slice(32)) };
}
let keyObj = null;
async function key(){ if (!keyObj && acct.key) keyObj = await crypto.subtle.importKey('raw', unb64(acct.key), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']); return keyObj; }
async function seal(id, text){
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: te.encode(id) }, await key(), te.encode(text)));
  const out = new Uint8Array(13 + ct.length); out[0] = 1; out.set(iv, 1); out.set(ct, 13); return b64(out);
}
async function open(id, data){ const u = unb64(data); if (u[0] !== 1) throw new Error('format'); return td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(1, 13), additionalData: te.encode(id) }, await key(), u.slice(13))); }

export async function api(path, body, opt = {}){
  const h = { 'content-type': 'application/json', ...(opt.hdr || {}) }; if (acct.token && opt.auth !== false) h.authorization = 'Bearer ' + acct.token;
  let r; try { r = await fetch((opt.base || API) + path, { method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', credentials: 'omit' }); }
  catch { const e = new Error('offline'); e.offline = true; throw e; }
  let j = null; try { j = await r.json(); } catch {}
  if (!r.ok || !j || !j.ok) { const e = new Error((j && j.error) || 'http_' + r.status); e.status = r.status; e.body = j; if (r.status === 401 && (opt.base || API) === API) signedOutByServer(); throw e; }
  return j;
}
let onChange = () => {};
export function onAccountChange(fn){ onChange = fn; }
function signedOutByServer(){ if (!acct.token) return; Object.assign(acct, { token: '', key: '' }); keyObj = null; save(); onChange('signed_out'); }
function take(j){ if ('pro' in j) acct.pro = !!j.pro; if ('trial_end' in j) acct.trialEnd = +j.trial_end || 0; if (j.now) acct.skew = Date.now() - j.now; if ('via' in j) acct.via = j.via; if ('allAccess' in j) acct.allAccess = j.allAccess; if ('owner' in j) acct.owner = !!j.owner; if ('request' in j) acct.request = j.request; }

/* the Northpeak (Synapse) side of an email + password: log in, or (kind 'signup') create it.
   -> { ok, user, token } | { exists: true } (that email has one with another password) | { bad: true } | { skip: why } */
export async function northpeak(kind, email, pass){
  const call = p => api(p, { email, password: String(pass) }, { base: SYNAPSE, auth: false, hdr: { 'x-syn-bearer': '1' } });
  let j;
  try { j = await call('/api/auth/login'); }
  catch (e) {
    if (e.message !== 'bad_login') return { skip: e.message };
    if (kind !== 'signup') return { bad: true };
    try { j = await call('/api/auth/signup'); j.created = true; } catch (e2) { return e2.message === 'exists' ? { exists: true } : { skip: e2.message }; }
  }
  return { ok: true, user: j.user || null, token: j.token || null, created: !!j.created };
}
/* which name this account's key was made with: the email, or the old username for an account that added its email later */
async function kdfFor(email){ try { const j = await api('/api/kdf', { email }, { auth: false }); return j.kdf || email; } catch (e) { if (e.status === 404) return email; throw e; } }
/* All-Access on the Northpeak account turns pro on here (the same signed check as typing the code) */
export async function linkNorthpeak(email, pass, n){
  try { if (!n) n = await northpeak('login', email, pass); if (n && n.ok && n.user && n.user.aaCode && !acct.pro) { await redeem(n.user.aaCode); return 'all_access'; } } catch {}
  return null;
}

/* sign up / log in: the password never leaves the phone; only a verifier derived from it does.
   id is an email, or an old username when opt.legacy */
export async function auth(kind, id, pass, opt = {}){
  const label = navigator.platform || 'phone';
  let j, d, n = null, kdf;
  if (opt.legacy) {
    const user = normUser(id); kdf = user; d = await derive(user, pass);
    j = await api(kind === 'signup' ? '/api/signup' : '/api/login', { u: user, auth: d.auth, label }, { auth: false });
  } else {
    const email = normEmail(id); if (!email) throw new Error('bad_email');
    if (kind === 'signup') {
      n = await northpeak('signup', email, pass);
      if (n.exists) throw new Error('np_exists');
      kdf = email; d = await derive(email, pass);
      j = await api('/api/signup', { email, auth: d.auth, label }, { auth: false });
    } else {
      kdf = await kdfFor(email); d = await derive(kdf, pass);
      try { j = await api('/api/login', { email, auth: d.auth, label }, { auth: false }); }
      catch (e) { // no Liminal account for this email yet, but it may be a Northpeak account from Synapse or Axon: then make it here now
        if (e.message !== 'wrong' || kdf !== email) throw e;
        n = await northpeak('login', email, pass); if (!n.ok) throw e;
        try { j = await api('/api/signup', { email, auth: d.auth, label }, { auth: false }); j.created = true; } catch (e2) { throw e2.message === 'taken' ? e : e2; }
      }
    }
  }
  const prev = acct.user, prevKey = acct.key, user = j.user || id;
  Object.assign(acct, { user, kdf: j.kdf || kdf, token: j.token, key: b64(d.raw), seq: 0, synced: 0 }); keyObj = null; take(j); save();
  /* a new password means a new key (e.g. reset on the admin page, which clears the cloud copy it can't read): send every moment again */
  if ((prev !== user && !(j.name && prev === j.name)) || (prevKey && prevKey !== acct.key)) { LS.set('sync', { base: {}, dirty: [], gone: [] }); }
  onChange(kind); j.northpeak = n; return j;
}
/* an old username account adds its email once; from then on it signs in with the email (its key stays the same) */
export async function addEmail(email, pass){
  email = normEmail(email); if (!email) throw new Error('bad_email');
  const kdf = acct.kdf || acct.user, d = await derive(kdf, pass);
  const n = await northpeak('signup', email, pass);
  const j = await api('/api/email', { email, auth: d.auth });
  Object.assign(acct, { user: j.email || email, kdf: j.kdf || kdf }); save(); onChange('email');
  return { ...j, northpeak: n };
}
export async function logout(){ try { await api('/api/logout', {}); } catch {} Object.assign(acct, { user: '', kdf: '', token: '', key: '', seq: 0, pro: false, via: null, trialEnd: 0, allAccess: null, owner: false, request: null, synced: 0 }); keyObj = null; save(); LS.set('sync', null); onChange('logout'); }
export async function deleteAccount(pass){ const d = await derive(acct.kdf || acct.user, pass); await api('/api/delete-account', { auth: d.auth }); await logout(); }
export async function refresh(force){
  if (!signedIn()) return null; if (!force && Date.now() - acct.checked < 30000) return null;
  acct.checked = Date.now();
  try { const was = isPro(), j = await api('/api/me'); take(j); save(); if (was !== isPro()) onChange('pro'); return j; } catch { return null; }
}

/* ---- sync: each moment is one encrypted record; only additions and deletes travel ---- */
const st = () => Object.assign({ base: {}, dirty: [], gone: [] }, LS.get('sync', {}) || {});
export function markDirty(id){ const s = st(); if (!s.dirty.includes(id)) s.dirty.push(id); s.gone = s.gone.filter(x => x !== id); LS.set('sync', s); }
export function markGone(ids){ const s = st(); for (const id of [].concat(ids)) { s.dirty = s.dirty.filter(x => x !== id); if (s.base[id] && !s.gone.includes(id)) s.gone.push(id); } LS.set('sync', s); }
let syncing = null;
export function sync(db){ if (!signedIn()) return Promise.resolve(null); if (!syncing) syncing = run(db).finally(() => { syncing = null; }); return syncing; }
async function run(db){
  let s = st(), changed = 0;
  /* pull everything new since the last pull */
  for (let guard = 0; guard < 40; guard++) {
    const j = await api('/api/pull?since=' + (acct.seq || 0));
    for (const r of j.recs) {
      s.base[r.i] = r.s;
      if (r.x) { if (!s.dirty.includes(r.i)) { await db.remove(r.i).catch(() => {}); changed++; } delete s.base[r.i]; continue; }
      try { const m = JSON.parse(await open(r.i, r.d)); if (m && m.id === r.i) { await db.put(m); changed++; } } catch {}
    }
    acct.seq = j.last; LS.set('sync', s); save();
    if (!j.more) break;
  }
  /* push this phone's new moments and deletes */
  const all = await db.all(), have = new Set(all.map(m => m.id));
  for (const m of all) if (!(m.id in s.base) && !s.dirty.includes(m.id)) s.dirty.push(m.id);
  const out = [];
  for (const id of s.dirty) { const m = all.find(x => x.id === id); if (m) out.push({ i: id, b: s.base[id] || 0, d: await seal(id, JSON.stringify(m)) }); }
  for (const id of s.gone) if (!have.has(id)) out.push({ i: id, b: s.base[id] || 0, x: 1, d: '' });
  for (let i = 0; i < out.length; i += 60) {
    const chunk = out.slice(i, i + 60);
    let j; for (let t = 0; t < 4; t++) { try { j = await api('/api/push', { recs: chunk }); break; } catch (e) { if (e.message !== 'busy') throw e; await new Promise(r => setTimeout(r, 400 * (t + 1))); } }
    if (!j) throw new Error('busy');
    for (const r of j.res) { if (r.conflict) { s.base[r.i] = r.s; continue; } const x = chunk.find(c => c.i === r.i); if (x && x.x) delete s.base[r.i]; else s.base[r.i] = r.s; s.dirty = s.dirty.filter(d => d !== r.i); s.gone = s.gone.filter(d => d !== r.i); }
    acct.seq = Math.max(acct.seq, j.seq || 0);
  }
  s.dirty = s.dirty.filter(id => !(id in s.base)); s.gone = s.gone.filter(id => id in s.base);
  acct.synced = Date.now(); LS.set('sync', s); save();
  return { changed, pushed: out.length };
}

/* ---- pro: request (Apple Cash), unlock codes, All-Access ---- */
export async function requestPro(plan, name, phone){ const j = await api('/api/pro/request', { plan, name, phone }); acct.request = { id: j.id, status: 'new', plan: j.plan, price: j.price, name, phone }; save(); if (j.relay) hop(j.relay); return j; }
export async function redeem(code){
  const c = String(code || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  let body = { code };
  if (!c.startsWith('LIM')) { // an All-Access code: Synapse vouches for it with a signed note this backend can check
    try { const a = await api('/api/pro/link/attest', { code, app: 'liminal' }, { base: SYNAPSE, auth: false }); if (!a.valid) { const e = new Error('bad_code'); throw e; } body = { code: a.code, m: a.m, sig: a.sig }; }
    catch (e) { if (e.message === 'bad_code' || e.message === 'slow_down' || e.offline) throw e; }
  }
  const j = await api('/api/pro/redeem', body); acct.pro = !!j.pro; if (j.owner) acct.owner = true; if (j.product === 'all_access') acct.allAccess = j.code; save(); onChange('pro'); return j;
}
/* a signed note for Synapse (an All-Access request shows on both admin lists) — carried by this page, best effort */
async function hop(rl, n = 0){ if (!rl || n > 3) return; const base = rl.to === 'synapse' ? SYNAPSE : rl.to === 'liminal' ? API : null; if (!base) return;
  try { const r = await fetch(base + rl.path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ m: rl.m, sig: rl.sig }) }); const j = await r.json(); if (j && j.relay) await hop(j.relay, n + 1); } catch {} }
