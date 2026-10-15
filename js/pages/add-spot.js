import { D, DIST, CATS, dinfo } from '../data.js';
import { B, errText } from '../backend.js';
import { $, esc, qs, toast, spotUrl } from '../ui.js';
import { uploadImage } from '../upload.js';
import { submit, publish } from '../contribute.js';
import { mountPicker } from '../picker.js';
import { boot } from '../page.js';
import { fld, distOpts } from '../form.js';

let drawn = false;
function render(live) {
  if (live && drawn) return;               /* ফর্ম একবারই আঁকা হয়, যাতে লেখা মুছে না যায় */
  if (!B.demo && !D.userKnown) { $('#view').innerHTML = '<div class="wrap"><p class="mutedline" style="padding:40px 0">লোড হচ্ছে…</p></div>'; return; }
  if (!B.demo && !D.user) {
    $('#view').innerHTML = `<div class="wrap"><div class="gate"><h1>নতুন স্পট প্রস্তাব করুন</h1><p>আপনার জানা কোনো দর্শনীয় জায়গা তালিকায় নেই? লগইন করে প্রস্তাব দিন, অ্যাডমিন যাচাই করে যোগ করবেন।</p><a class="btn" href="login.html?next=${encodeURIComponent('add-spot.html' + location.search)}">লগইন / অ্যাকাউন্ট খুলুন</a></div></div>`;
    return;
  }
  drawn = true;
  const admin = D.user?.isAdmin, d0 = qs('d') && DIST[qs('d')] ? qs('d') : 'Dhaka';
  $('#view').innerHTML = `<div class="wrap narrow"><div class="pagehead"><h1>নতুন স্পট প্রস্তাব করুন</h1>
    <p class="mutedline">${admin ? 'আপনি অ্যাডমিন, তাই স্পটটি সরাসরি যোগ হবে।' : 'জমা দেওয়ার পর অ্যাডমিন যাচাই করে প্রকাশ করবেন। তারকা চিহ্নিত ঘরগুলো বাধ্যতামূলক।'}</p></div>
    <form id="f" class="formgrid" novalidate>
      ${fld('n-bn', 'নাম (বাংলায়) *', '', { req: 1, ph: 'যেমন: নীলাচল' })}${fld('n-en', 'নাম (ইংরেজিতে) *', '', { req: 1, ph: 'যেমন: Nilachal' })}
      ${fld('n-d', 'জেলা *', d0, { sel: distOpts() })}${fld('n-c', 'ধরন *', 'nature', { sel: Object.entries(CATS) })}
      <div class="field full"><label>ম্যাপে জায়গাটির উপর ক্লিক করুন *</label><div class="picker" id="picker"></div><small>পিনটি টেনে সরানো যায়। জেলার সীমানা সবুজ রেখায় দেখানো।</small></div>
      ${fld('n-lat', 'অক্ষাংশ (latitude)', '', { type: 'number' })}${fld('n-lng', 'দ্রাঘিমাংশ (longitude)', '', { type: 'number' })}
      ${fld('n-t', 'এক লাইনে পরিচিতি *', '', { full: 1, ph: 'যেমন: পাহাড়চূড়া থেকে শহর আর সূর্যাস্তের দৃশ্য' })}
      ${fld('n-desc', 'বিস্তারিত বর্ণনা', '', { area: 1, rows: 5, full: 1 })}
      ${fld('n-hours', 'খোলার সময়সূচী', '', { ph: 'জানা থাকলে' })}${fld('n-fee', 'প্রবেশ ফি', '', { ph: 'জানা থাকলে' })}
      ${fld('n-local', 'জেলা সদর থেকে কীভাবে যাবেন', '', { area: 1, full: 1 })}
      ${fld('n-stay', 'আশপাশে কোথায় থাকা যায়', '', { area: 1, full: 1, ph: dinfo(d0).stay || '' })}
      <div class="field full"><label for="n-photo">একটি ছবি (ঐচ্ছিক, কভার হিসেবে ব্যবহার হবে)</label><input id="n-photo" type="file" accept="image/*"><div class="preview" id="n-prev"></div></div>
      <div class="actions full" style="justify-content:flex-start"><button class="btn" id="n-go" type="submit">${admin ? 'স্পট যোগ করুন' : 'প্রস্তাব জমা দিন'}</button><a class="btn ghost" href="index.html">বাতিল</a></div>
    </form></div>`;
  const pk = mountPicker($('#picker'), $('#n-lat'), $('#n-lng'), () => $('#n-d').value);
  $('#n-d').onchange = async () => { (await pk)?.showDistrict(); $('#n-stay').placeholder = dinfo($('#n-d').value).stay || ''; };
  $('#n-photo').onchange = () => { const f = $('#n-photo').files[0]; if (f) $('#n-prev').innerHTML = `<img src="${URL.createObjectURL(f)}" alt="">`; };
  $('#f').onsubmit = async e => {
    e.preventDefault(); const g = i => $('#' + i).value.trim();
    const n = { bn: g('n-bn'), en: g('n-en'), d: g('n-d'), c: g('n-c'), lat: parseFloat(g('n-lat')), lng: parseFloat(g('n-lng')), t: g('n-t'), desc: g('n-desc'), hours: g('n-hours'), fee: g('n-fee'), stay: g('n-stay'), go: { local: g('n-local') } };
    if (!n.bn || !n.en || !n.t) return toast('নাম (বাংলা ও ইংরেজি) আর এক লাইনের পরিচিতি দিন।');
    if (!(n.lat > 20 && n.lat < 27 && n.lng > 87.9 && n.lng < 92.8)) return toast('ম্যাপে ক্লিক করে জায়গাটি দেখিয়ে দিন।');
    for (const k of Object.keys(n)) if (n[k] === '') delete n[k];
    if (!n.go.local) delete n.go.local;
    const btn = $('#n-go'); btn.disabled = true; btn.textContent = 'পাঠানো হচ্ছে…';
    try {
      const f = $('#n-photo').files[0]; const coverRef = f ? await uploadImage(f, { small: true }) : '';
      const item = { type: 'spot', newSpot: n, ...(coverRef ? { cover: coverRef } : {}) };
      if (admin) { const id = await publish({ ...item, by: D.user.uid, byName: D.user.name }); toast('স্পট যোগ হয়েছে।'); setTimeout(() => location.href = spotUrl(id), 600); }
      else { await submit(item); $('#view').innerHTML = `<div class="wrap"><div class="gate"><h1>ধন্যবাদ!</h1><p>"${esc(n.bn)}" প্রস্তাবটি জমা হয়েছে। অ্যাডমিন অনুমোদন দিলে এটি সাইটে দেখা যাবে।</p><div class="actions" style="justify-content:flex-start"><a class="btn" href="add-spot.html">আরেকটি প্রস্তাব</a><a class="btn ghost" href="index.html">হোমে ফিরুন</a></div></div></div>`; }
    } catch (x) { toast(errText(x)); btn.disabled = false; btn.textContent = admin ? 'স্পট যোগ করুন' : 'প্রস্তাব জমা দিন'; }
  };
}
boot('add', render, { ratings: false, ignore: ['spots', 'dinfo', 'cfg'] });
