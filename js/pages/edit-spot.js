import { D, CATS, allSpots, dinfo, saveSpot, setCover, slugify } from '../data.js';
import { B, errText } from '../backend.js';
import { $, esc, qs, toast, spotUrl, cover } from '../ui.js';
import { uploadImage } from '../upload.js';
import { mountPicker } from '../picker.js';
import { fld, distOpts } from '../form.js';
import { boot } from '../page.js';

let drawn = false;
function render(live) {
  if (!D.user || !D.user.isAdmin) { drawn = false; $('#view').innerHTML = `<div class="wrap"><div class="gate"><h1>শুধু অ্যাডমিনের জন্য</h1><p>${D.userKnown || B.demo ? 'এই পেজ খুলতে অ্যাডমিন হিসেবে লগইন করুন।' : 'যাচাই করা হচ্ছে…'}</p><a class="btn" href="login.html?next=${encodeURIComponent('edit-spot.html' + location.search)}">লগইন</a></div></div>`; return; }
  const A = allSpots(), id = qs('id'), isNew = !id;
  const s = isNew ? { d: 'Dhaka', c: 'nature', go: {} } : A.byId.get(id);
  if (!s) { if (!D.liveReady) return; $('#view').innerHTML = '<div class="wrap"><div class="gate"><h1>স্পট পাওয়া যায়নি</h1><a class="btn" href="admin.html?t=spots">ফিরে যান</a></div></div>'; return; }
  if (live && drawn) return;
  drawn = true;
  const di = dinfo(s.d);
  $('#view').innerHTML = `<div class="wrap narrow"><div class="pagehead"><a class="more" href="admin.html?t=spots">← সব স্পট</a><h1>${isNew ? 'নতুন স্পট' : esc(s.bn) + ' সম্পাদনা'}</h1></div>
   <form id="f" class="formgrid" novalidate>
    <div class="field full"><label>কভার ছবি</label><div class="coveredit"><div class="cprev" id="cprev">${cover(s)}</div><div><input id="e-cover" type="file" accept="image/*"><small>কার্ড আর স্পট পেজের বড় ছবি এটাই।${s.cover ? ' <button class="addlink" id="e-nocover" type="button">ছবি সরিয়ে আঁকা ছবিতে ফিরুন</button>' : ''}</small></div></div></div>
    ${fld('e-bn', 'নাম (বাংলা) *', s.bn)}${fld('e-en', 'নাম (ইংরেজি) *', s.en, { help: isNew ? 'এখান থেকেই পেজের লিংক তৈরি হবে' : '' })}
    ${fld('e-d', 'জেলা *', s.d, { sel: distOpts() })}${fld('e-c', 'ধরন *', s.c, { sel: Object.entries(CATS) })}
    <div class="field full"><label>অবস্থান (ম্যাপে ক্লিক করুন বা পিন টানুন)</label><div class="picker" id="picker"></div></div>
    ${fld('e-lat', 'অক্ষাংশ (latitude) *', s.lat, { type: 'number' })}${fld('e-lng', 'দ্রাঘিমাংশ (longitude) *', s.lng, { type: 'number' })}
    ${fld('e-t', 'এক লাইনের পরিচিতি', s.t, { full: 1 })}${fld('e-desc', 'বিস্তারিত বর্ণনা', s.desc, { area: 1, rows: 7, full: 1 })}
    ${fld('e-hours', 'খোলার সময়সূচী', s.hours, { area: 1, rows: 2 })}${fld('e-fee', 'প্রবেশ ফি', s.fee, { area: 1, rows: 2 })}
    ${fld('e-best', 'যাওয়ার উপযুক্ত সময়', s.best, { full: 1 })}
    ${fld('e-bus', 'বাসে (খালি রাখলে জেলার তথ্য দেখাবে)', s.go.bus, { area: 1, rows: 2, ph: di.bus })}${fld('e-train', 'ট্রেনে', s.go.train, { area: 1, rows: 2, ph: di.train })}
    ${fld('e-launch', 'লঞ্চে', s.go.launch, { area: 1, rows: 2, ph: di.launch })}${fld('e-air', 'বিমানে', s.go.air, { area: 1, rows: 2, ph: di.air })}
    ${fld('e-local', 'শেষ ধাপ (জেলা সদর থেকে)', s.go.local, { area: 1, rows: 2, full: 1 })}
    ${fld('e-stay', 'কোথায় থাকবেন (খালি রাখলে জেলার তথ্য দেখাবে)', s.stay, { area: 1, rows: 3, full: 1, ph: di.stay })}
    ${fld('e-alt', 'বিকল্প নাম/বানান (কমা দিয়ে; সার্চে কাজে লাগে)', (s.alt || []).join(', '), { full: 1 })}
    <div class="actions full start"><button class="btn" id="esave" type="submit">সংরক্ষণ করুন</button><a class="btn ghost" href="${isNew ? 'admin.html?t=spots' : spotUrl(s.id)}">বাতিল</a></div>
   </form></div>`;
  let newCover = null, removeCover = false;
  const pk = mountPicker($('#picker'), $('#e-lat'), $('#e-lng'), () => $('#e-d').value);
  $('#e-d').onchange = async () => { (await pk)?.showDistrict(); const d2 = dinfo($('#e-d').value); for (const k of ['bus', 'train', 'launch', 'air']) $('#e-' + k).placeholder = d2[k] || ''; $('#e-stay').placeholder = d2.stay || ''; };
  $('#e-cover').onchange = () => { const f = $('#e-cover').files[0]; if (f) { newCover = f; removeCover = false; $('#cprev').innerHTML = `<img class="cover" src="${URL.createObjectURL(f)}" alt="">`; } };
  const nc = $('#e-nocover'); if (nc) nc.onclick = () => { removeCover = true; newCover = null; $('#cprev').innerHTML = cover({ ...s, cover: '' }); };
  $('#f').onsubmit = async e => {
    e.preventDefault(); const g = i => $('#' + i).value.trim(), btn = $('#esave');
    const o = { bn: g('e-bn'), en: g('e-en'), d: g('e-d'), c: g('e-c'), lat: parseFloat(g('e-lat')), lng: parseFloat(g('e-lng')), t: g('e-t'), desc: g('e-desc'), hours: g('e-hours'), fee: g('e-fee'), best: g('e-best'), stay: g('e-stay'),
      alt: g('e-alt').split(',').map(x => x.trim()).filter(Boolean), go: { bus: g('e-bus'), train: g('e-train'), launch: g('e-launch'), air: g('e-air'), local: g('e-local') } };
    if (!o.bn || !o.en) return toast('বাংলা ও ইংরেজি নাম দিন।');
    if (!(o.lat > 20 && o.lat < 27 && o.lng > 87.9 && o.lng < 92.8)) return toast('স্থানাঙ্ক বাংলাদেশের ভেতরে হতে হবে। ম্যাপে ক্লিক করে বেছে নিন।');
    for (const k of Object.keys(o)) if (o[k] === '' || (Array.isArray(o[k]) && !o[k].length)) delete o[k];
    for (const k of Object.keys(o.go)) if (!o.go[k]) delete o.go[k];
    let sid = s.id;
    if (isNew) { sid = slugify(o.en); let n = 2; while (A.byId.has(sid)) sid = slugify(o.en) + '-' + n++; o.custom = true; }
    else { if (s.cover && !removeCover) o.cover = s.cover; if (s.custom) { o.custom = true; if (s.addedByName) o.addedByName = s.addedByName; } if (s.ok) o.ok = true; if (s.deleted) o.deleted = true; }
    if (!isNew && (o.lat !== s.lat || o.lng !== s.lng)) o.ok = true;
    btn.disabled = true; btn.textContent = 'সংরক্ষণ হচ্ছে…';
    try {
      await saveSpot(sid, o);
      if (newCover) { D.ov[sid] = o; D.ver++; await setCover(sid, await uploadImage(newCover, { small: true })); }
      toast('সংরক্ষিত হয়েছে।'); setTimeout(() => location.href = spotUrl(sid), 500);
    } catch (x) { toast(errText(x)); btn.disabled = false; btn.textContent = 'সংরক্ষণ করুন'; }
  };
}
boot('admin', render, { ratings: false });
