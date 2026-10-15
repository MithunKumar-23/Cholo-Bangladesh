/* ব্যবহারকারীর অবদান (অনুমোদনের জন্য জমা) আর অ্যাডমিনের সরাসরি প্রকাশ */
import { B, errText } from './backend.js';
import { D, FIELDS, allSpots, editable, saveSpot, setCover, slugify } from './data.js';
import { $, $$, esc, toast, openModal } from './ui.js';
import { uploadImage, uploadVideo, hasCloud, dataUrlToFile } from './upload.js';

export function needLogin(msg = 'এই কাজের জন্য লগইন করতে হবে।') {
  if (B.demo) { toast('ডেমো মোডে এটি বন্ধ। js/config.js-এ Firebase সেটআপ করুন।'); return true; }
  if (D.user) return false;
  openModal(`<h2>লগইন করুন</h2><p class="lead">${esc(msg)} অ্যাকাউন্ট না থাকলে এক মিনিটে খুলে নিন।</p>
    <div class="actions"><button class="btn ghost" data-close>পরে</button><a class="btn" href="login.html?next=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}">লগইন / অ্যাকাউন্ট খুলুন</a></div>`);
  return true;
}
const who = () => ({ by: D.user.uid, byName: D.user.name || 'একজন ভ্রমণকারী', at: Date.now() });

/* অনুমোদনের জন্য জমা */
export async function submit(item) { return B.add('submissions', { ...item, ...who(), status: 'pending' }); }

/* প্রকাশ: অ্যাডমিন সরাসরি দিলে বা জমা অনুমোদন করলে */
export async function publish(it, mode) {
  const base = { spot: it.spot, by: it.by || D.user.uid, byName: it.byName || D.user.name, at: Date.now() };
  if (it.type === 'photo') {
    let ref = it.url || it.data;
    if (it.data && hasCloud()) { try { ref = await uploadImage(dataUrlToFile(it.data)); } catch (e) {} }
    await B.add('media', { ...base, kind: 'photo', caption: it.caption || '', ...(ref.startsWith('data:') ? { data: ref } : { url: ref }) });
    if (it.asCover) await setCover(it.spot, ref.startsWith('data:') ? ref : ref);
  } else if (it.type === 'video') await B.add('media', { ...base, kind: 'video', url: it.url, caption: it.caption || '' });
  else if (it.type === 'vlink') await B.add('media', { ...base, kind: 'vlink', url: it.url, caption: it.caption || '' });
  else if (it.type === 'info' && mode !== 'tip') {
    const s = allSpots().byId.get(it.spot); if (!s) throw new Error('স্পটটি আর নেই।');
    const e = editable(s); if (it.field.startsWith('go.')) e.go = { ...e.go, [it.field.slice(3)]: it.text }; else e[it.field] = it.text;
    await saveSpot(s.id, e);
  } else if (it.type === 'spot') {
    const n = it.newSpot || {}; const A = allSpots(); let id = slugify(n.en || n.bn), k = 2; while (A.byId.has(id)) id = slugify(n.en || n.bn) + '-' + k++;
    const o = { ...n, custom: true, addedBy: it.by || '', addedByName: it.byName || '' };
    if (it.cover && !it.cover.startsWith('data:')) o.cover = it.cover;
    await saveSpot(id, o);
    if (it.cover && it.cover.startsWith('data:')) { D.ov[id] = o; D.ver++; await setCover(id, it.cover); }
    return id;
  } else {
    const prefix = it.field && FIELDS[it.field] ? FIELDS[it.field] + ': ' : '';
    await B.add('tips', { ...base, text: prefix + it.text });
  }
}

/* ক্যামেরা বোতাম (কার্ড ও স্পট পেজের ছবির উপর) */
export function bindCameras() {
  if (window.__camBound) return; window.__camBound = true;
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-cam]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const s = allSpots().byId.get(b.dataset.cam); if (!s || needLogin('ছবি যোগ করতে লগইন করুন।')) return;
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return; b.disabled = true; b.classList.add('busy');
      try {
        const ref = await uploadImage(f, { small: !hasCloud() });
        if (D.user.isAdmin) { await setCover(s.id, ref); await B.add('media', { spot: s.id, kind: 'photo', caption: '', ...who(), ...(ref.startsWith('data:') ? { data: ref } : { url: ref }) }); toast(`${s.bn}-এর কভার ছবি বদলানো হয়েছে।`); }
        else { await submit({ type: 'photo', spot: s.id, asCover: true, caption: '', ...(ref.startsWith('data:') ? { data: ref } : { url: ref }) }); toast('ধন্যবাদ! অ্যাডমিন অনুমোদন দিলে ছবিটি দেখা যাবে।'); }
      } catch (err) { toast(errText(err)); }
      b.disabled = false; b.classList.remove('busy');
    };
    inp.click();
  }, true);
}

/* রেটিং */
export async function rate(id, n) {
  if (needLogin('রেটিং দিতে লগইন করুন।')) return;
  try { await B.rate(id, n); toast('ধন্যবাদ! আপনার রেটিং সংরক্ষিত হয়েছে।'); }
  catch (e) { toast(errText(e)); }
}

/* অবদানের ফর্ম */
export function openContrib(s, kind = 'info', field) {
  if (needLogin('অবদান রাখতে লগইন করুন।')) return;
  const admin = D.user.isAdmin; let k = kind;
  const tabs = [['photo', 'ছবি'], ['video', 'ভিডিও'], ['info', 'তথ্য'], ['tip', 'টিপস']];
  openModal(`<h2>${esc(s.bn)}: অবদান রাখুন</h2><p class="lead">${admin ? 'আপনি অ্যাডমিন, তাই এটি সরাসরি প্রকাশিত হবে।' : 'জমা দেওয়ার পর অ্যাডমিন যাচাই করে প্রকাশ করবেন।'}</p>
    <div class="tabs" role="tablist">${tabs.map(([v, l]) => `<button class="tab" data-k="${v}" aria-selected="${v === k}">${l}</button>`).join('')}</div><div id="cform"></div>`,
  (box, close) => {
    const draw = () => {
      $$('.tab', box).forEach(b => b.setAttribute('aria-selected', b.dataset.k === k));
      const f = $('#cform', box);
      if (k === 'photo') f.innerHTML = `<div class="field"><label for="cf-file">ছবি বেছে নিন</label><input id="cf-file" type="file" accept="image/*"><div class="preview" id="cf-prev"></div></div><div class="field"><label for="cf-cap">ক্যাপশন (ঐচ্ছিক)</label><input id="cf-cap" maxlength="140" placeholder="যেমন: ভোরবেলার কুয়াশা"></div><label class="check"><input type="checkbox" id="cf-cover"> ${admin ? 'এটিকে কভার ছবি বানান' : 'কভার ছবি হিসেবে প্রস্তাব করুন'}</label>`;
      else if (k === 'video') f.innerHTML = `${hasCloud() ? `<div class="field"><label for="cf-vfile">ভিডিও ফাইল (১০০ MB পর্যন্ত)</label><input id="cf-vfile" type="file" accept="video/*"></div><p class="mutedline">অথবা</p>` : ''}<div class="field"><label for="cf-url">ভিডিওর লিংক</label><input id="cf-url" type="url" placeholder="https://www.youtube.com/watch?v=…"><small>YouTube, Facebook বা অন্য যেকোনো লিংক।</small></div><div class="field"><label for="cf-cap">শিরোনাম (ঐচ্ছিক)</label><input id="cf-cap" maxlength="140"></div>`;
      else if (k === 'info') f.innerHTML = `<div class="field"><label for="cf-field">কোন তথ্য?</label><select id="cf-field">${Object.entries(FIELDS).map(([v, l]) => `<option value="${v}" ${v === field ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="field"><label for="cf-text">সঠিক তথ্য লিখুন</label><textarea id="cf-text" maxlength="3000" placeholder="যেমন: প্রতিদিন সকাল ৯টা–বিকেল ৫টা, রবিবার বন্ধ"></textarea><small>কবে বা কোথা থেকে জেনেছেন লিখলে যাচাই সহজ হয়।</small></div>`;
      else f.innerHTML = `<div class="field"><label for="cf-text">আপনার টিপস</label><textarea id="cf-text" maxlength="1500" placeholder="যেমন: সকাল ৭টার আগে গেলে ভিড় কম থাকে"></textarea></div>`;
      f.insertAdjacentHTML('beforeend', `<div class="actions"><button class="btn ghost" data-close>বাতিল</button><button class="btn" id="cf-go">${admin ? 'প্রকাশ করুন' : 'জমা দিন'}</button></div>`);
      $$('[data-close]', f).forEach(b => b.onclick = close);
      const fi = $('#cf-file', f); if (fi) fi.onchange = () => { const x = fi.files[0]; if (x) $('#cf-prev', f).innerHTML = `<img src="${URL.createObjectURL(x)}" alt="">`; };
      $('#cf-go', f).onclick = async e => {
        const b = e.currentTarget; b.disabled = true; b.textContent = 'পাঠানো হচ্ছে…';
        try { await send(s, k, f); close(); }
        catch (err) { b.disabled = false; b.textContent = admin ? 'প্রকাশ করুন' : 'জমা দিন'; toast(errText(err)); }
      };
    };
    $$('.tab', box).forEach(b => b.onclick = () => { k = b.dataset.k; draw(); });
    draw();
  });
}
async function send(s, k, f) {
  const v = id => ($('#' + id, f)?.value || '').trim();
  const it = { type: k, spot: s.id };
  if (k === 'photo') {
    const file = $('#cf-file', f).files[0]; if (!file) throw new Error('একটি ছবি বেছে নিন।');
    const ref = await uploadImage(file); it.caption = v('cf-cap'); it.asCover = $('#cf-cover', f).checked;
    if (ref.startsWith('data:')) it.data = ref; else it.url = ref;
  } else if (k === 'video') {
    const vf = $('#cf-vfile', f)?.files?.[0]; it.caption = v('cf-cap');
    if (vf) it.url = await uploadVideo(vf);
    else { const u = v('cf-url'); if (!/^https?:\/\/\S+\.\S+/.test(u)) throw new Error('একটি সঠিক লিংক দিন (https:// দিয়ে শুরু)।'); it.url = u; it.type = 'vlink'; }
  } else if (k === 'info') { it.field = v('cf-field'); it.text = v('cf-text'); if (it.text.length < 3) throw new Error('তথ্যটি লিখুন।'); }
  else { it.text = v('cf-text'); if (it.text.length < 3) throw new Error('টিপসটি লিখুন।'); }
  if (D.user.isAdmin) { await publish({ ...it, ...who() }, 'apply'); toast('প্রকাশিত হয়েছে।'); }
  else { await submit(it); toast('ধন্যবাদ! অ্যাডমিন অনুমোদন দিলে এটি প্রকাশিত হবে।'); }
}
