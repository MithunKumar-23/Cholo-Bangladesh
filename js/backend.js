/* Firebase-এর সাথে সব যোগাযোগ এই ফাইলে। অন্য ফাইল শুধু B.* ব্যবহার করে। */
import { firebaseConfig, OWNER_EMAIL, DEMO } from './config.js';

const V = '10.12.2';
let fs = null, au = null, db = null, auth = null;
const userListeners = new Set();
let currentUser = null, userKnown = false;

async function boot() {
  if (DEMO) { userKnown = true; userListeners.forEach(cb => cb(null)); return; }
  const [app, f, a] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`)
  ]);
  fs = f; au = a;
  const fa = app.initializeApp(firebaseConfig);
  /* ১. ব্রাউজারে স্থায়ী ক্যাশ: আগে দেখা ডেটা IndexedDB-তে থাকে, ফিরে এলে সার্ভার থেকে
     শুধু বদলানো অংশ আসে। প্রাইভেট মোড বা পুরোনো ব্রাউজারে না চললে সাধারণ মোডে চলে। */
  try { db = f.initializeFirestore(fa, { localCache: f.persistentLocalCache({ tabManager: f.persistentMultipleTabManager() }) }); }
  catch (e) { console.warn('অফলাইন ক্যাশ চালু হয়নি, সাধারণ মোডে চলছে:', e && e.code); db = f.getFirestore(fa); }
  auth = a.getAuth(fa);
  a.onAuthStateChanged(auth, async u => {
    if (!u) { currentUser = null; }
    else {
      const email = (u.email || '').toLowerCase();
      let isAdmin = !!email && email === OWNER_EMAIL.toLowerCase();
      if (!isAdmin && email) {
        try { const s = await f.getDoc(f.doc(db, 'admins', email)); isAdmin = s.exists(); } catch (e) { isAdmin = false; }
      }
      currentUser = { uid: u.uid, email, name: u.displayName || email.split('@')[0], isAdmin, isOwner: email === OWNER_EMAIL.toLowerCase() };
    }
    userKnown = true;
    userListeners.forEach(cb => cb(currentUser));
  });
}
const ready = boot().catch(e => { console.error('Firebase চালু হয়নি:', e); userKnown = true; userListeners.forEach(cb => cb(null)); });

const demoErr = () => { const e = new Error('ডেমো মোডে এটি করা যায় না। js/config.js-এ Firebase সেটআপ করুন।'); e.code = 'demo'; return e; };
const ref = p => { const s = p.split('/'); return s.length % 2 ? fs.collection(db, ...s) : fs.doc(db, ...s); };
const rows = q => q.docs.map(d => ({ id: d.id, ...d.data() }));
const build = (path, filters = []) => { let q = fs.collection(db, ...path.split('/')); if (filters.length) q = fs.query(q, ...filters.map(([a, op, b]) => fs.where(a, op, b))); return q; };

export const B = {
  demo: DEMO,
  ready,
  user: () => currentUser,
  onUser(cb) { userListeners.add(cb); if (userKnown) cb(currentUser); return () => userListeners.delete(cb); },

  async login(email, pw) { if (DEMO) throw demoErr(); await ready; await au.signInWithEmailAndPassword(auth, email.trim(), pw); },
  async register(name, email, pw) {
    if (DEMO) throw demoErr(); await ready;
    const c = await au.createUserWithEmailAndPassword(auth, email.trim(), pw);
    if (name) await au.updateProfile(c.user, { displayName: name.trim() });
    await auth.currentUser.reload();
    currentUser = { ...(currentUser || {}), uid: c.user.uid, email: c.user.email.toLowerCase(), name: name || c.user.email.split('@')[0], isAdmin: c.user.email.toLowerCase() === OWNER_EMAIL.toLowerCase(), isOwner: c.user.email.toLowerCase() === OWNER_EMAIL.toLowerCase() };
    userListeners.forEach(cb => cb(currentUser));
  },
  async logout() { if (DEMO) return; await ready; await au.signOut(auth); },
  async reset(email) { if (DEMO) throw demoErr(); await ready; await au.sendPasswordResetEmail(auth, email.trim()); },

  watchCol(path, cb, filters = []) {
    if (DEMO) { setTimeout(() => cb([]), 0); return () => {}; }
    let unsub = null, dead = false;
    ready.then(() => { if (dead || !db) return; unsub = fs.onSnapshot(build(path, filters), q => cb(rows(q)), e => { console.warn(path, e.code); cb([]); }); });
    return () => { dead = true; unsub && unsub(); };
  },
  watchDoc(path, cb) {
    if (DEMO) { setTimeout(() => cb(null), 0); return () => {}; }
    let unsub = null, dead = false;
    ready.then(() => { if (dead || !db) return; unsub = fs.onSnapshot(ref(path), d => cb(d.exists() ? d.data() : null), e => { console.warn(path, e.code); cb(null); }); });
    return () => { dead = true; unsub && unsub(); };
  },
  async get(path) { if (DEMO) return null; await ready; const d = await fs.getDoc(ref(path)); return d.exists() ? d.data() : null; },
  async list(path, filters = []) { if (DEMO) return []; await ready; return rows(await fs.getDocs(build(path, filters))); },
  async set(path, data) { if (DEMO) throw demoErr(); await ready; await fs.setDoc(ref(path), data); },
  async merge(path, data) { if (DEMO) throw demoErr(); await ready; await fs.setDoc(ref(path), data, { merge: true }); },
  async del(path) { if (DEMO) throw demoErr(); await ready; await fs.deleteDoc(ref(path)); },
  /* ২. রেটিং: নিজের রেটিং আর সব স্পটের মোট হিসাব একসাথে, এক লেনদেনে (transaction) বদলায়।
     ফলে কেউ রেটিং দিলে সবার জন্য পড়তে হয় মাত্র একটা ডকুমেন্ট: ratingStats/all */
  async rate(spot, n) {
    if (DEMO) throw demoErr(); await ready;
    const uid = currentUser && currentUser.uid; if (!uid) throw Object.assign(new Error('লগইন করুন।'), { code: 'auth' });
    const rRef = fs.doc(db, 'ratings', uid), sRef = fs.doc(db, 'ratingStats', 'all');
    await fs.runTransaction(db, async tx => {
      const [rs, ss] = [await tx.get(rRef), await tx.get(sRef)];
      const r = (rs.exists() && rs.data().r) || {}, s = (ss.exists() && ss.data().s) || {};
      const ov = r[spot] || 0; if (ov === n) return;
      const o = s[spot] || { sum: 0, n: 0 }, at = Date.now();
      tx.set(rRef, { r: { ...r, [spot]: n }, at });
      tx.set(sRef, { s: { ...s, [spot]: { sum: o.sum + n - ov, n: o.n + (ov ? 0 : 1) } }, last: { spot, by: uid, at } });
    });
  },
  async add(path, data) { if (DEMO) throw demoErr(); await ready; const r = await fs.addDoc(fs.collection(db, ...path.split('/')), data); return r.id; }
};

/* Firebase-এর ইংরেজি ত্রুটি বার্তাকে বাংলায় */
export function errText(e) {
  const c = (e && e.code) || '';
  const m = {
    'demo': e && e.message,
    'auth/invalid-credential': 'ইমেইল বা পাসওয়ার্ড ভুল।',
    'auth/wrong-password': 'পাসওয়ার্ড ভুল।',
    'auth/user-not-found': 'এই ইমেইলে কোনো অ্যাকাউন্ট নেই।',
    'auth/invalid-email': 'ইমেইল ঠিকানাটি সঠিক নয়।',
    'auth/email-already-in-use': 'এই ইমেইলে আগেই অ্যাকাউন্ট খোলা আছে। লগইন করুন।',
    'auth/weak-password': 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।',
    'auth/too-many-requests': 'অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
    'auth/network-request-failed': 'ইন্টারনেট সংযোগ পরীক্ষা করুন।',
    'auth/unauthorized-domain': 'এই ডোমেইন Firebase-এ অনুমোদিত নয়। README-র "Authorized domains" ধাপটি দেখুন।',
    'permission-denied': 'এই কাজের অনুমতি আপনার নেই।'
  };
  return m[c] || (e && e.message) || 'কিছু একটা ভুল হয়েছে, আবার চেষ্টা করুন।';
}
