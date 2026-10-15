import { DIST, DIVS, CATS, allSpots, rating } from '../data.js';
import { $, esc, toBn, norm, pcard } from '../ui.js';
import { boot } from '../page.js';

const P = () => new URLSearchParams(location.search);
const link = (k, v) => { const p = P(); if (v) p.set(k, v); else p.delete(k); if (k === 'v') p.delete('d'); const s = p.toString(); return 'spots.html' + (s ? '?' + s : ''); };

function grid() {
  const p = P(), q = p.get('q') || '', c = p.get('c') || '', dv = p.get('v') || '', d = p.get('d') || '', sort = p.get('s') || '';
  let list = allSpots().list.filter(s => (!c || s.c === c) && (!d || s.d === d) && (!dv || DIST[s.d].div === dv));
  if (q) { const v = norm(q); list = list.filter(s => [s.bn, s.en, DIST[s.d].bn, DIST[s.d].en, ...(s.alt || [])].some(x => norm(x).includes(v))); }
  if (sort === 'rating') list.sort((a, b) => rating(b.id).avg - rating(a.id).avg || rating(b.id).n - rating(a.id).n);
  else list.sort((a, b) => DIVS.findIndex(x => x[0] === DIST[a.d].div) - DIVS.findIndex(x => x[0] === DIST[b.d].div) || DIST[a.d].bn.localeCompare(DIST[b.d].bn, 'bn'));
  return `<p class="count">${toBn(list.length)}টি স্থান</p>${list.length ? `<div class="grid">${list.map(pcard).join('')}</div>` : `<p>এই খোঁজে কিছু পাওয়া যায়নি। ফিল্টার কমিয়ে দেখুন, অথবা <a href="add-spot.html">নতুন স্পট প্রস্তাব করুন</a>।</p>`}`;
}
function render(live) {
  if (live) { $('#results').innerHTML = grid(); return; }
  const p = P(), q = p.get('q') || '', c = p.get('c') || '', dv = p.get('v') || '', d = p.get('d') || '', sort = p.get('s') || '';
  const dists = Object.values(DIST).filter(x => !dv || x.div === dv).sort((a, b) => a.bn.localeCompare(b.bn, 'bn'));
  $('#view').innerHTML = `<div class="wrap"><div class="pagehead"><h1>${c ? esc(CATS[c]) : d ? esc(DIST[d]?.bn || '') + ' জেলার দর্শনীয় স্থান' : 'সব দর্শনীয় স্থান'}</h1>
    <div class="filters"><input id="fq" type="search" placeholder="নাম দিয়ে খুঁজুন" value="${esc(q)}">
      <select id="fv" aria-label="বিভাগ"><option value="">সব বিভাগ</option>${DIVS.map(([en, bn]) => `<option value="${en}" ${dv === en ? 'selected' : ''}>${bn}</option>`).join('')}</select>
      <select id="fd" aria-label="জেলা"><option value="">সব জেলা</option>${dists.map(x => `<option value="${esc(x.en)}" ${d === x.en ? 'selected' : ''}>${esc(x.bn)}</option>`).join('')}</select>
      <select id="fs" aria-label="সাজান"><option value="">বিভাগ অনুযায়ী</option><option value="rating" ${sort === 'rating' ? 'selected' : ''}>রেটিং অনুযায়ী</option></select></div>
    <div class="chips"><a class="chip" href="${link('c', '')}" aria-pressed="${!c}">সব ধরন</a>${Object.entries(CATS).map(([k, v]) => `<a class="chip" href="${link('c', k)}" aria-pressed="${c === k}">${v}</a>`).join('')}</div></div>
    <div id="results">${grid()}</div></div>`;
  let t; $('#fq').oninput = e => { clearTimeout(t); t = setTimeout(() => { history.replaceState(null, '', link('q', e.target.value.trim())); $('#results').innerHTML = grid(); }, 250); };
  $('#fv').onchange = e => location.href = link('v', e.target.value);
  $('#fd').onchange = e => location.href = link('d', e.target.value);
  $('#fs').onchange = e => location.href = link('s', e.target.value);
}
boot('spots', render);
