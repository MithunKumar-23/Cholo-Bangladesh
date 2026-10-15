/* ফর্মের ঘর বানানোর ছোট সাহায্যকারী (add-spot, admin, edit-spot পেজে ব্যবহৃত) */
import { DIST } from './data.js';
import { esc } from './ui.js';

export function fld(id, label, val, o = {}) {
  const v = esc(val ?? ''), ph = o.ph ? ` placeholder="${esc(o.ph)}"` : '';
  const input = o.area ? `<textarea id="${id}"${ph} rows="${o.rows || 3}">${v}</textarea>`
    : o.sel ? `<select id="${id}">${o.sel.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`
    : `<input id="${id}" value="${v}"${ph}${o.type ? ` type="${o.type}" step="any"` : ''}${o.req ? ' required' : ''}>`;
  return `<div class="field ${o.full ? 'full' : ''}"><label for="${id}">${label}</label>${input}${o.help ? `<small>${esc(o.help)}</small>` : ''}</div>`;
}
export const distOpts = () => Object.values(DIST).sort((a, b) => a.bn.localeCompare(b.bn, 'bn')).map(p => [p.en, p.bn]);
