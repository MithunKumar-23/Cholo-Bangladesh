import { DIST, DIVS, CATS, DEFAULT_FEATURED, allSpots, rating, cfg } from '../data.js';
import { $, esc, toBn, art, pcard, searchBox, bindSearch, qs } from '../ui.js';
import { mapMarkup, mountMap } from '../map.js';
import { boot } from '../page.js';

let mapApi = null;
const setUrl = d => history.replaceState(null, '', d ? '?d=' + encodeURIComponent(d) : location.pathname);

function sections() {
  const c = cfg(), A = allSpots();
  const feat = (c.featured || []).map(id => A.byId.get(id)).filter(s => s && !s.deleted);
  const featured = (feat.length ? feat : DEFAULT_FEATURED.map(id => A.byId.get(id)).filter(Boolean)).slice(0, 8);
  const top = A.list.filter(s => rating(s.id).n).sort((a, b) => rating(b.id).avg - rating(a.id).avg || rating(b.id).n - rating(a.id).n).slice(0, 4);
  const cc = {}; A.list.forEach(s => cc[s.c] = (cc[s.c] || 0) + 1);
  return `
  <section class="sec"><div class="wrap">
    <div class="sec-head"><div><h2>এবারের বাছাই</h2><p class="lead">যেসব জায়গা অন্তত একবার নিজের চোখে দেখা উচিত</p></div><a class="more" href="spots.html">সব ${toBn(A.list.length)}টি স্পট দেখুন</a></div>
    <div class="grid big">${featured.map(pcard).join('')}</div></div></section>
  ${top.length ? `<section class="sec"><div class="wrap"><div class="sec-head"><div><h2>ভ্রমণকারীদের প্রিয়</h2><p class="lead">সবচেয়ে বেশি রেটিং পাওয়া জায়গা</p></div></div><div class="grid big">${top.map(pcard).join('')}</div></div></section>` : ''}
  <section class="sec"><div class="wrap"><div class="sec-head"><div><h2>কেমন জায়গা খুঁজছেন?</h2></div></div>
    <div class="cats">${Object.entries(CATS).filter(([k]) => cc[k]).map(([k, v]) => `<a class="ctile" href="spots.html?c=${k}"><div class="th">${art({ id: 'cat-' + k, c: k, en: k === 'nature' ? 'forest' : k })}</div><div><b>${v}</b><small>${toBn(cc[k])}টি স্থান</small></div></a>`).join('')}</div></div></section>
  <section class="sec"><div class="wrap"><div class="sec-head"><div><h2>বিভাগ ধরে ঘুরুন</h2></div></div>
    <div class="divs">${DIVS.map(([en, bn]) => { const ds = Object.values(DIST).filter(p => p.div === en).map(p => ({ p, n: (A.byD.get(p.en) || []).length })).sort((a, b) => b.n - a.n); const tot = ds.reduce((a, b) => a + b.n, 0);
      return `<div class="div"><h3>${bn}</h3><p>${toBn(ds.length)}টি জেলা, ${toBn(tot)}টি স্পট</p><div class="chips">${ds.map(x => `<a class="chip" href="index.html?d=${encodeURIComponent(x.p.en)}" ${x.n ? '' : 'style="opacity:.6"'}>${esc(x.p.bn)}${x.n ? ' ' + toBn(x.n) : ''}</a>`).join('')}</div></div>`; }).join('')}</div></div></section>`;
}
function heroText() {
  const c = cfg();
  return `<h1>${esc(c.heroTitle)}</h1><p class="sub">${esc(c.heroSub)}</p>`;
}
function stats() { const A = allSpots(); return `<div><b>${toBn(A.list.length)}</b>দর্শনীয় স্থান</div><div><b>${toBn(A.byD.size)}</b>জেলা</div><div><b>${toBn(new Set(A.list.map(s => s.c)).size)}</b>ধরনের ভ্রমণ</div>`; }

function render(live) {
  if (live && mapApi) {
    $('#herotext').innerHTML = heroText(); $('#stats').innerHTML = stats(); $('#sections').innerHTML = sections(); mapApi.refresh(); return;
  }
  const popular = ['Sylhet', "Cox's Bazar", 'Bandarban', 'Rangamati', 'Khulna', 'Dhaka'];
  $('#view').innerHTML = `
  <section class="hero"><div class="wrap hero-grid">
    <div><div id="herotext">${heroText()}</div>
      <div id="hsearch">${searchBox('জেলা বা জায়গার নাম লিখুন, যেমন সিলেট বা Sajek')}</div>
      <div class="quick chips"><span>জনপ্রিয়:</span>${popular.map(d => `<a class="chip" href="?d=${encodeURIComponent(d)}" data-d="${esc(d)}">${esc(DIST[d].bn)}</a>`).join('')}</div>
      <div class="stats" id="stats">${stats()}</div></div>
    ${mapMarkup()}
  </div></section><div id="sections">${sections()}</div>`;
  mapApi = mountMap(d => setUrl(d));
  bindSearch($('#hsearch'), d => { mapApi.focus(d, true); setUrl(d); $('#mapcard').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  document.querySelectorAll('.quick [data-d]').forEach(a => a.onclick = e => { e.preventDefault(); mapApi.focus(a.dataset.d, true); setUrl(a.dataset.d); });
  const d = qs('d'); if (d) mapApi.focus(d, true);
}
boot('home', render);
