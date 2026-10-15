/* প্রতিটা পেজ এখান থেকে শুরু হয়: ডেটা লোড, হেডার/ফুটার, লাইভ আপডেট */
import { D, loadStatic, startLive } from './data.js';
import { B } from './backend.js';
import { $, renderHeader, renderFooter, liveRenderer, loadCovers } from './ui.js';
import { bindCameras } from './contribute.js';

export const subs = { list: [] };   // অ্যাডমিনের জন্য অপেক্ষমাণ জমা
let unsubSubs = null;

export async function boot(active, render, opts = {}) {
  try { await loadStatic(); }
  catch (e) {
    $('#view').innerHTML = `<div class="wrap"><div class="gate"><h1>ডেটা লোড হয়নি</h1><p>ফাইলটি সরাসরি (file://) খুললে ব্রাউজার ডেটা পড়তে দেয় না। GitHub Pages-এ বা একটা লোকাল সার্ভার দিয়ে খুলুন, যেমন VS Code-এর "Live Server" বা টার্মিনালে <code>npx serve</code>।</p></div></div>`;
    return;
  }
  renderHeader(active); renderFooter(); bindCameras();
  const draw = live => { render(live); loadCovers(); };
  const rr = liveRenderer(draw);
  startLive(what => {
    if (what === 'cfg' || what === 'user') { renderHeader(active); renderFooter(); }
    if (what === 'user') watchSubs(active, rr);
    if (!opts.ignore || !opts.ignore.includes(what)) rr();
  }, opts);
  draw(false);
}
function watchSubs(active, rr) {
  if (unsubSubs) { unsubSubs(); unsubSubs = null; }
  if (!D.user || !D.user.isAdmin) { window.__pendingCount = 0; return; }
  unsubSubs = B.watchCol('submissions', rows => { subs.list = rows.sort((a, b) => (a.at || 0) - (b.at || 0)); window.__pendingCount = rows.length; renderHeader(active); rr(); });
}
