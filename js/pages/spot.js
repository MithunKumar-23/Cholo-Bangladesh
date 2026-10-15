import { D, DIST, FEAT, CATS, MODES, allSpots, rating, myRating, dinfo, editable, saveSpot, setCover } from '../data.js';
import { B, errText } from '../backend.js';
import { $, $$, esc, toBn, fmt1, I, stars, cover, thumb, spotUrl, safeUrl, hostOf, qs, toast, lightbox, loadCovers } from '../ui.js';
import { openContrib, rate } from '../contribute.js';
import { boot } from '../page.js';

const id = qs('id');
let media = [], tips = [], tab = null, weather = null, subbed = false;

function subscribe() {
  if (subbed) return; subbed = true;
  B.watchCol('media', rows => { media = rows; rerender(); }, [['spot', '==', id]]);
  B.watchCol('tips', rows => { tips = rows; rerender(); }, [['spot', '==', id]]);
}
let rerender = () => {};

/* আবহাওয়া: Open-Meteo (বিনামূল্যে, কোনো key লাগে না) */
const WX = { 0: ['☀️', 'পরিষ্কার আকাশ'], 1: ['🌤️', 'প্রায় পরিষ্কার'], 2: ['⛅', 'আংশিক মেঘলা'], 3: ['☁️', 'মেঘলা'], 45: ['🌫️', 'কুয়াশা'], 48: ['🌫️', 'ঘন কুয়াশা'], 51: ['🌦️', 'হালকা গুঁড়ি বৃষ্টি'], 53: ['🌦️', 'গুঁড়ি বৃষ্টি'], 55: ['🌧️', 'ঘন গুঁড়ি বৃষ্টি'], 61: ['🌦️', 'হালকা বৃষ্টি'], 63: ['🌧️', 'বৃষ্টি'], 65: ['🌧️', 'ভারী বৃষ্টি'], 80: ['🌦️', 'থেমে থেমে বৃষ্টি'], 81: ['🌧️', 'বৃষ্টি'], 82: ['⛈️', 'প্রবল বৃষ্টি'], 95: ['⛈️', 'বজ্রসহ বৃষ্টি'], 96: ['⛈️', 'বজ্রঝড়'], 99: ['⛈️', 'বজ্রঝড়'] };
const wx = c => WX[c] || WX[Math.floor(c / 10) * 10] || ['🌡️', 'আবহাওয়া'];
async function loadWeather(s) {
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FDhaka&forecast_days=4`;
    const r = await fetch(u); if (!r.ok) throw 0; weather = await r.json();
  } catch (e) { weather = { error: true }; }
  const el = $('#wx'); if (el) el.innerHTML = wxHtml();
}
function wxHtml() {
  if (!weather) return '<p class="mutedline">আবহাওয়া লোড হচ্ছে…</p>';
  if (weather.error || !weather.current) return '<p class="mutedline">এখন আবহাওয়া পাওয়া যাচ্ছে না।</p>';
  const c = weather.current, d = weather.daily, [ic, tx] = wx(c.weather_code);
  const days = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'];
  return `<div class="wxnow"><span class="wxic">${ic}</span><div><b>${toBn(Math.round(c.temperature_2m))}°</b><span>${tx}</span></div></div>
    <p class="mutedline">আর্দ্রতা ${toBn(c.relative_humidity_2m)}% · বাতাস ${toBn(Math.round(c.wind_speed_10m))} কিমি/ঘণ্টা</p>
    <div class="wxdays">${d.time.slice(1, 4).map((t, i) => { const [di] = wx(d.weather_code[i + 1]); return `<div><small>${days[new Date(t).getDay()]}</small><span>${di}</span><small>${toBn(Math.round(d.temperature_2m_max[i + 1]))}° / ${toBn(Math.round(d.temperature_2m_min[i + 1]))}°</small><small class="rain">বৃষ্টি ${toBn(d.precipitation_probability_max[i + 1] ?? 0)}%</small></div>`; }).join('')}</div>`;
}

function drawMini(s) {
  const el = $('#minimap'); if (!el || !window.d3) return; const w = el.clientWidth || 320, h = el.clientHeight || 220, f = FEAT.get(s.d);
  const proj = d3.geoMercator().fitExtent([[18, 18], [w - 18, h - 18]], f), path = d3.geoPath(proj);
  const others = (allSpots().byD.get(s.d) || []).filter(x => x.id !== s.id); const [x, y] = proj([s.lng, s.lat]);
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(DIST[s.d].bn)} জেলায় অবস্থান"><path class="d" d="${path(f)}"/>${others.map(o => { const [a, b] = proj([o.lng, o.lat]); return `<a href="${spotUrl(o.id)}"><circle class="o" cx="${a}" cy="${b}" r="4"><title>${esc(o.bn)}</title></circle></a>`; }).join('')}<circle cx="${x}" cy="${y}" r="16" fill="var(--red)" opacity=".18"/><circle class="p" cx="${x}" cy="${y}" r="7"/></svg>`;
}

function render(live) {
  const A = allSpots(), s = A.byId.get(id), admin = D.user?.isAdmin;
  if (!s || (s.deleted && !admin)) {
    $('#view').innerHTML = `<div class="wrap"><div class="gate"><h1>${D.liveReady || B.demo ? 'স্পটটি পাওয়া যায়নি' : 'লোড হচ্ছে…'}</h1><p class="mutedline">লিংকটি পুরোনো হতে পারে, বা স্পটটি সরিয়ে ফেলা হয়েছে।</p><a class="btn" href="spots.html">সব স্পট দেখুন</a></div></div>`;
    return;
  }
  document.title = `${s.bn} | ${document.title.split('|').pop().trim()}`;
  subscribe();
  const p = DIST[s.d], di = dinfo(s.d), rt = rating(s.id), mine = myRating(s.id);
  const go = { bus: s.go.bus || di.bus, train: s.go.train || di.train, launch: s.go.launch || di.launch, air: s.go.air || di.air, local: s.go.local };
  const modes = MODES.filter(([k]) => go[k]); if (!tab || !go[tab]) tab = (modes[0] || [])[0];
  const stay = s.stay || di.stay;
  const miss = f => `<span class="missing">এখনো যাচাই করা তথ্য নেই।</span> <button class="addlink" data-add="${f}">জানলে যোগ করুন</button>`;
  const nearby = (A.byD.get(s.d) || []).filter(x => x.id !== s.id).slice(0, 5);
  const ms = media.slice().sort((a, b) => (b.at || 0) - (a.at || 0)), vis = ms.filter(m => m.kind !== 'vlink'), links = ms.filter(m => m.kind === 'vlink');
  const ts = tips.slice().sort((a, b) => (b.at || 0) - (a.at || 0));
  const src = m => esc(m.url || m.data || '');
  $('#view').innerHTML = `
  <section class="shero">${cover(s)}<div class="wrap">
    <button class="cam big" data-cam="${esc(s.id)}" type="button">${I.cam}<span>${admin ? 'কভার ছবি বদলান' : 'ছবি যোগ করুন'}</span></button>
    <div class="crumbs"><a href="index.html">হোম</a> › <a href="spots.html?v=${esc(p.div)}">${esc(p.divbn)}</a> › <a href="index.html?d=${encodeURIComponent(s.d)}">${esc(p.bn)}</a></div>
    <h1>${esc(s.bn)}</h1><div class="en">${esc(s.en || '')}</div>
    <div class="tags"><span class="tag">${esc(CATS[s.c] || '')}</span>${rt.n ? `<span class="tag">★ ${fmt1(rt.avg)} (${toBn(rt.n)}টি রেটিং)</span>` : ''}${s.custom && s.addedByName ? `<span class="tag">যোগ করেছেন: ${esc(s.addedByName)}</span>` : ''}${s.deleted ? '<span class="tag" style="background:var(--red)">মুছে ফেলা (শুধু অ্যাডমিন দেখছেন)</span>' : ''}</div>
  </div></section>
  <div class="wrap sbody"><div>
    <div class="block"><h2>বর্ণনা</h2><div class="prose">${esc(s.desc || s.t || '')}</div>${s.desc ? '' : `<p class="mutedline">বিস্তারিত বর্ণনা এখনো লেখা হয়নি। <button class="addlink" data-add="desc">বর্ণনা লিখে দিন</button></p>`}</div>
    <div class="facts">
      <div class="fact"><small>খোলার সময়সূচী</small><div>${s.hours ? esc(s.hours) : miss('hours')}</div></div>
      <div class="fact"><small>প্রবেশ ফি</small><div>${s.fee ? esc(s.fee) : miss('fee')}</div></div>
      <div class="fact"><small>যাওয়ার উপযুক্ত সময়</small><div>${s.best ? esc(s.best) : miss('best')}</div></div></div>
    <div class="block"><h2>কীভাবে যাবেন</h2>
      ${modes.length ? `<div class="tabs" role="tablist">${modes.map(([k, v]) => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${k === tab}">${I[k]} ${v}</button>`).join('')}</div><div class="tabpanel" role="tabpanel">${esc(go[tab])}</div>` : `<div class="tabpanel">${miss('go.local')}</div>`}
      ${go.local ? '' : `<p class="mutedline">জেলা সদর থেকে শেষ অংশের পথের তথ্য নেই। <button class="addlink" data-add="go.local">যোগ করুন</button></p>`}
      ${di.note ? `<div class="callout">${esc(di.note)}</div>` : ''}</div>
    <div class="block"><h2>কোথায় থাকবেন</h2><div class="tabpanel">${stay ? esc(stay) : miss('stay')}</div></div>
    <div class="block"><h2>ছবি ও ভিডিও <button class="btn ghost sm" data-contrib="photo">যোগ করুন</button></h2>
      ${ms.length ? `<div class="gallery">${vis.map((m, i) => `<div class="gitem" data-lb="${i}" role="button" tabindex="0">${m.kind === 'video' ? `<video src="${src(m)}" muted preload="metadata"></video>` : `<img src="${src(m)}" alt="${esc(m.caption || s.bn)}" loading="lazy">`}${m.caption ? `<span class="cap">${esc(m.caption)}</span>` : ''}${admin ? `<span class="x adminbar">${m.kind === 'photo' ? `<button class="btn gold sm" data-cover="${esc(m.id)}">কভার</button>` : ''}<button class="btn danger sm" data-delmedia="${esc(m.id)}">মুছুন</button></span>` : ''}</div>`).join('')}${links.map(m => `<a class="vlink" href="${esc(safeUrl(m.url))}" target="_blank" rel="noopener">${I.play}<span>${esc(m.caption || 'ভিডিও দেখুন')}</span><small>${esc(hostOf(m.url))}</small>${admin ? `<button class="btn danger sm x" data-delmedia="${esc(m.id)}">মুছুন</button>` : ''}</a>`).join('')}</div>`
        : `<p class="mutedline">এখনো কোনো ছবি নেই। প্রথম ছবিটি আপনিই দিন।</p>`}</div>
    <div class="block"><h2>ভ্রমণকারীদের টিপস <button class="btn ghost sm" data-contrib="tip">টিপস দিন</button></h2>
      ${ts.length ? `<ul class="tips">${ts.map(t => `<li><p>${esc(t.text)}</p><div class="who"><span class="avatar sm">${esc((t.byName || '?')[0])}</span><span>${esc(t.byName || 'একজন ভ্রমণকারী')}</span><span class="sp">${t.at ? new Date(t.at).toLocaleDateString('bn-BD') : ''}</span>${admin ? `<button class="btn danger sm" data-deltip="${esc(t.id)}">মুছুন</button>` : ''}</div></li>`).join('')}</ul>` : `<p class="mutedline">এখনো কোনো টিপস নেই।</p>`}</div>
  </div>
  <aside class="side">
    <div class="panel"><h3>রেটিং</h3>
      <div class="rate-big"><b>${rt.n ? fmt1(rt.avg) : '–'}</b><div>${stars(rt.avg)}<div class="coord">${rt.n ? toBn(rt.n) + 'টি রেটিং' : 'এখনো কোনো রেটিং নেই'}</div></div></div>
      <p class="mutedline" style="margin-top:14px">${mine ? 'আপনার রেটিং (বদলাতে চাপ দিন)' : 'আপনি কত দেবেন?'}</p>
      <div class="rate-in" id="ratein">${[1, 2, 3, 4, 5].map(n => `<button aria-label="${toBn(n)} তারা" data-r="${n}" class="${mine >= n ? 'on' : ''}">${I.star}</button>`).join('')}</div></div>
    <div class="panel"><h3>এখনকার আবহাওয়া</h3><div id="wx">${wxHtml()}</div></div>
    <div class="panel"><h3>অবস্থান</h3><div class="minimap" id="minimap"></div>
      <div class="coord">${toBn(s.lat.toFixed(4))}, ${toBn(s.lng.toFixed(4))} ${s.ok ? '· যাচাই করা' : '· আনুমানিক'}</div>
      <p style="margin:.6rem 0 0"><a class="more" href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}" target="_blank" rel="noopener">Google Maps-এ দেখুন ↗</a></p></div>
    <div class="panel"><h3>আপনি কি এখানে গেছেন?</h3><p class="mutedline" style="margin:0 0 12px">ছবি, ভিডিও বা হালনাগাদ তথ্য দিন। অ্যাডমিন যাচাই করে প্রকাশ করবেন।</p>
      <button class="btn wide" data-contrib="info">তথ্য বা ছবি যোগ করুন</button></div>
    ${admin ? `<div class="panel"><h3>অ্যাডমিন</h3><div class="adminbar"><a class="btn sm" href="edit-spot.html?id=${encodeURIComponent(s.id)}">সব তথ্য সম্পাদনা</a>${s.deleted ? `<button class="btn gold sm" id="restore">ফিরিয়ে আনুন</button>` : `<button class="btn danger sm" id="delspot">স্পট মুছুন</button>`}</div></div>` : ''}
    ${nearby.length ? `<div class="panel"><h3>${esc(p.bn)} জেলায় আরও</h3>${nearby.map(x => `<a class="srow" href="${spotUrl(x.id)}">${thumb(x)}<div><b>${esc(x.bn)}</b><small>${esc(CATS[x.c] || '')}</small></div></a>`).join('')}</div>` : ''}
  </aside></div>`;
  drawMini(s);
  if (!weather) loadWeather(s);
  $$('.tab').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(true); });
  $$('[data-add]').forEach(b => b.onclick = () => openContrib(s, 'info', b.dataset.add));
  $$('[data-contrib]').forEach(b => b.onclick = () => openContrib(s, b.dataset.contrib));
  $$('#ratein button').forEach(b => b.onclick = () => rate(s.id, +b.dataset.r));
  $$('.gitem').forEach(el => { const open = e => { if (e.target.closest('button')) return; lightbox(vis, +el.dataset.lb); }; el.onclick = open; el.onkeydown = e => { if (e.key === 'Enter') open(e); }; });
  $$('[data-delmedia]').forEach(b => b.onclick = async e => { e.preventDefault(); e.stopPropagation(); if (!confirm('এই ছবি/ভিডিও মুছবেন?')) return; try { await B.del('media/' + b.dataset.delmedia); toast('মুছে ফেলা হয়েছে।'); } catch (x) { toast(errText(x)); } });
  $$('[data-cover]').forEach(b => b.onclick = async e => { e.stopPropagation(); const m = media.find(x => x.id === b.dataset.cover); try { await setCover(s.id, m.url || m.data); toast('কভার ছবি বদলানো হয়েছে।'); } catch (x) { toast(errText(x)); } });
  $$('[data-deltip]').forEach(b => b.onclick = async () => { if (!confirm('এই টিপস মুছবেন?')) return; try { await B.del('tips/' + b.dataset.deltip); toast('মুছে ফেলা হয়েছে।'); } catch (x) { toast(errText(x)); } });
  const ds = $('#delspot'); if (ds) ds.onclick = async () => { if (!confirm(`"${s.bn}" মুছে ফেলবেন? পরে অ্যাডমিন প্যানেল থেকে ফিরিয়ে আনা যাবে।`)) return; try { await saveSpot(s.id, { ...editable(s), deleted: true }); toast('স্পট মুছে ফেলা হয়েছে।'); } catch (x) { toast(errText(x)); } };
  const rs = $('#restore'); if (rs) rs.onclick = async () => { try { await saveSpot(s.id, { ...editable(s), deleted: false }); toast('ফিরিয়ে আনা হয়েছে।'); } catch (x) { toast(errText(x)); } };
}
rerender = () => { render(true); loadCovers(); };
boot('spot', render);
