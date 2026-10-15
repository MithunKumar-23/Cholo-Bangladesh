/* সাইটের সব ডেটা: data/ ফোল্ডারের মূল তালিকা + Firestore-এ অ্যাডমিনের পরিবর্তন */
import { B } from './backend.js';
import { SITE } from './config.js';

export const DIVS = [['Dhaka','ঢাকা'],['Chattogram','চট্টগ্রাম'],['Sylhet','সিলেট'],['Khulna','খুলনা'],['Barishal','বরিশাল'],['Rajshahi','রাজশাহী'],['Rangpur','রংপুর'],['Mymensingh','ময়মনসিংহ']];
export const CATS = {hill:'পাহাড়',beach:'সমুদ্রসৈকত',waterfall:'ঝর্ণা',river:'নদী',lake:'লেক ও হাওর',island:'দ্বীপ',nature:'প্রকৃতি ও বন',heritage:'ঐতিহাসিক',religious:'ধর্মীয়',architecture:'স্থাপত্য',museum:'জাদুঘর',park:'পার্ক ও বিনোদন',drive:'দর্শনীয় পথ',border:'সীমান্ত'};
export const MODES = [['bus','বাস'],['train','ট্রেন'],['launch','লঞ্চ'],['air','বিমান'],['local','শেষ ধাপ']];
export const FIELDS = {desc:'বর্ণনা',hours:'খোলার সময়সূচী',fee:'প্রবেশ ফি',best:'যাওয়ার উপযুক্ত সময়','go.bus':'কীভাবে যাবেন: বাস','go.train':'কীভাবে যাবেন: ট্রেন','go.launch':'কীভাবে যাবেন: লঞ্চ','go.air':'কীভাবে যাবেন: বিমান','go.local':'কীভাবে যাবেন: শেষ ধাপ',stay:'কোথায় থাকবেন'};
export const DEFAULT_FEATURED = ['sajek-valley','coxs-bazar-beach','ratargul-swamp-forest','sixty-dome-mosque','nafakhum','sundarbans','tanguar-haor','kuakata'];

export const D = { base: [], geo: null, info: {}, ov: {}, dinfo: {}, cfg: {}, stats: {}, myR: {}, user: null, ver: 0, liveReady: false };
export const DIST = {}; export const FEAT = new Map();

export async function loadStatic() {
  const [s, g, i] = await Promise.all(['data/spots.json', 'data/districts.geojson', 'data/district-info.json'].map(u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); })));
  D.base = s; D.geo = g; D.info = i;
  g.features.forEach(f => { DIST[f.properties.en] = f.properties; FEAT.set(f.properties.en, f); });
}

/* লাইভ ডেটা চালু করা; onChange প্রতিবার কিছু বদলালে ডাকা হয় */
export function startLive(onChange, { ratings = true } = {}) {
  const ch = what => { D.ver++; onChange(what); };
  B.watchCol('spots', rows => { const o = {}; rows.forEach(r => { const { id, ...rest } = r; o[id] = rest; }); D.ov = o; D.liveReady = true; ch('spots'); });
  B.watchCol('districtInfo', rows => { const o = {}; rows.forEach(r => { const { id, ...rest } = r; o[id] = rest; }); D.dinfo = o; ch('dinfo'); });
  B.watchDoc('site/config', d => { D.cfg = d || {}; ch('cfg'); });
  /* সব স্পটের রেটিংয়ের মোট হিসাব একটাই ডকুমেন্টে; রেটিংদাতা যতই হোক, পড়তে হয় ১টা */
  if (ratings) B.watchDoc('ratingStats/all', d => { D.stats = (d && d.s) || {}; ch('ratings'); });
  let unMine = null;
  B.onUser(u => {
    D.user = u; D.userKnown = true;
    if (unMine) { unMine(); unMine = null; } D.myR = {};
    if (u && ratings) unMine = B.watchDoc('ratings/' + u.uid, d => { D.myR = (d && d.r) || {}; ch('ratings'); });
    ch('user');
  });
}

let cache = null;
export function allSpots() {
  if (cache && cache.v === D.ver) return cache;
  const m = new Map(D.base.map(s => [s.id, { ...s, go: { local: s.local || '', ...(s.go || {}) } }]));
  for (const [id, o] of Object.entries(D.ov)) {
    const b = m.get(id) || { id, custom: true, go: {} };
    m.set(id, { ...b, ...o, go: { ...(b.go || {}), ...(o.go || {}) } });
  }
  const every = [...m.values()].filter(s => s.bn && s.d && DIST[s.d] && isFinite(+s.lat) && isFinite(+s.lng)).map(s => ({ ...s, lat: +s.lat, lng: +s.lng }));
  const list = every.filter(s => !s.deleted);
  const byId = new Map(every.map(s => [s.id, s]));
  const byD = new Map(); list.forEach(s => { if (!byD.has(s.d)) byD.set(s.d, []); byD.get(s.d).push(s); });
  cache = { v: D.ver, list, every, byId, byD };
  return cache;
}
export const rating = id => { const a = D.stats[id]; return a && a.n > 0 ? { avg: a.sum / a.n, n: a.n } : { avg: 0, n: 0 }; };
export const myRating = id => (D.user && D.myR[id]) || 0;
export const dinfo = d => ({ ...(D.info[d] || {}), ...(D.dinfo[d] || {}) });
export const cfg = () => ({
  siteName: SITE.name, siteNameEn: SITE.nameEn, logo: '',
  heroTitle: 'পরের ছুটিতে কোথায় যাবেন?',
  heroSub: 'পাহাড়, সমুদ্র, নদী আর হাজার বছরের ইতিহাস। জেলা বেছে নিন, ম্যাপ আপনাকে পথ দেখাবে।',
  notice: '', featured: DEFAULT_FEATURED,
  ...Object.fromEntries(Object.entries(D.cfg).filter(([, v]) => v !== '' && v != null))
});

/* ---------- অ্যাডমিনের লেখার কাজ ---------- */
const EDIT_KEYS = ['bn','en','d','c','lat','lng','t','desc','hours','fee','best','stay','cover','alt','ok','custom','deleted'];
export function editable(s) { const o = {}; for (const k of EDIT_KEYS) if (s[k] !== undefined && s[k] !== '') o[k] = s[k]; o.go = { ...(s.go || {}) }; return o; }
export async function saveSpot(id, data) { await B.set('spots/' + id, { ...data, updatedAt: Date.now(), updatedBy: D.user?.uid || '' }); }
/* কভার ছবি: URL হলে সরাসরি, ছোট করা ছবি (data:) হলে covers সংগ্রহে আলাদা রাখা হয় */
export async function setCover(id, ref) {
  const s = allSpots().byId.get(id); if (!s) throw new Error('স্পট পাওয়া যায়নি');
  if (ref.startsWith('data:')) { await B.set('covers/' + id, { data: ref, at: Date.now() }); await saveSpot(id, { ...editable(s), cover: 'fs:' + Date.now() }); }
  else await saveSpot(id, { ...editable(s), cover: ref });
}
export const slugify = s => String(s).toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ('spot-' + Date.now().toString(36));

/* ---------- ৩. এক্সপোর্ট: Firestore-এর পরিবর্তন মিশিয়ে নতুন JSON ফাইল ---------- */
const SPOT_KEYS = ['id','d','bn','en','c','lat','lng','t','desc','hours','fee','best','stay','cover','alt','ok','addedByName'];
function cleanSpot(s) {
  const o = {};
  for (const k of SPOT_KEYS) { const v = s[k]; if (v === undefined || v === '' || v === false || (Array.isArray(v) && !v.length)) continue; o[k] = v; }
  const go = {}; for (const [k, v] of Object.entries(s.go || {})) if (v) go[k] = v;
  if (Object.keys(go).length) o.go = go;
  return o;
}
/* মুছে ফেলা স্পট বাদ, অ্যাডমিনের সম্পাদনা আর নতুন স্পট মিশিয়ে */
export function buildExport() {
  const spots = allSpots().list.map(cleanSpot).sort((a, b) => a.id.localeCompare(b.id));
  const info = {}; for (const d of new Set([...Object.keys(D.info), ...Object.keys(D.dinfo)])) { const x = {}; for (const [k, v] of Object.entries(dinfo(d))) if (v) x[k] = v; if (Object.keys(x).length) info[d] = x; }
  return { spots, info };
}
/* দুটো ডেটাসেট একই কিনা (ক্রম ও খালি ঘর বাদ দিয়ে) */
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)) ? Object.fromEntries(Object.entries(x).sort()) : x);
export function sameSpots(a, b) {
  const norm = arr => arr.map(s => cleanSpot({ ...s, go: { local: s.local || '', ...(s.go || {}) } })).sort((x, y) => x.id.localeCompare(y.id));
  return canon(norm(a)) === canon(norm(b));
}
export const sameInfo = (a, b) => canon(a) === canon(b);
/* রেটিংয়ের মোট হিসাব নতুন করে গোনা (শুধু অ্যাডমিন; সব ব্যবহারকারীর রেটিং একবার পড়ে) */
export async function recomputeStats() {
  const rows = await B.list('ratings'); const s = {};
  for (const r of rows) for (const [sid, v] of Object.entries(r.r || {})) { const n = +v; if (n >= 1 && n <= 5) { (s[sid] ??= { sum: 0, n: 0 }); s[sid].sum += n; s[sid].n++; } }
  await B.set('ratingStats/all', { s, last: { spot: '', by: D.user.uid, at: Date.now() } });
  return { users: rows.length, spots: Object.keys(s).length };
}
