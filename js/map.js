/* জেলা-ফোকাস ম্যাপ: জেলা বাছলে বাকি দেশ ঝাপসা হয়, জেলা জুম হয়ে পিন দেখায় */
import { D, DIST, FEAT, CATS, allSpots, rating } from './data.js';
import { $, $$, esc, toBn, fmt1, I, thumb, spotUrl, reduce, loadCovers } from './ui.js';

export function mapMarkup() {
  return `<div class="mapcard" id="mapcard">
    <div class="mapbox"><svg class="layer" id="mbase" role="img" aria-label="বাংলাদেশের জেলা ম্যাপ"><g></g></svg><svg class="layer" id="mtop"><g></g></svg>
    <span class="maphint">ম্যাপে যেকোনো জেলায় চাপ দিন</span>
    <button class="btn ghost sm mapback" id="mapback">← সারা বাংলাদেশ</button><div class="mtip" id="mtip"></div></div>
    <aside class="dpanel" id="dpanel" aria-live="polite"></aside></div>`;
}

export function mountMap(onChange) {
  const card = $('#mapcard'), box = $('.mapbox', card), d3 = window.d3;
  const gB = d3.select('#mbase').select('g'), gT = d3.select('#mtop').select('g');
  const tip = $('#mtip'), panel = $('#dpanel');
  let proj, path, W, H, cur = null, k = 1, cat = null;
  const A = () => allSpots();
  function size() { W = box.clientWidth; H = box.clientHeight; const pad = Math.min(W, H) * .06; proj = d3.geoMercator().fitExtent([[pad, pad + 30], [W - pad, H - pad]], D.geo); path = d3.geoPath(proj); }
  function tipAt(e, txt) { const r = box.getBoundingClientRect(); tip.style.display = 'block'; tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; tip.textContent = txt; }
  function drawBase() {
    gB.selectAll('path').data(D.geo.features, f => f.properties.en).join('path').attr('d', path).classed('has', f => A().byD.has(f.properties.en))
      .on('mousemove', (e, f) => { const n = (A().byD.get(f.properties.en) || []).length; tipAt(e, f.properties.bn + (n ? ` (${toBn(n)}টি স্পট)` : '')); })
      .on('mouseleave', () => tip.style.display = 'none')
      .on('click', (e, f) => { tip.style.display = 'none'; focus(f.properties.en, true); onChange && onChange(f.properties.en); });
  }
  function tfor(f) {
    const [[x0, y0], [x1, y1]] = path.bounds(f); const side = W > 640 ? Math.min(380, W * .48) + 28 : 0;
    const pad = 36, w = W - side - pad * 2, h = H - pad * 2; const kk = Math.min(14, .88 / Math.max((x1 - x0) / w, (y1 - y0) / h));
    return { k: kk, x: pad + w / 2 - kk * (x0 + x1) / 2, y: pad + h / 2 - kk * (y0 + y1) / 2 };
  }
  function apply(t, anim) { const s = `translate(${t.x},${t.y}) scale(${t.k})`;[gB, gT].forEach(g => (anim && !reduce ? g.transition().duration(850).ease(d3.easeCubicInOut) : g).attr('transform', s)); }
  function drawTop(anim) {
    gT.selectAll('*').remove(); if (!cur) return;
    gT.append('path').attr('class', 'shape').attr('d', path(FEAT.get(cur))).attr('opacity', anim && !reduce ? 0 : 1).call(p => anim && !reduce ? p.transition().delay(250).duration(500).attr('opacity', 1) : p);
    const list = (A().byD.get(cur) || []).filter(s => !cat || s.c === cat);
    gT.selectAll('circle.pin').data(list, s => s.id).join('circle').attr('class', 'pin')
      .attr('cx', s => proj([s.lng, s.lat])[0]).attr('cy', s => proj([s.lng, s.lat])[1]).attr('r', 0)
      .on('mousemove', (e, s) => tipAt(e, s.bn)).on('mouseleave', () => tip.style.display = 'none')
      .on('click', (e, s) => { location.href = spotUrl(s.id); })
      .call(c => (anim && !reduce ? c.transition().delay((d, i) => 650 + i * 45).duration(280) : c).attr('r', 7 / k));
  }
  function renderPanel() {
    if (!cur) { panel.innerHTML = ''; return; }
    const p = DIST[cur], all = A().byD.get(cur) || [], cats = [...new Set(all.map(s => s.c))], list = all.filter(s => !cat || s.c === cat);
    panel.innerHTML = `<header><h2>${esc(p.bn)}</h2><p>${esc(p.divbn)} বিভাগ${all.length ? `, ${toBn(all.length)}টি দর্শনীয় স্থান` : ''}</p></header>
      ${cats.length > 1 ? `<div class="chips"><button class="chip" data-c="" aria-pressed="${!cat}">সব</button>${cats.map(c => `<button class="chip" data-c="${c}" aria-pressed="${cat === c}">${CATS[c]}</button>`).join('')}</div>` : ''}
      ${all.length ? `<ul>${list.map(s => { const r = rating(s.id); return `<li><a class="srow" data-id="${esc(s.id)}" href="${spotUrl(s.id)}">${thumb(s)}<div><b>${esc(s.bn)}</b><small>${esc(CATS[s.c] || '')}${r.n ? ` · <span class="star">★</span> ${fmt1(r.avg)}` : ''}</small></div><span class="go">${I.arrow}</span></a></li>`; }).join('')}</ul>`
        : `<p class="empty">এই জেলার কোনো স্পট এখনো যোগ হয়নি।</p>`}
      <p class="padd"><a class="btn ghost sm" href="add-spot.html?d=${encodeURIComponent(cur)}">+ ${esc(p.bn)}-এ নতুন স্পট প্রস্তাব করুন</a></p>`;
    loadCovers(panel);
    $$('.chip', panel).forEach(b => b.onclick = () => { cat = b.dataset.c || null; renderPanel(); drawTop(false); });
    $$('.srow', panel).forEach(a => { a.onmouseenter = () => gT.selectAll('circle.pin').classed('on', s => s.id === a.dataset.id); a.onmouseleave = () => gT.selectAll('circle.pin').classed('on', false); });
  }
  function focus(d, anim) {
    if (d && !FEAT.has(d)) d = null;
    cur = d; cat = null; card.classList.toggle('focused', !!d);
    if (d) { const t = tfor(FEAT.get(d)); k = t.k; apply(t, anim); } else { k = 1; apply({ x: 0, y: 0, k: 1 }, anim); }
    drawTop(anim); renderPanel();
  }
  function refresh() { drawBase(); drawTop(false); renderPanel(); }
  $('#mapback').onclick = () => { focus(null, true); onChange && onChange(null); };
  size(); drawBase();
  let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { size(); drawBase(); if (cur) { const t = tfor(FEAT.get(cur)); k = t.k; apply(t, false); } else apply({ x: 0, y: 0, k: 1 }, false); drawTop(false); }, 120); }).observe(box);
  return { focus, refresh, current: () => cur };
}
