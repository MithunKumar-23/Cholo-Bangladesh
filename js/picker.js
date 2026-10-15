/* ম্যাপে ক্লিক করে স্থানাঙ্ক বেছে নেওয়া (Leaflet + OpenStreetMap) */
import { FEAT } from './data.js';

let loading = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  loading ??= new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  return loading;
}

/* el: ম্যাপের div; latIn/lngIn: ইনপুট; getDistrict(): বর্তমান জেলা */
export async function mountPicker(el, latIn, lngIn, getDistrict) {
  try { await loadLeaflet(); } catch (e) { el.innerHTML = '<p class="mutedline" style="padding:12px">ম্যাপ লোড হয়নি। স্থানাঙ্ক হাতে লিখুন।</p>'; return null; }
  const L = window.L;
  const map = L.map(el, { scrollWheelZoom: false }).setView([23.7, 90.35], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  let marker = null, outline = null;
  const place = (lat, lng, pan) => {
    if (!isFinite(lat) || !isFinite(lng)) return;
    if (!marker) { marker = L.marker([lat, lng], { draggable: true }).addTo(map); marker.on('dragend', () => { const p = marker.getLatLng(); set(p.lat, p.lng); }); }
    else marker.setLatLng([lat, lng]);
    if (pan) map.setView([lat, lng], Math.max(map.getZoom(), 12));
  };
  const set = (lat, lng) => { latIn.value = lat.toFixed(5); lngIn.value = lng.toFixed(5); place(lat, lng, false); };
  map.on('click', e => set(e.latlng.lat, e.latlng.lng));
  const showDistrict = () => {
    const f = FEAT.get(getDistrict()); if (!f) return;
    outline && outline.remove(); outline = L.geoJSON(f, { style: { color: '#1E5B3A', weight: 2, fillOpacity: .06 }, interactive: false }).addTo(map);
    if (!marker) map.fitBounds(outline.getBounds(), { padding: [10, 10] });
  };
  [latIn, lngIn].forEach(i => i.addEventListener('change', () => place(parseFloat(latIn.value), parseFloat(lngIn.value), true)));
  showDistrict();
  if (latIn.value && lngIn.value) place(parseFloat(latIn.value), parseFloat(lngIn.value), true);
  setTimeout(() => map.invalidateSize(), 200);
  return { showDistrict };
}
