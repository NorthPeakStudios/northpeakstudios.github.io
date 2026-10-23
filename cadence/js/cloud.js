// cadence · account, cloud sync and pro. progress is encrypted on this phone (AES-GCM, key from your password via
// PBKDF2, 600k rounds) before they're sent; the server only stores scrambled records it can't read.
export const API = 'https://cadence-sync.sites.tab.bot';
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

const LS = { get: (k, d) => { try { const v = localStorage.getItem('cad.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set: (k, v) => { try { v == null ? localStorage.removeItem('cad.' + k) : localStorage.setItem('cad.' + k, JSON.stringify(v)); } catch {} } };

/* ---- account state (this phone) ---- */
export const acct = Object.assign({ user: '', kdf: '', token: '', key: '', seq: 0, pro: false, via: null, trialEnd: 0, allAccess: null, request: null, synced: 0, checked: 0 }, LS.get('acct', {}));
const save = () => LS.set('acct', acct);
export const signedIn = () => !!(acct.user && acct.token && acct.key);
export const trialLeft = () => Math.max(0, (acct.trialEnd || 0) - Date.now());
export const isPro = () => signedIn() && (acct.pro || trialLeft() > 0);
export const onTrial = () => signedIn() && !acct.pro && trialLeft() > 0;

async function derive(user, pass){
  const base = await crypto.subtle.importKey('raw', te.encode(String(pass).normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: te.encode('cadence-sync/v1:' + normUser(user)), iterations: ITER }, base, 512));
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
  if (j.token) LS.set('np', { tok: j.token, email: (j.user && j.user.email) || email, at: Date.now() }); // np-email-change v1: lets this phone follow an email change made elsewhere
  return { ok: true, user: j.user || null, token: j.token || null, created: !!j.created, moves: j.moves || null };
}
/* which name this account's key was made with: the email, or the old username for an account that added its email later */
async function kdfFor(email){ try { const j = await api('/api/kdf', { email }, { auth: false }); return j.kdf || email; } catch (e) { if (e.status === 404) return email; throw e; } }
/* All-Access on the Northpeak account turns pro on here (the same signed check as typing the code) */
export async function linkNorthpeak(email, pass, n){
  try { if (!n) n = await northpeak('login', email, pass); } catch {}
  try { if (n && n.ok && n.moves && window.NPEmail) await window.NPEmail.apply(n.moves, pass, { skip: 'cadence' }); } catch {} // np-email-change v1: Axon follows too
  try { if (n && n.ok && n.user && n.user.aaCode && !acct.pro) { await redeem(n.user.aaCode); return 'all_access'; } } catch {}
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
        /* np-email-change v1: the email may have changed in Synapse or Axon; then the Liminal account on the old email moves to it */
        let mvd = {}; if (n.moves && window.NPEmail) { try { mvd = await window.NPEmail.apply(n.moves, pass, { only: 'cadence' }); } catch {} }
        if (mvd.cadence) { kdf = await kdfFor(email); d = await derive(kdf, pass); j = await api('/api/login', { email, auth: d.auth, label }, { auth: false }); }
        else { try { j = await api('/api/signup', { email, auth: d.auth, label }, { auth: false }); j.created = true; } catch (e2) { throw e2.message === 'taken' ? e : e2; } }
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
/* np-email-change v1 (Oct 21, 2026): change this account's email. Liminal moves first (password checked there), then the
   Northpeak account in Synapse, then Axon's account through Synapse's signed note. If the new email is already someone else's
   Northpeak account, Liminal is put back. -> { email, also: 'synapse+axon' | 'synapse' | 'np_other_pw' | 'synapse_failed:…' | '' } */
export async function changeEmail(email, pass){
  email = normEmail(email); if (!email) throw new Error('bad_email');
  const old = acct.user, kdf = acct.kdf || acct.user;
  if (email === old) throw new Error('same');
  let d = await derive(kdf, pass);
  const j = await api('/api/email', { email, auth: d.auth });
  const np = LS.get('np', null); let sc = { skip: 'none' };
  if (window.NPEmail) { try { sc = await window.NPEmail.changeSynapse(old, email, pass, np && np.email === old ? np.tok : null); } catch { sc = { error: 'offline' }; } }
  if (sc.error === 'exists') { try { d = await derive(kdf, pass); await api('/api/email', { email: old, auth: d.auth }); } catch {} throw new Error('np_taken'); }
  Object.assign(acct, { user: j.email || email, kdf: j.kdf || kdf }); save();
  let also = '';
  if (sc.ok) { LS.set('np', { tok: sc.token, email: acct.user, at: Date.now() }); let mv = {}; try { mv = await window.NPEmail.apply(sc.moves, pass, { skip: 'cadence' }); } catch {} also = mv.axon ? 'synapse+axon' : 'synapse'; }
  else if (sc.skip === 'bad_login') { const n = await northpeak('signup', acct.user, pass).catch(() => null); if (n && n.exists) also = 'np_other_pw'; }
  else if (sc.error && sc.error !== 'none') also = 'synapse_failed:' + sc.error;
  onChange('email'); return { email: acct.user, also };
}
/* signed in on an email that changed in Synapse or Axon: this account follows it (its own session is the proof) */
let followLast = 0;
async function followEmail(){
  if (!window.NPEmail || !/@/.test(acct.user || '') || Date.now() - followLast < 10 * 60e3) return;
  followLast = Date.now();
  const np = LS.get('np', null); if (!np || !np.tok) return;
  try {
    const me = await window.NPEmail.synMe(np.tok);
    if (!me || !me.user || me.user.email === acct.user || !(me.moves || []).some(m => m.old === acct.user)) return;
    const r = await window.NPEmail.apply(me.moves, null, { only: 'cadence', tokens: { cadence: acct.token } });
    if (r.cadence) { acct.user = me.user.email; save(); LS.set('np', { tok: np.tok, email: acct.user, at: Date.now() }); onChange('email'); }
  } catch {}
}
export async function logout(){ try { await api('/api/logout', {}); } catch {} Object.assign(acct, { user: '', kdf: '', token: '', key: '', seq: 0, pro: false, via: null, trialEnd: 0, allAccess: null, owner: false, request: null, synced: 0 }); keyObj = null; save(); LS.set('sync', null); LS.set('np', null); onChange('logout'); }
export async function deleteAccount(pass){ const d = await derive(acct.kdf || acct.user, pass); await api('/api/delete-account', { auth: d.auth }); await logout(); }
export async function refresh(force){
  if (!signedIn()) return null; if (!force && Date.now() - acct.checked < 30000) return null;
  acct.checked = Date.now();
  try {
    const was = isPro(), j = await api('/api/me'); take(j);
    if (j.email && j.email !== acct.user) { acct.user = j.email; save(); onChange('email'); } else { save(); followEmail(); } // np-email-change v1
    if (was !== isPro()) onChange('pro'); return j;
  } catch { return null; }
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
  if (!c.startsWith('CAD')) { // an All-Access code: Synapse vouches for it with a signed note this backend can check
    try { const a = await api('/api/pro/link/attest', { code, app: 'cadence' }, { base: SYNAPSE, auth: false }); if (!a.valid) { const e = new Error('bad_code'); throw e; } body = { code: a.code, m: a.m, sig: a.sig }; }
    catch (e) { if (e.message === 'bad_code' || e.message === 'slow_down' || e.offline) throw e; }
  }
  const j = await api('/api/pro/redeem', body); acct.pro = !!j.pro; if (j.owner) acct.owner = true; if (j.product === 'all_access') acct.allAccess = j.code; save(); onChange('pro'); return j;
}
/* a signed note for Synapse (an All-Access request shows on both admin lists) — carried by this page, best effort */
async function hop(rl, n = 0){ if (!rl || n > 3) return; const base = rl.to === 'synapse' ? SYNAPSE : rl.to === 'cadence' ? API : null; if (!base) return;
  try { const r = await fetch(base + rl.path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ m: rl.m, sig: rl.sig }) }); const j = await r.json(); if (j && j.relay) await hop(j.relay, n + 1); } catch {} }

/* Cadence: progress is one encrypted record ('progress'). Each sync pulls it from the start (it's tiny), merges, then pushes,
   so two devices never overwrite each other. */
export function resetSeq(){ acct.seq = 0; save(); }
