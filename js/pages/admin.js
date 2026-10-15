import { D, DIST, CATS, FIELDS, allSpots, dinfo, cfg, editable, saveSpot, buildExport, sameSpots, sameInfo, recomputeStats } from '../data.js';
import { B, errText } from '../backend.js';
import { SITE, OWNER_EMAIL } from '../config.js';
import { $, $$, esc, toBn, norm, qs, toast, spotUrl, safeUrl } from '../ui.js';
import { uploadImage } from '../upload.js';
import { publish } from '../contribute.js';
import { boot, subs } from '../page.js';
import { fld, distOpts } from '../form.js';

const tabNow = () => qs('t') || 'queue';
const KIND = { photo: 'ছবি', video: 'ভিডিও', vlink: 'ভিডিও লিংক', info: 'তথ্য সংশোধন', tip: 'টিপস', spot: 'নতুন স্পট' };
let drawnTab = null;

function gate() {
  const u = D.user;
  $('#view').innerHTML = `<div class="wrap"><div class="gate"><h1>অ্যাডমিন প্যানেল</h1>
    ${B.demo ? `<p>সাইটটি ডেমো মোডে চলছে। অ্যাডমিন লগইন চালু করতে <code>js/config.js</code>-এ Firebase সেটআপ করুন (README.md দেখুন)।</p>`
      : !D.userKnown ? '<p>যাচাই করা হচ্ছে…</p>'
      : u ? `<p>আপনি <b>${esc(u.email)}</b> দিয়ে লগইন করা আছেন, কিন্তু এই অ্যাকাউন্ট অ্যাডমিন নয়।</p><p class="mutedline">প্রধান অ্যাডমিন অ্যাডমিন প্যানেল → অ্যাডমিন ট্যাব থেকে আপনার ইমেইল যোগ করলে আবার লগইন করুন।</p>`
      : `<p>অ্যাডমিন ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।</p><a class="btn" href="login.html?next=admin.html">অ্যাডমিন লগইন</a>`}
    <p style="margin-top:16px"><a class="more" href="index.html">← হোমে ফিরুন</a></p></div></div>`;
}
function tabs(t) {
  const pc = subs.list.length;
  return `<div class="pagehead"><h1>অ্যাডমিন প্যানেল</h1><p class="mutedline">কোড না ছুঁয়েই সাইটের সব তথ্য এখান থেকে বদলানো যায়।</p></div>
  <nav class="atabs">${[['queue', `অনুমোদনের অপেক্ষায়${pc ? ` <span class="badge">${toBn(pc)}</span>` : ''}`], ['spots', 'স্পট'], ['districts', 'জেলার তথ্য'], ['site', 'সাইট ও লোগো'], ['data', 'ডেটা ও ব্যাকআপ'], ['admins', 'অ্যাডমিন']].map(([k, l]) => `<a href="admin.html?t=${k}" aria-current="${t === k ? 'page' : 'false'}">${l}</a>`).join('')}</nav>`;
}

/* ---------- অনুমোদনের তালিকা ---------- */
function queue() {
  const A = allSpots();
  const media = it => it.type === 'photo' ? `<img src="${esc(it.url || it.data || '')}" alt="">` : it.type === 'video' ? `<video src="${esc(it.url)}" muted controls></video>` : it.type === 'spot' && it.cover ? `<img src="${esc(it.cover)}" alt="">` : esc(KIND[it.type] || '');
  const cur = it => { const s = A.byId.get(it.spot); if (!s || !it.field) return ''; return it.field.startsWith('go.') ? (s.go || {})[it.field.slice(3)] : s[it.field]; };
  const body = it => {
    if (it.type === 'spot') { const n = it.newSpot || {}; return `<b>${esc(n.bn)}</b> (${esc(n.en)}) · ${esc(DIST[n.d]?.bn || n.d)} · ${esc(CATS[n.c] || '')}\n${esc(n.t || '')}${n.desc ? '\n\n' + esc(n.desc) : ''}${n.hours ? '\nসময়: ' + esc(n.hours) : ''}${n.fee ? '\nফি: ' + esc(n.fee) : ''}${n.go?.local ? '\nযাতায়াত: ' + esc(n.go.local) : ''}\n<a href="https://www.google.com/maps/search/?api=1&query=${n.lat},${n.lng}" target="_blank" rel="noopener">ম্যাপে অবস্থান দেখুন ↗</a>`; }
    if (it.text) { const c = cur(it); return esc(it.text) + (c ? `<div class="mutedline" style="margin-top:8px">বর্তমান: ${esc(c)}</div>` : ''); }
    if (it.type === 'vlink') return `<a href="${esc(safeUrl(it.url))}" target="_blank" rel="noopener">${esc(it.url)}</a>${it.caption ? '\n' + esc(it.caption) : ''}`;
    return (esc(it.caption) || '(ক্যাপশন নেই)') + (it.asCover ? '\n<span class="pill warn">কভার ছবি হিসেবে প্রস্তাবিত</span>' : '');
  };
  const items = subs.list;
  return items.length ? items.map(it => { const s = A.byId.get(it.spot); return `<div class="qitem" data-id="${esc(it.id)}"><div class="qmedia">${media(it)}</div><div>
      <span class="kind">${esc(KIND[it.type] || it.type)}${it.field ? ' · ' + esc(FIELDS[it.field] || it.field) : ''}</span>
      <h3>${it.type === 'spot' ? esc(it.newSpot?.bn || '') : `<a href="${spotUrl(it.spot)}">${esc(s ? s.bn : it.spot)}</a>`}</h3>
      <div class="who"><span class="avatar sm">${esc((it.byName || '?')[0])}</span><span>${esc(it.byName || '')}</span><span class="sp">${new Date(it.at || 0).toLocaleString('bn-BD')}</span></div>
      <div class="body">${body(it)}</div>
      <div class="adminbar">${it.type === 'info' ? `<button class="btn sm" data-act="apply">স্পটের তথ্যে বসান</button><button class="btn ghost sm" data-act="tip">টিপস হিসেবে প্রকাশ</button>` : `<button class="btn sm" data-act="ok">অনুমোদন দিন</button>`}<button class="btn danger sm" data-act="reject">বাতিল করুন</button></div></div></div>`; }).join('')
    : `<div class="gate" style="margin:20px 0"><h1>সব কাজ শেষ</h1><p class="mutedline">নতুন কোনো ছবি, তথ্য বা স্পট অনুমোদনের অপেক্ষায় নেই।</p></div>`;
}
function bindQueue() {
  $$('.qitem').forEach(el => $$('[data-act]', el).forEach(b => b.onclick = async () => {
    const it = subs.list.find(x => x.id === el.dataset.id), a = b.dataset.act; if (!it) return;
    if (a === 'reject' && !confirm('এই অবদান বাতিল করবেন?')) return;
    $$('button', el).forEach(x => x.disabled = true);
    try { if (a !== 'reject') await publish(it, a === 'tip' ? 'tip' : 'apply'); await B.del('submissions/' + it.id); toast(a === 'reject' ? 'বাতিল করা হয়েছে।' : 'প্রকাশিত হয়েছে।'); }
    catch (x) { toast(errText(x)); $$('button', el).forEach(y => y.disabled = false); }
  }));
}

/* ---------- স্পট তালিকা ---------- */
function spotsTab() {
  const A = allSpots(), v = norm(qs('q'));
  const rows = A.every.filter(s => !v || [s.bn, s.en, DIST[s.d].bn, s.id].some(x => norm(x).includes(v))).sort((a, b) => (b.deleted ? 0 : 1) - (a.deleted ? 0 : 1) || DIST[a.d].bn.localeCompare(DIST[b.d].bn, 'bn'));
  const st = s => [s.deleted ? '<span class="pill bad">মুছে ফেলা</span>' : '', s.custom ? '<span class="pill">নতুন যোগ</span>' : '', D.ov[s.id] && !s.custom ? '<span class="pill">সম্পাদিত</span>' : '', s.cover ? '' : '<span class="pill warn">ছবি নেই</span>', !s.ok ? '<span class="pill warn">অবস্থান আনুমানিক</span>' : '', !s.hours || !s.fee ? '<span class="pill warn">সময়/ফি নেই</span>' : ''].join(' ');
  return `<div class="filters"><input id="aq" type="search" placeholder="স্পট খুঁজুন" value="${esc(qs('q'))}"><a class="btn" href="edit-spot.html">+ নতুন স্পট</a></div>
    <p class="count">${toBn(rows.length)}টি স্পট</p>
    <div class="tblwrap"><table class="table"><thead><tr><th>নাম</th><th>জেলা</th><th>ধরন</th><th>অবস্থা</th><th></th></tr></thead><tbody>
    ${rows.map(s => `<tr><td><a href="${spotUrl(s.id)}"><b>${esc(s.bn)}</b></a><br><small class="coord">${esc(s.en || '')}</small></td><td>${esc(DIST[s.d].bn)}</td><td>${esc(CATS[s.c] || '')}</td><td>${st(s)}</td>
      <td class="nowrap"><a class="btn sm" href="edit-spot.html?id=${encodeURIComponent(s.id)}">সম্পাদনা</a>${s.deleted ? `<button class="btn gold sm" data-restore="${esc(s.id)}">ফিরিয়ে আনুন</button>` : `<button class="btn danger sm" data-del="${esc(s.id)}">মুছুন</button>`}</td></tr>`).join('')}</tbody></table></div>`;
}
function bindSpots() {
  const A = allSpots(); let tm;
  $('#aq').oninput = e => { clearTimeout(tm); tm = setTimeout(() => { history.replaceState(null, '', 'admin.html?t=spots&q=' + encodeURIComponent(e.target.value)); $('#tabbody').innerHTML = spotsTab(); bindSpots(); const i = $('#aq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
  $$('[data-del]').forEach(b => b.onclick = async () => { const s = A.byId.get(b.dataset.del); if (!confirm(`"${s.bn}" মুছবেন? পরে ফিরিয়ে আনা যাবে।`)) return; try { await saveSpot(s.id, { ...editable(s), deleted: true }); toast('মুছে ফেলা হয়েছে।'); } catch (x) { toast(errText(x)); } });
  $$('[data-restore]').forEach(b => b.onclick = async () => { const s = A.byId.get(b.dataset.restore); try { await saveSpot(s.id, { ...editable(s), deleted: false }); toast('ফিরিয়ে আনা হয়েছে।'); } catch (x) { toast(errText(x)); } });
}

/* ---------- জেলার তথ্য ---------- */
function districtsTab() {
  const d = qs('d') && DIST[qs('d')] ? qs('d') : 'Sylhet', i = dinfo(d);
  return `<p class="mutedline" style="margin-top:-8px">জেলার যাতায়াত ও থাকার তথ্য ওই জেলার সব স্পটের পেজে দেখায়, যদি স্পটের নিজের তথ্য না থাকে।</p>
    <div class="formgrid">${fld('dd', 'জেলা', d, { sel: distOpts() })}<div></div>
    ${fld('dbus', 'বাসে', i.bus, { area: 1 })}${fld('dtrain', 'ট্রেনে', i.train, { area: 1 })}${fld('dlaunch', 'লঞ্চে', i.launch, { area: 1 })}${fld('dair', 'বিমানে', i.air, { area: 1 })}
    ${fld('dstay', 'কোথায় থাকবেন', i.stay, { area: 1, full: 1 })}${fld('dnote', 'বিশেষ সতর্কতা (হলুদ বক্সে দেখাবে)', i.note, { area: 1, rows: 2, full: 1 })}</div>
    <div class="actions start"><button class="btn" id="dsave">সংরক্ষণ করুন</button></div>`;
}
function bindDistricts() {
  const d = qs('d') && DIST[qs('d')] ? qs('d') : 'Sylhet';
  $('#dd').onchange = e => location.href = 'admin.html?t=districts&d=' + encodeURIComponent(e.target.value);
  $('#dsave').onclick = async () => { const o = {}; for (const k of ['bus', 'train', 'launch', 'air', 'stay', 'note']) o[k] = $('#d' + k).value.trim(); try { await B.set('districtInfo/' + d, o); toast(`${DIST[d].bn} জেলার তথ্য সংরক্ষিত হয়েছে।`); } catch (x) { toast(errText(x)); } };
}

/* ---------- সাইট ও লোগো ---------- */
let pendingLogo = null;
function siteTab() {
  const c = cfg();
  return `<div class="formgrid">
    <div class="field full"><label>লোগো</label><div class="logoedit"><img id="lprev" src="${esc(c.logo || SITE.logo)}" alt="বর্তমান লোগো"><div><input id="lfile" type="file" accept="image/*"><small>বর্গাকার PNG বা SVG ভালো দেখায়। ${c.logo ? '<button class="addlink" id="lreset" type="button">ডিফল্ট লোগোতে ফিরুন</button>' : 'এখন ডিফল্ট লোগো (assets/logo.svg) দেখাচ্ছে।'}</small></div></div></div>
    ${fld('sname', 'সাইটের নাম (বাংলা)', c.siteName)}${fld('snameen', 'সাইটের নাম (ইংরেজি)', c.siteNameEn)}
    ${fld('shead', 'হোমপেজের বড় শিরোনাম', c.heroTitle, { full: 1 })}${fld('ssub', 'শিরোনামের নিচের লেখা', c.heroSub, { area: 1, rows: 2, full: 1 })}
    ${fld('snotice', 'ঘোষণা (সাইটের উপরে হলুদ ফিতায়; খালি রাখলে দেখাবে না)', c.notice, { full: 1 })}
    ${fld('sfeat', '"এবারের বাছাই" স্পট (প্রতি লাইনে একটি স্পট আইডি)', (c.featured || []).join('\n'), { area: 1, rows: 8, full: 1, help: 'স্পটের আইডি তার পেজের লিংকের শেষ অংশ, যেমন spot.html?id=sajek-valley হলে sajek-valley' })}</div>
    <div class="actions start"><button class="btn" id="ssave">সংরক্ষণ করুন</button></div>`;
}
function bindSite() {
  pendingLogo = null;
  $('#lfile').onchange = async () => { const f = $('#lfile').files[0]; if (!f) return; $('#lprev').src = URL.createObjectURL(f); pendingLogo = f; };
  const lr = $('#lreset'); if (lr) lr.onclick = async () => { try { await B.merge('site/config', { logo: '' }); toast('ডিফল্ট লোগো ফিরিয়ে আনা হয়েছে।'); drawnTab = null; render(false); } catch (x) { toast(errText(x)); } };
  $('#ssave').onclick = async e => {
    const btn = e.currentTarget, A = allSpots(); const feat = $('#sfeat').value.split(/\s+/).map(x => x.trim()).filter(Boolean); const bad = feat.filter(x => !A.byId.has(x));
    if (bad.length && !confirm(`এই আইডিগুলো পাওয়া যায়নি: ${bad.join(', ')}। এগুলো বাদ দিয়ে সংরক্ষণ করবেন?`)) return;
    btn.disabled = true;
    try {
      const o = { siteName: $('#sname').value.trim(), siteNameEn: $('#snameen').value.trim(), heroTitle: $('#shead').value.trim(), heroSub: $('#ssub').value.trim(), notice: $('#snotice').value.trim(), featured: feat.filter(x => A.byId.has(x)) };
      if (pendingLogo) o.logo = await uploadImage(pendingLogo, { small: true });
      await B.merge('site/config', o); pendingLogo = null; toast('সংরক্ষিত হয়েছে।');
    } catch (x) { toast(errText(x)); }
    btn.disabled = false;
  };
}

/* ---------- অ্যাডমিন তালিকা ---------- */
async function adminsTab() {
  let list = []; try { list = await B.list('admins'); } catch (e) {}
  $('#tabbody').innerHTML = `<p class="mutedline" style="margin-top:-8px">এখানে যোগ করা ইমেইল দিয়ে কেউ অ্যাকাউন্ট খুলে লগইন করলে সে অ্যাডমিন হবে। প্রধান অ্যাডমিন বদলাতে হলে <code>js/config.js</code> আর <code>firestore.rules</code> দুটোতেই ইমেইল বদলান।</p>
    <div class="tblwrap"><table class="table"><thead><tr><th>ইমেইল</th><th>ভূমিকা</th><th></th></tr></thead><tbody>
    <tr><td>${esc(OWNER_EMAIL)}</td><td><span class="pill">প্রধান অ্যাডমিন</span></td><td></td></tr>
    ${list.filter(a => a.id !== OWNER_EMAIL.toLowerCase()).map(a => `<tr><td>${esc(a.id)}</td><td>অ্যাডমিন</td><td><button class="btn danger sm" data-rm="${esc(a.id)}">সরিয়ে দিন</button></td></tr>`).join('')}</tbody></table></div>
    <div class="filters"><input id="newadmin" type="email" placeholder="নতুন অ্যাডমিনের ইমেইল"><button class="btn" id="addadmin">যোগ করুন</button></div>`;
  $('#addadmin').onclick = async () => { const em = $('#newadmin').value.trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(em)) return toast('সঠিক ইমেইল দিন।'); try { await B.set('admins/' + em, { addedBy: D.user.email, at: Date.now() }); toast(`${em} এখন অ্যাডমিন।`); adminsTab(); } catch (x) { toast(errText(x)); } };
  $$('[data-rm]').forEach(b => b.onclick = async () => { if (b.dataset.rm === D.user.email && !confirm('নিজেকে সরালে আপনি আর অ্যাডমিন থাকবেন না। নিশ্চিত?')) return; try { await B.del('admins/' + b.dataset.rm); toast('সরানো হয়েছে।'); adminsTab(); } catch (x) { toast(errText(x)); } });
}

/* ---------- ডেটা ও ব্যাকআপ: এক্সপোর্ট, Firestore খালি করা, রেটিং পুনর্গণনা ---------- */
function download(name, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 0)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
const ovText = () => `${toBn(Object.keys(D.ov).length)}টি স্পটের আর ${toBn(Object.keys(D.dinfo).length)}টি জেলার`;
function dataTab() {
  return `<div class="panel" style="margin-bottom:16px"><h3>১. এক্সপোর্ট করে GitHub-এ তুলুন</h3>
      <p class="mutedline" style="margin-top:0">এখন Firestore-এ <b id="ovc">${ovText()}</b> পরিবর্তন আছে। প্রতিটা ভিজিটে এগুলো পড়তে হয়। এক্সপোর্ট করে GitHub-এ তুললে এগুলো মূল ফাইলের অংশ হয়ে যায়।</p>
      <div class="adminbar"><button class="btn" id="exS">spots.json ডাউনলোড</button><button class="btn ghost" id="exI">district-info.json ডাউনলোড</button></div>
      <ol class="mutedline" style="margin:12px 0 0;padding-left:1.3rem;line-height:1.9"><li>দুটো ফাইল ডাউনলোড করুন।</li><li>GitHub-এ রিপোজিটরির <code>data</code> ফোল্ডারে যান → <b>Add file → Upload files</b> → দুটো ফাইল ছাড়ুন (একই নামের পুরোনো ফাইল বদলে যাবে) → <b>Commit changes</b>।</li><li>২–৩ মিনিট পর নিচের ধাপ ২ করুন।</li></ol></div>
    <div class="panel" style="margin-bottom:16px"><h3>২. যাচাই করে Firestore খালি করুন</h3>
      <p class="mutedline" style="margin-top:0">সাইটে প্রকাশিত ফাইলে সব পরিবর্তন পৌঁছেছে কিনা যাচাই করা হবে। মিললে তবেই Firestore-এর স্পট ও জেলার পরিবর্তনগুলো মুছে ফেলা যাবে; ভিজিটররা কোনো পার্থক্য দেখবেন না। ছবি, টিপস, রেটিং ও জমা পড়া অবদান কখনো মোছা হয় না।</p>
      <div class="adminbar"><button class="btn" id="vfy">যাচাই করুন</button><button class="btn danger" id="clr" disabled>Firestore-এর পরিবর্তন খালি করুন</button></div>
      <p id="vres" class="mutedline"></p></div>
    <div class="panel"><h3>৩. রেটিং পুনর্গণনা</h3>
      <p class="mutedline" style="margin-top:0">রেটিংয়ের মোট হিসাব সাধারণত নিজে থেকেই ঠিক থাকে। কোনো স্পটের রেটিং ভুল মনে হলে সব ব্যবহারকারীর রেটিং আবার গুনে হিসাবটা নতুন করে লেখা যায়। এতে একবার সব রেটিং ডকুমেন্ট পড়তে হয়, তাই দরকার ছাড়া চাপবেন না।</p>
      <button class="btn ghost" id="rcp">রেটিং আবার গুনুন</button></div>`;
}
function bindData() {
  $('#exS').onclick = () => { download('spots.json', buildExport().spots); toast('spots.json ডাউনলোড হয়েছে।'); };
  $('#exI').onclick = () => { download('district-info.json', buildExport().info); toast('district-info.json ডাউনলোড হয়েছে।'); };
  let fresh = null;
  $('#vfy').onclick = async e => {
    const btn = e.currentTarget, res = $('#vres'); btn.disabled = true; $('#clr').disabled = true; res.textContent = 'প্রকাশিত ফাইল আনা হচ্ছে…';
    try {
      const v = Date.now();
      const [s, i] = await Promise.all([fetch('data/spots.json?v=' + v, { cache: 'no-store' }).then(r => r.json()), fetch('data/district-info.json?v=' + v, { cache: 'no-store' }).then(r => r.json())]);
      const ex = buildExport(), okS = sameSpots(s, ex.spots), okI = sameInfo(i, ex.info);
      if (okS && okI) { fresh = { s, i }; res.innerHTML = '✅ প্রকাশিত ফাইলে সব পরিবর্তন আছে। এখন Firestore খালি করা নিরাপদ।'; $('#clr').disabled = !(Object.keys(D.ov).length || Object.keys(D.dinfo).length); }
      else res.innerHTML = `❌ এখনো মেলেনি: ${okS ? '' : 'spots.json '}${okI ? '' : 'district-info.json'}। ফাইল GitHub-এ তুলেছেন তো? তুলে থাকলে ২–৩ মিনিট পর আবার চেষ্টা করুন। এর মধ্যে কোনো অ্যাডমিন নতুন সম্পাদনা করলে আবার এক্সপোর্ট করতে হবে।`;
    } catch (x) { res.textContent = 'ফাইল আনা যায়নি: ' + (x.message || x); }
    btn.disabled = false;
  };
  $('#clr').onclick = async e => {
    if (!fresh || !confirm('Firestore-এর সব স্পট ও জেলার পরিবর্তন মুছে ফেলবেন? প্রকাশিত ফাইলে এগুলো আগেই আছে।')) return;
    const btn = e.currentTarget, res = $('#vres'); btn.disabled = true;
    D.base = fresh.s; D.info = fresh.i; D.ver++;     /* এই পেজেও নতুন ফাইল ধরে নেওয়া, যাতে কিছু উধাও না দেখায় */
    const ids = Object.keys(D.ov), ds = Object.keys(D.dinfo); let done = 0;
    try {
      for (const id of ids) { await B.del('spots/' + id); res.textContent = `মোছা হচ্ছে… ${toBn(++done)}/${toBn(ids.length + ds.length)}`; }
      for (const d of ds) { await B.del('districtInfo/' + d); res.textContent = `মোছা হচ্ছে… ${toBn(++done)}/${toBn(ids.length + ds.length)}`; }
      res.textContent = '✅ সম্পন্ন। Firestore এখন শুধু নতুন পরিবর্তনগুলো রাখবে।'; fresh = null;
    } catch (x) { res.textContent = 'মাঝপথে থেমে গেছে: ' + errText(x) + '। আবার যাচাই করে চালান।'; }
  };
  $('#rcp').onclick = async e => {
    const btn = e.currentTarget; btn.disabled = true;
    try { const r = await recomputeStats(); toast(`${toBn(r.users)} জনের রেটিং থেকে ${toBn(r.spots)}টি স্পটের হিসাব নতুন করে লেখা হয়েছে।`); }
    catch (x) { toast(errText(x)); }
    btn.disabled = false;
  };
}

function render(live) {
  if (!D.user || !D.user.isAdmin) { drawnTab = null; return gate(); }
  const t = tabNow();
  if (live && drawnTab === t && t === 'data') { const c = $('#ovc'); if (c) c.textContent = ovText(); return; }
  if (live && drawnTab === t && ['districts', 'site', 'admins'].includes(t)) return;   /* ফর্ম লেখার মাঝে মুছে যাবে না */
  drawnTab = t;
  $('#view').innerHTML = `<div class="wrap">${tabs(t)}<div id="tabbody"></div></div>`;
  if (t === 'queue') { $('#tabbody').innerHTML = queue(); bindQueue(); }
  else if (t === 'spots') { $('#tabbody').innerHTML = spotsTab(); bindSpots(); }
  else if (t === 'districts') { $('#tabbody').innerHTML = districtsTab(); bindDistricts(); }
  else if (t === 'site') { $('#tabbody').innerHTML = siteTab(); bindSite(); }
  else if (t === 'data') { $('#tabbody').innerHTML = dataTab(); bindData(); }
  else if (t === 'admins') { $('#tabbody').innerHTML = '<p class="mutedline">লোড হচ্ছে…</p>'; adminsTab(); }
}
boot('admin', render);
