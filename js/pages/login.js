import { D } from '../data.js';
import { B, errText } from '../backend.js';
import { $, $$, esc, qs, toast } from '../ui.js';
import { boot } from '../page.js';

const next = () => { const n = qs('next'); return /^[a-z-]+\.html(\?.*)?$/i.test(n) ? n : 'index.html'; };
let mode = 'login';

function render(live) {
  if (live && document.activeElement && $('#view').contains(document.activeElement)) return;
  if (B.demo) {
    $('#view').innerHTML = `<div class="wrap"><div class="gate"><h1>লগইন এখনো চালু হয়নি</h1><p>সাইটটি ডেমো মোডে চলছে। লগইন চালু করতে <code>js/config.js</code> ফাইলে Firebase-এর তথ্য বসান। কীভাবে করবেন তা README.md ফাইলে ধাপে ধাপে লেখা আছে।</p><a class="btn ghost" href="index.html">হোমে ফিরুন</a></div></div>`;
    return;
  }
  if (!D.userKnown) { $('#view').innerHTML = '<div class="wrap"><p class="mutedline" style="padding:40px 0">লোড হচ্ছে…</p></div>'; return; }
  if (D.user) {
    $('#view').innerHTML = `<div class="wrap"><div class="gate"><h1>আপনি লগইন করা আছেন</h1>
      <p><b>${esc(D.user.name)}</b> (${esc(D.user.email)})${D.user.isAdmin ? ' · <span class="pill">অ্যাডমিন</span>' : ''}</p>
      <div class="actions" style="justify-content:flex-start"><a class="btn" href="${esc(next())}">এগিয়ে যান</a>${D.user.isAdmin ? '<a class="btn ghost" href="admin.html">অ্যাডমিন প্যানেল</a>' : ''}<button class="btn ghost" id="lo">লগআউট</button></div></div></div>`;
    $('#lo').onclick = () => B.logout();
    return;
  }
  const T = { login: ['লগইন', 'আপনার ইমেইল ও পাসওয়ার্ড দিন। অ্যাডমিনরাও এখান থেকেই লগইন করবেন।'], register: ['নতুন অ্যাকাউন্ট', 'রেটিং দিতে, ছবি বা নতুন স্পট যোগ করতে একটি অ্যাকাউন্ট খুলুন।'], reset: ['পাসওয়ার্ড ভুলে গেছেন?', 'ইমেইল দিন, পাসওয়ার্ড বদলানোর লিংক পাঠানো হবে।'] }[mode];
  $('#view').innerHTML = `<div class="wrap"><div class="gate auth">
    <div class="tabs" role="tablist"><button class="tab" data-m="login" aria-selected="${mode === 'login'}">লগইন</button><button class="tab" data-m="register" aria-selected="${mode === 'register'}">অ্যাকাউন্ট খুলুন</button></div>
    <h1>${T[0]}</h1><p class="mutedline">${T[1]}</p>
    <form id="af" novalidate>
      ${mode === 'register' ? `<div class="field"><label for="a-name">আপনার নাম</label><input id="a-name" autocomplete="name" required></div>` : ''}
      <div class="field"><label for="a-email">ইমেইল</label><input id="a-email" type="email" autocomplete="email" required></div>
      ${mode !== 'reset' ? `<div class="field"><label for="a-pw">পাসওয়ার্ড</label><input id="a-pw" type="password" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}" minlength="6" required>${mode === 'register' ? '<small>অন্তত ৬ অক্ষর</small>' : ''}</div>` : ''}
      <div class="actions" style="justify-content:space-between;align-items:center">
        ${mode === 'login' ? '<button type="button" class="addlink" data-m="reset">পাসওয়ার্ড ভুলে গেছেন?</button>' : mode === 'reset' ? '<button type="button" class="addlink" data-m="login">← লগইনে ফিরুন</button>' : '<span></span>'}
        <button class="btn" id="a-go" type="submit">${mode === 'login' ? 'লগইন করুন' : mode === 'register' ? 'অ্যাকাউন্ট খুলুন' : 'লিংক পাঠান'}</button></div>
    </form></div></div>`;
  $$('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; render(false); });
  $('#af').onsubmit = async e => {
    e.preventDefault(); const email = $('#a-email').value, pw = $('#a-pw')?.value || '', btn = $('#a-go');
    if (!email) return toast('ইমেইল দিন।');
    btn.disabled = true;
    try {
      if (mode === 'login') { await B.login(email, pw); toast('স্বাগতম!'); location.href = next(); }
      else if (mode === 'register') { const nm = $('#a-name').value.trim(); if (!nm) { btn.disabled = false; return toast('আপনার নাম দিন।'); } await B.register(nm, email, pw); toast('অ্যাকাউন্ট খোলা হয়েছে।'); location.href = next(); }
      else { await B.reset(email); toast('ইমেইলে লিংক পাঠানো হয়েছে। স্প্যাম ফোল্ডারও দেখুন।'); mode = 'login'; render(false); }
    } catch (x) { toast(errText(x)); btn.disabled = false; }
  };
}
boot('login', render, { ratings: false, ignore: ['spots', 'dinfo', 'cfg'] });
