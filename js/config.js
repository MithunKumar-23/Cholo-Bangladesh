/* =====================================================================
   চলো বাংলাদেশ — সাইটের সব সেটিংস এই এক ফাইলে।
   README.md-তে প্রতিটা ধাপ বিস্তারিত লেখা আছে।
   ===================================================================== */

/* ১. সাইটের নাম ও লোগো
   লোগো বদলাতে চাইলে দুটো উপায়:
   (ক) assets/logo.svg ফাইলটা নিজের লোগো দিয়ে বদলে দিন (একই নামে), অথবা
       নিচে logo-তে নতুন ফাইলের পথ দিন, যেমন 'assets/my-logo.png'।
   (খ) অ্যাডমিন প্যানেল → সাইট সেটিংস থেকে লোগো আপলোড করুন (কোড ছাড়াই)।
       অ্যাডমিন প্যানেলের লোগো থাকলে সেটাই দেখাবে। */
export const SITE = {
  name: 'চলো বাংলাদেশ',
  nameEn: 'Cholo Bangladesh',
  logo: 'assets/logo.svg',
  developer: 'NenoCode Systems',
  developerUrl: ''            // ডেভেলপারের ওয়েবসাইট থাকলে এখানে দিন, যেমন 'https://nenocode.com'
};

/* ২. Firebase (লগইন ও ডেটাবেজ)
   Firebase Console → Project settings → Your apps → Web app → firebaseConfig
   থেকে মানগুলো কপি করে বসান। যতক্ষণ 'YOUR_' দিয়ে শুরু, সাইট "ডেমো মোডে" চলবে:
   সব স্পট দেখা যাবে, কিন্তু লগইন, রেটিং বা কিছু যোগ করা যাবে না। */
export const firebaseConfig = {
  apiKey: "AIzaSyD619C0p9Wa--oMaN_CEwCwRZXIm-1d1c0",
  authDomain: "cholo-bangladesh-f02c5.firebaseapp.com",
  projectId: "cholo-bangladesh-f02c5",
  storageBucket: "cholo-bangladesh-f02c5.firebasestorage.app",
  messagingSenderId: "492911982736",
  appId: "1:492911982736:web:099f357517662f97d08015"
};


/* ৩. প্রধান অ্যাডমিনের ইমেইল
   এই ইমেইল দিয়ে Firebase-এ অ্যাকাউন্ট খুললেই সে অ্যাডমিন। একই ইমেইল
   firestore.rules ফাইলেও বসাতে হবে। অন্য অ্যাডমিন যোগ করা যাবে
   অ্যাডমিন প্যানেল → অ্যাডমিন ট্যাব থেকে। */
export const OWNER_EMAIL = 'mkrmithun23@gmail.com';

/* ৪. ছবি ও ভিডিও রাখার জায়গা (ঐচ্ছিক কিন্তু সুপারিশকৃত)
   Cloudinary-র ফ্রি অ্যাকাউন্ট খুলে "unsigned upload preset" বানিয়ে নাম দুটো বসান।
   খালি রাখলে ছবি ছোট করে Firestore-এ রাখা হবে (ভিডিও ফাইল আপলোড হবে না, শুধু লিংক)। */
export const CLOUDINARY = {
  cloudName: '',
  uploadPreset: ''
};

export const DEMO = !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('YOUR_');
