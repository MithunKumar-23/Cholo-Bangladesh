/* সব পেজে ব্যবহৃত UI: হেডার, ফুটার, কার্ড, সার্চ, মোডাল, পোস্টার-আর্ট */
import { D, DIST, CATS, allSpots, rating, cfg } from './data.js';
import { SITE, DEMO } from './config.js';
import { B } from './backend.js';

export const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const toBn = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
export const fmt1 = n => toBn((Math.round(n * 10) / 10).toFixed(1));
export const qs = k => new URLSearchParams(location.search).get(k) || '';
export const norm = s => String(s || '').toLowerCase().replace(/[\s'’.\-,&()]/g, '');
export const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '#';
export const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
export const spotUrl = id => 'spot.html?id=' + encodeURIComponent(id);
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const I = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>',
  arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="11" opacity=".2"/><path d="M10 8l6 4-6 4z"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  bus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18v3M16 18v3"/></svg>',
  train: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="14" rx="4"/><path d="M5 11h14M8 21l2-4M16 21l-2-4"/></svg>',
  launch: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 16l2 4h14l2-4zM6 16V9h12v7M12 9V4"/></svg>',
  air: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 13l9-2 5-7h2l-2 7 5 1v2l-5 1 2 7h-2l-5-7-9-2z"/></svg>',
  local: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/></svg>'
};
export function stars(v) { let s = ''; for (let i = 1; i <= 5; i++) s += `<span style="color:${v >= i - .25 ? 'var(--mustard)' : 'var(--line)'}">${I.star}</span>`; return `<span class="stars">${s}</span>`; }

/* ---------- পোস্টার-আর্ট: ছবি না থাকলে ধরন অনুযায়ী আঁকা ছবি ---------- */
function hash(s) { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619); return h >>> 0; }
function rng(seed) { let a = seed; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function smooth(pts, h) { let d = `M0 ${h}L${pts[0][0]} ${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; d += `Q${x0} ${y0} ${(x0 + x1) / 2} ${(y0 + y1) / 2}`; } const l = pts[pts.length - 1]; return d + `L${l[0]} ${l[1]}L400 ${h}Z`; }
function ridge(r, base, amp, n) { const pts = []; for (let i = 0; i <= n; i++) pts.push([i * 400 / n, base - amp * (.25 + r() * .75)]); return smooth(pts, 300); }
let artN = 0;
export function art(s) {
  const r = rng(hash(s.id || s.en || 'x')), c = s.c, id = 'a' + (++artN);
  const nm = ((s.en || '') + ' ' + (s.bn || '')).toLowerCase();
  const sky = (a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="300" fill="url(#${id})"/>`;
  const sun = (col, y, rad) => `<circle cx="${60 + r() * 280}" cy="${y}" r="${rad}" fill="${col}"/>`;
  const birds = () => { let g = ''; const n = 2 + Math.floor(r() * 3), bx = 80 + r() * 220, by = 40 + r() * 40; for (let i = 0; i < n; i++) { const x = bx + i * 16 + r() * 8, y = by + r() * 14; g += `<path d="M${x} ${y}q4-4 8 0q4-4 8 0" fill="none" stroke="#24342C" stroke-width="1.6" opacity=".55"/>`; } return g; };
  const cloud = (x, y, k = 1) => `<g fill="#fff" opacity=".85"><ellipse cx="${x}" cy="${y}" rx="${34 * k}" ry="${11 * k}"/><ellipse cx="${x + 14 * k}" cy="${y - 8 * k}" rx="${20 * k}" ry="${12 * k}"/></g>`;
  const palm = (x, y, k = 1, col = '#1D4B33') => `<g stroke="${col}" fill="${col}"><path d="M${x} ${y}q${4 * k} ${-30 * k} ${-2 * k} ${-60 * k}" fill="none" stroke-width="${4 * k}"/><path d="M${x - 2 * k} ${y - 60 * k}q-${22 * k} -${6 * k} -${34 * k} ${10 * k}q${18 * k} -${16 * k} ${34 * k} -${10 * k}zM${x - 2 * k} ${y - 60 * k}q${22 * k} -${10 * k} ${36 * k} ${6 * k}q-${16 * k} -${18 * k} -${36 * k} -${6 * k}zM${x - 2 * k} ${y - 60 * k}q-${4 * k} -${20 * k} ${12 * k} -${28 * k}q-${8 * k} ${12 * k} -${12 * k} ${28 * k}z" stroke-width="1"/></g>`;
  const tree = (x, y, k, col) => `<path d="M${x} ${y - 46 * k}l${14 * k} ${30 * k}h${-6 * k}l${10 * k} ${16 * k}h${-36 * k}l${10 * k} ${-16 * k}h${-6 * k}z" fill="${col}"/>`;
  const boat = (x, y, k = 1, col = '#14232B') => `<g fill="${col}"><path d="M${x - 40 * k} ${y}q${40 * k} ${14 * k} ${80 * k} 0l${-8 * k} ${8 * k}h${-64 * k}z"/><path d="M${x - 14 * k} ${y - 2 * k}q${14 * k} ${-16 * k} ${28 * k} 0z"/><path d="M${x + 4 * k} ${y - 2 * k}V${y - 50 * k}" stroke="${col}" stroke-width="${2 * k}"/><path d="M${x + 6 * k} ${y - 48 * k}q${26 * k} ${18 * k} ${4 * k} ${40 * k}z" opacity=".85"/></g>`;
  let g = '';
  if (c === 'hill' || c === 'drive' || c === 'border') {
    g += sky('#FFC98A', '#FDEFD8') + sun('#FFF6DE', 90 + r() * 40, 26 + r() * 10) + cloud(90 + r() * 80, 70 + r() * 20, .9) + cloud(260 + r() * 80, 50 + r() * 30, .7);
    g += `<path d="${ridge(r, 175, 70, 6)}" fill="#A9CBB8"/><path d="${ridge(r, 205, 60, 7)}" fill="#6EA587"/><path d="${ridge(r, 240, 50, 8)}" fill="#34704F"/>`;
    if (c === 'hill') { g += `<path d="${ridge(r, 275, 30, 9)}" fill="#163E2C"/>` + birds(); }
    else {
      g += `<path d="M0 300V262Q200 238 400 258V300Z" fill="#1B4A33"/><path d="M150 300Q190 270 228 252L238 252Q212 272 250 300Z" fill="#3A3F44"/><path d="M196 300Q210 276 232 254" stroke="#F6E7B0" stroke-width="2" stroke-dasharray="8 7" fill="none"/>`;
      if (c === 'border') { for (let i = 0; i < 9; i++) { const x = 20 + i * 42; g += `<path d="M${x} 300V${266 - i % 2 * 2}" stroke="#2A2F2C" stroke-width="3"/>`; } g += `<path d="M0 274H400M0 286H400" stroke="#2A2F2C" stroke-width="1.5"/>`; }
    }
  } else if (c === 'beach' || c === 'island') {
    g += sky('#8ED3EA', '#E8F7FB') + sun('#FFD56A', 70 + r() * 30, 24 + r() * 8) + cloud(80 + r() * 240, 60 + r() * 25, .8);
    g += `<rect y="168" width="400" height="132" fill="#2A8CB5"/><rect y="168" width="400" height="10" fill="#5DB2D3" opacity=".7"/>`;
    for (let i = 0; i < 7; i++) { const y = 186 + i * 12, x = r() * 300; g += `<path d="M${x} ${y}q15-5 30 0t30 0" stroke="#fff" stroke-width="2" fill="none" opacity="${.5 - i * .04}"/>`; }
    if (c === 'island') { const ix = 110 + r() * 180; g += `<ellipse cx="${ix}" cy="196" rx="110" ry="18" fill="#EBCB8F"/><ellipse cx="${ix}" cy="190" rx="78" ry="12" fill="#5E9C6B"/>` + palm(ix - 30, 192, .85) + palm(ix + 20, 190, 1) + palm(ix + 50, 194, .7); g += boat(60 + r() * 40, 240, .6, '#13303D'); }
    else { g += `<path d="M0 300V252Q140 232 260 246T400 238V300Z" fill="#EDCF95"/><path d="M0 252Q140 232 260 246T400 238" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/>` + palm(30 + r() * 40, 290, 1.2) + palm(340 + r() * 40, 288, 1.05); }
  } else if (c === 'waterfall') {
    g += sky('#BFE3CF', '#F0F8F2') + cloud(80 + r() * 80, 50, .8) + `<path d="${ridge(r, 150, 50, 5)}" fill="#8DBBA3"/>`;
    const cx = 170 + r() * 60;
    g += `<path d="M0 300V110Q60 90 ${cx - 30} 96V300Z" fill="#3E7A62"/><path d="M400 300V100Q330 84 ${cx + 30} 92V300Z" fill="#2F654F"/><path d="M${cx - 30} 96Q${cx} 88 ${cx + 30} 92V250H${cx - 30}Z" fill="#E7F7FB"/>`;
    for (let i = 0; i < 6; i++) { const x = cx - 26 + i * 10; g += `<path d="M${x} 98V${240 - r() * 30}" stroke="#BDE3EE" stroke-width="3" opacity=".9"/>`; }
    g += `<ellipse cx="${cx}" cy="262" rx="140" ry="26" fill="#4FA3C4"/><ellipse cx="${cx}" cy="252" rx="70" ry="10" fill="#fff" opacity=".7"/><path d="M0 300V270Q60 256 120 272T240 278T400 262V300Z" fill="#173B2F"/>`;
  } else if (c === 'river' || c === 'lake') {
    const sunset = c === 'river';
    g += sky(sunset ? '#F5A266' : '#A9D6F5', sunset ? '#FCE3C2' : '#EAF6FC');
    const sx = 80 + r() * 240; g += `<circle cx="${sx}" cy="${sunset ? 150 : 70}" r="${sunset ? 36 : 24}" fill="${sunset ? '#FFE3A0' : '#FFF3C8'}"/>`;
    g += `<path d="${ridge(r, 170, 26, 10)}" fill="${sunset ? '#3D5F4A' : '#78AE8E'}"/><rect y="168" width="400" height="132" fill="${sunset ? '#3A7AA0' : '#4C9AC2'}"/>`;
    if (sunset) for (let i = 0; i < 6; i++) g += `<rect x="${sx - 30 + r() * 20}" y="${178 + i * 12}" width="${50 - i * 6}" height="3" rx="1.5" fill="#FFD88A" opacity=".7"/>`;
    for (let i = 0; i < 6; i++) { const x = r() * 340, y = 196 + i * 16; g += `<path d="M${x} ${y}h${30 + r() * 30}" stroke="#fff" stroke-width="1.5" opacity=".35"/>`; }
    if (sunset) g += boat(110 + r() * 180, 232, 1.15);
    else for (let i = 0; i < 5; i++) { const x = 40 + r() * 320, y = 230 + r() * 50; g += `<ellipse cx="${x}" cy="${y}" rx="18" ry="5" fill="#2E7D4F"/><path d="M${x - 3} ${y - 2}l3-10 3 10z" fill="#EF8FB0"/>`; }
    g += `<path d="M0 300V280Q80 270 160 284T400 276V300Z" fill="${sunset ? '#1D3A2C' : '#2F6B4E'}"/>`;
  } else if (c === 'nature' || c === 'park') {
    const tea = /tea|চা/.test(nm);
    g += sky('#CFE8C8', '#F2F9EE') + sun('#FFF2C4', 70 + r() * 30, 22) + cloud(100 + r() * 200, 55, .8) + `<path d="${ridge(r, 175, 40, 6)}" fill="#8CBE95"/>`;
    if (tea) { for (let i = 0; i < 7; i++) { const y = 196 + i * 16; g += `<path d="M-10 ${y + 12}Q200 ${y - 14 + i * 2} 410 ${y + 8}" stroke="${i % 2 ? '#2F7A48' : '#3E8F57'}" stroke-width="13" fill="none" stroke-linecap="round"/>`; } g += tree(330, 240, 1.1, '#1E4D33'); }
    else {
      g += `<path d="M0 300V210Q200 196 400 214V300Z" fill="#5E9E6C"/>`; const cols = ['#1E5135', '#2B6B45', '#174029'];
      for (let i = 0; i < 16; i++) { const x = r() * 420 - 10, k = .7 + r() * .9; g += tree(x, 226 + k * 30, k, cols[i % 3]); }
      if (c === 'park') { const fx = 270 + r() * 60; g += `<g stroke="#D7263D" stroke-width="2.5" fill="none"><circle cx="${fx}" cy="170" r="44"/><path d="M${fx} 126V214M${fx - 44} 170H${fx + 44}M${fx - 31} 139L${fx + 31} 201M${fx + 31} 139L${fx - 31} 201M${fx - 20} 250L${fx} 170L${fx + 20} 250"/></g>`; }
    }
    g += `<path d="M0 300V276Q100 266 200 280T400 272V300Z" fill="#14351F"/>`;
  } else {
    const modern = c === 'architecture' && !/bridge|tower|সেতু/.test(nm);
    g += modern ? sky('#9CC7DE', '#EAF3F8') : sky('#F4B66A', '#FCE6C6');
    g += sun(modern ? '#FFFBEA' : '#FFF1D2', 80 + r() * 30, 30);
    const col = modern ? '#5E5A55' : '#7A2E22', col2 = modern ? '#76716A' : '#94402F';
    g += `<path d="M0 300V236H400V300Z" fill="${modern ? '#567A63' : '#5B2A1E'}"/>`;
    const isMosque = /mosque|masjid|মসজিদ|shrine|মাজার|dargah/.test(nm), isTemple = /temple|mandir|মন্দির|vihara|বিহার|church|গির্জা|চার্চ|jadi|জাদী/.test(nm);
    if (/bridge|সেতু/.test(nm)) { g += `<rect y="196" width="400" height="104" fill="#3F86A8"/><path d="M0 170H400V182H0Z" fill="#454B50"/>`; for (let i = 0; i < 6; i++) { const x = 20 + i * 72; g += `<path d="M${x} 182V300M${x + 60} 182V300" stroke="#454B50" stroke-width="7"/><path d="M${x} 182Q${x + 30} 140 ${x + 60} 182" stroke="#2F3438" stroke-width="5" fill="none"/>`; } }
    else if (/tower|টাওয়ার|lighthouse|বাতিঘর/.test(nm)) { g += `<path d="M190 236L198 80H222L230 236Z" fill="${col}"/><rect x="194" y="64" width="32" height="18" fill="#F2B233"/><path d="M200 64L210 48L220 64Z" fill="${col}"/>`; }
    else if (isMosque) {
      g += `<rect x="110" y="170" width="180" height="70" fill="${col}"/><path d="M140 172Q200 82 260 172Z" fill="${col2}"/><path d="M200 112V96" stroke="${col}" stroke-width="4"/>`;
      for (const x of [100, 300]) g += `<rect x="${x - 7}" y="120" width="14" height="120" fill="${col}"/><path d="M${x - 10} 122Q${x} 96 ${x + 10} 122Z" fill="${col2}"/>`;
      for (let i = 0; i < 3; i++) { const x = 150 + i * 40; g += `<path d="M${x} 240V206Q${x + 10} 192 ${x + 20} 206V240Z" fill="#2B120D" opacity=".6"/>`; }
    } else if (isTemple) {
      g += `<path d="M150 240V180H250V240Z" fill="${col}"/><path d="M162 182Q200 40 238 182Z" fill="${col2}"/><path d="M200 70V54" stroke="${col}" stroke-width="3"/>`;
      for (const x of [120, 280]) g += `<path d="M${x - 22} 240V200H${x + 22}V240Z" fill="${col}"/><path d="M${x - 18} 202Q${x} 140 ${x + 18} 202Z" fill="${col2}"/>`;
      g += `<path d="M190 240V214Q200 202 210 214V240Z" fill="#2B120D" opacity=".6"/>`;
    } else if (c === 'museum') { g += `<path d="M100 150L200 110L300 150Z" fill="${col2}"/><rect x="100" y="150" width="200" height="10" fill="${col}"/>`; for (let i = 0; i < 6; i++) g += `<rect x="${112 + i * 34}" y="162" width="12" height="68" fill="${col}"/>`; g += `<rect x="96" y="230" width="208" height="10" fill="${col}"/>`; }
    else if (modern) { g += `<path d="M70 236V140H330V236Z" fill="${col}"/><path d="M120 236V110H280V236Z" fill="${col2}"/><circle cx="200" cy="168" r="26" fill="#E9F2F6"/><path d="M146 236V196L174 168V236ZM254 236V196L226 168V236Z" fill="#E9F2F6" opacity=".9"/><rect x="90" y="160" width="16" height="50" fill="#E9F2F6" opacity=".85"/><rect x="294" y="160" width="16" height="50" fill="#E9F2F6" opacity=".85"/><rect y="250" width="400" height="50" fill="#5F9DBB" opacity=".9"/>`; }
    else {
      g += `<rect x="60" y="160" width="280" height="80" fill="${col}"/>`; for (let i = 0; i < 14; i++) g += `<rect x="${60 + i * 20}" y="150" width="12" height="12" fill="${col}"/>`;
      for (let i = 0; i < 5; i++) { const x = 88 + i * 50; g += `<path d="M${x} 240V200Q${x + 14} 180 ${x + 28} 200V240Z" fill="#2B120D" opacity=".55"/>`; }
      for (const x of [60, 340]) g += `<rect x="${x - 18}" y="128" width="36" height="112" fill="${col2}"/><path d="M${x - 22} 130Q${x} 100 ${x + 22} 130Z" fill="${col}"/>`;
    }
    g += birds();
  }
  return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${g}</svg>`;
}

/* ---------- কভার ছবি ---------- */
const coverCache = new Map();
export function cover(s, cls = 'art') {
  if (s.cover && String(s.cover).startsWith('fs:')) return `<div class="${cls}">${art(s)}</div><img class="cover" data-fscover="${esc(s.id)}" alt="" hidden>`;
  if (s.cover) return `<img class="cover" src="${esc(s.cover)}" alt="" loading="lazy">`;
  return `<div class="${cls}">${art(s)}</div>`;
}
export const thumb = s => `<div class="th">${cover(s, 'art')}</div>`;
/* ছবি Firestore-এ থাকলে (Cloudinary ছাড়া) দেখা গেলে তবেই লোড হয় */
let io = null;
export function loadCovers(root = document) {
  const els = $$('img[data-fscover]', root); if (!els.length) return;
  io ??= new IntersectionObserver(es => es.forEach(async e => {
    if (!e.isIntersecting) return; io.unobserve(e.target); const id = e.target.dataset.fscover;
    let data = coverCache.get(id);
    if (data === undefined) { try { data = (await B.get('covers/' + id))?.data || ''; } catch (x) { data = ''; } coverCache.set(id, data); }
    if (data) { e.target.src = data; e.target.hidden = false; }
  }), { rootMargin: '200px' });
  els.forEach(el => io.observe(el));
}

/* ---------- হেডার ও ফুটার ---------- */
export function renderHeader(active) {
  const c = cfg(), u = D.user;
  const logo = c.logo || SITE.logo;
  document.title = document.title.split('|')[0].trim() + ' | ' + c.siteName;
  const fav = document.querySelector('link[rel="icon"]'); if (fav) fav.href = logo;
  const pc = window.__pendingCount || 0;
  $('#site-header').innerHTML = `<div class="wrap">
    <a class="logo" href="index.html" aria-label="${esc(c.siteName)}, হোম"><img src="${esc(logo)}" alt=""><span><b>${esc(c.siteName)}</b><small>${esc(c.siteNameEn)}</small></span></a>
    <nav class="nav" aria-label="প্রধান"><a href="index.html" ${active === 'home' ? 'aria-current="page"' : ''}>ম্যাপ</a><a href="spots.html" ${active === 'spots' ? 'aria-current="page"' : ''}>সব স্পট</a><a href="add-spot.html" ${active === 'add' ? 'aria-current="page"' : ''}>স্পট যোগ করুন</a></nav>
    <div class="right">${u ? `<span class="me"><span class="avatar">${esc((u.name || '?')[0].toUpperCase())}</span><span class="nm">${esc(u.name)}</span></span>
      ${u.isAdmin ? `<a class="btn sm" href="admin.html">অ্যাডমিন${pc ? ` <span class="badge">${toBn(pc)}</span>` : ''}</a>` : ''}<button class="btn ghost sm" id="logout">লগআউট</button>`
      : `<a class="btn ghost sm" href="login.html?next=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}">লগইন</a>`}</div></div>`;
  const lo = $('#logout'); if (lo) lo.onclick = async () => { await B.logout(); toast('লগআউট হয়েছে।'); };
  $('#notice').innerHTML = (DEMO ? `<div class="notice demo">ডেমো মোড: js/config.js-এ Firebase সেটআপ না হওয়া পর্যন্ত লগইন, রেটিং আর নতুন কিছু যোগ বন্ধ থাকবে।</div>` : '') + (c.notice ? `<div class="notice">${esc(c.notice)}</div>` : '');
}
export function renderFooter() {
  const c = cfg();
  $('#site-footer').innerHTML = `<div class="wrap"><div><b>${esc(c.siteName)}</b><br><span>ভ্রমণকারীদের হাতে গড়া বাংলাদেশের দর্শনীয় স্থানের তালিকা।</span></div>
    <div class="credit">ডেভেলপার: ${SITE.developerUrl ? `<a href="${esc(SITE.developerUrl)}" target="_blank" rel="noopener"><b>${esc(SITE.developer)}</b></a>` : `<b>${esc(SITE.developer)}</b>`}<br><span>© ${toBn(new Date().getFullYear())} ${esc(c.siteNameEn)}</span></div>
    <div class="src">জেলা সীমানা: OCHA ও বাংলাদেশ পরিসংখ্যান ব্যুরো<br>স্থানাঙ্ক: OpenStreetMap অবদানকারীগণ · আবহাওয়া: Open-Meteo</div></div>`;
}

/* ---------- টোস্ট, মোডাল, লাইটবক্স ---------- */
let toastT;
export function toast(msg) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => t.style.display = 'none', 3800); }
export function openModal(html, onMount) {
  const root = $('#modal-root'), prev = document.activeElement;
  root.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="mbox">${html}</div></div>`;
  const kd = e => { if (e.key === 'Escape') close(); };
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', kd); if (prev && prev.focus) prev.focus(); };
  document.addEventListener('keydown', kd);
  $('.modal', root).addEventListener('mousedown', e => { if (e.target.classList.contains('modal')) close(); });
  $$('[data-close]', root).forEach(b => b.onclick = close);
  const f = $('input,textarea,select,button', root); if (f) f.focus();
  if (onMount) onMount($('.mbox', root), close);
  return close;
}
export function lightbox(items, i) {
  const root = $('#modal-root'); let idx = i;
  const src = m => esc(m.url || m.data || '');
  const draw = () => {
    const m = items[idx];
    root.innerHTML = `<div class="lightbox" role="dialog" aria-modal="true"><button class="btn sm close" style="background:#fff;color:#000">বন্ধ করুন</button><div>${m.kind === 'video' ? `<video src="${src(m)}" controls autoplay></video>` : `<img src="${src(m)}" alt="${esc(m.caption || '')}">`}${m.caption ? `<p>${esc(m.caption)}</p>` : ''}${items.length > 1 ? `<p><button class="btn ghost sm" data-p style="color:#fff">← আগের</button> <button class="btn ghost sm" data-n style="color:#fff">পরের →</button></p>` : ''}</div></div>`;
    $('.close', root).onclick = close; $('.lightbox', root).onclick = e => { if (e.target.classList.contains('lightbox')) close(); };
    const p = $('[data-p]', root), n = $('[data-n]', root);
    if (p) p.onclick = () => { idx = (idx + items.length - 1) % items.length; draw(); };
    if (n) n.onclick = () => { idx = (idx + 1) % items.length; draw(); };
  };
  const kd = e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight' && items.length > 1) { idx = (idx + 1) % items.length; draw(); } else if (e.key === 'ArrowLeft' && items.length > 1) { idx = (idx + items.length - 1) % items.length; draw(); } };
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', kd); };
  document.addEventListener('keydown', kd); draw();
}

/* ---------- কার্ড ---------- */
export function pcard(s) {
  const r = rating(s.id);
  return `<a class="pcard" href="${spotUrl(s.id)}">${cover(s)}<span class="cat">${esc(CATS[s.c] || '')}</span>
    <button class="cam" data-cam="${esc(s.id)}" type="button" title="${D.user?.isAdmin ? 'কভার ছবি বদলান' : 'ছবি যোগ করুন'}" aria-label="${esc(s.bn)}: ছবি যোগ করুন">${I.cam}</button>
    <div class="meta"><h3>${esc(s.bn)}</h3><div class="sub"><span>${esc(DIST[s.d].bn)}</span>${r.n ? `<span><span class="star">★</span> ${fmt1(r.avg)}</span>` : ''}</div></div></a>`;
}

/* ---------- সার্চ (জেলা + স্পট) ---------- */
export function searchAll(q) {
  const v = norm(q); if (!v) return { d: [], s: [] };
  const score = keys => { let best = 1e9; for (const k of keys) { const i = norm(k).indexOf(v); if (i >= 0 && i < best) best = i; } return best; };
  const d = Object.values(DIST).map(p => ({ p, sc: score([p.bn, p.en, ...(p.alias || [])]) })).filter(x => x.sc < 1e9).sort((a, b) => a.sc - b.sc).slice(0, 4).map(x => x.p);
  const s = allSpots().list.map(sp => ({ sp, sc: score([sp.bn, sp.en, ...(sp.alt || [])]) })).filter(x => x.sc < 1e9).sort((a, b) => a.sc - b.sc).slice(0, 7).map(x => x.sp);
  return { d, s };
}
export const searchBox = ph => `<div class="search"><span class="ico">${I.search}</span><input type="search" placeholder="${esc(ph)}" aria-label="খুঁজুন" autocomplete="off"><div class="sugg" role="listbox"></div></div>`;
export function bindSearch(root, onDistrict) {
  const inp = $('input', root), box = $('.sugg', root); let opts = [], hi = 0;
  const close = () => { box.classList.remove('open'); box.innerHTML = ''; opts = []; };
  const pick = o => { close(); inp.blur(); if (o.type === 'd') { inp.value = ''; onDistrict ? onDistrict(o.en) : (location.href = 'index.html?d=' + encodeURIComponent(o.en)); } else location.href = spotUrl(o.id); };
  const show = () => {
    const { d, s } = searchAll(inp.value); if (!inp.value.trim()) { close(); return; }
    opts = [...d.map(p => ({ type: 'd', en: p.en })), ...s.map(x => ({ type: 's', id: x.id }))]; hi = 0;
    if (!opts.length) { box.innerHTML = '<div class="empty">কিছু পাওয়া যায়নি। বাংলা বা ইংরেজি অন্য বানানে চেষ্টা করুন।</div>'; box.classList.add('open'); return; }
    let h = '', i = 0;
    if (d.length) { h += '<h4>জেলা</h4>'; for (const p of d) { const n = (allSpots().byD.get(p.en) || []).length; h += `<div class="opt" role="option" data-i="${i}" aria-selected="${i === hi}"><div class="th letter">${esc(p.bn[0])}</div><div><b>${esc(p.bn)} জেলা</b><small>${esc(p.divbn)} বিভাগ, ${toBn(n)}টি স্পট</small></div></div>`; i++; } }
    if (s.length) { h += '<h4>স্পট</h4>'; for (const x of s) { h += `<div class="opt" role="option" data-i="${i}" aria-selected="${i === hi}">${thumb(x)}<div><b>${esc(x.bn)}</b><small>${esc(DIST[x.d].bn)}, ${esc(CATS[x.c] || '')}</small></div></div>`; i++; } }
    box.innerHTML = h; box.classList.add('open'); loadCovers(box);
    $$('.opt', box).forEach(el => el.addEventListener('mousedown', e => { e.preventDefault(); pick(opts[+el.dataset.i]); }));
  };
  inp.addEventListener('input', show);
  inp.addEventListener('focus', () => { if (inp.value) show(); });
  inp.addEventListener('blur', () => setTimeout(close, 120));
  inp.addEventListener('keydown', e => {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && opts.length) { e.preventDefault(); hi = (hi + (e.key === 'ArrowDown' ? 1 : opts.length - 1)) % opts.length; $$('.opt', box).forEach((el, i) => el.setAttribute('aria-selected', i === hi)); }
    else if (e.key === 'Enter' && opts[hi]) { e.preventDefault(); pick(opts[hi]); }
    else if (e.key === 'Escape') close();
  });
}

/* ---------- লাইভ রেন্ডার: কেউ টাইপ করলে মাঝপথে পেজ বদলায় না ---------- */
export function liveRenderer(fn) {
  let raf = 0, deferred = false;
  const typing = () => { const a = document.activeElement; return a && $('#view').contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName); };
  document.addEventListener('focusout', () => { if (deferred) setTimeout(() => { if (!typing()) { deferred = false; fn(true); } }, 60); });
  return () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; if (typing()) { deferred = true; return; } const y = scrollY; fn(true); scrollTo(0, y); }); };
}
