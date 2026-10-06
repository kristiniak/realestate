// Spoločné pomocné funkcie pre stránky Domov, Ponuka a Makléri (nemeň)
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtPrice = p => typeof p === 'number' ? p.toLocaleString('sk-SK') + ' $' : 'Cena na vyžiadanie';
const roomsText = n => n + ' ' + (n == 1 ? 'izba' : n < 5 ? 'izby' : 'izieb');

const normKey = v => String(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const statusesOf = h => [].concat(h.status || []).map(normKey).filter(k => STATUSES[k]);
const badgesHtml = h => statusesOf(h).map(k =>
  `<span class="badge" style="--b:${STATUSES[k][1]}">${esc(STATUSES[k][0])}</span>`).join('');

const optLabel = (key, val) => {
  const f = FILTERS.find(x => x.key === key);
  const o = f && f.options.find(o => o[0] === String(val));
  return o ? o[1] : String(val);
};
const priceRange = p => p < 500000 ? 'do500k' : p < 2000000 ? '500k-2m' : p <= 5000000 ? '2m-5m' : 'nad5m';
function valuesOf(h, key) {
  if (key === 'price') return typeof h.price === 'number' ? [priceRange(h.price)] : [];
  const v = h[key];
  if (v === undefined || v === null) return [];
  return (Array.isArray(v) ? v : [v]).map(String);
}
// V rámci jednej skupiny stačí jedna možnosť, medzi skupinami musia platiť všetky
const matchesFilters = (h, active) =>
  FILTERS.every(f => !active[f.key] || !active[f.key].size || valuesOf(h, f.key).some(v => active[f.key].has(v)));

function loadJSON(url, fallback) {
  return fetch(url + '?v=' + Date.now(), {cache: 'no-store'})
    .then(r => r.ok ? r.json() : fallback).catch(() => fallback);
}

const hasTour = h => !!(h.tour && h.tour.scenes && Object.keys(h.tour.scenes).length);

// Karta domu – klik otvorí stránku inzerátu (nehnutelnost.html)
function cardHtml(h) {
  const photo = (h.photos || [])[0];
  const loc = [h.area && optLabel('area', h.area), h.type && optLabel('type', h.type)].filter(Boolean).join(' · ');
  const feats = [
    h.offer && optLabel('offer', h.offer),
    h.rooms && roomsText(h.rooms),
    h.pool === true && 'Bazén',
    h.view && 'Výhľad ' + [].concat(h.view).map(v => optLabel('view', v).toLowerCase()).join(', ')
  ].filter(Boolean);
  return `<a class="card${statusesOf(h).includes('predane') ? ' is-sold' : ''}" href="nehnutelnost.html?id=${encodeURIComponent(h.id)}">
    <div class="card-img"${photo ? ` style="background-image:url('${esc(photo)}')"` : ''}>
      ${photo ? '' : 'Zatiaľ bez fotiek'}
      <div class="card-badges">${badgesHtml(h)}</div>
      ${hasTour(h) ? '<span class="card-360">360°</span>' : ''}
    </div>
    <div class="card-body">
      <div class="card-title">${esc(h.name)}</div>
      ${h.street ? `<div class="card-street">${esc(h.street)}</div>` : ''}
      ${loc ? `<div class="card-loc">${esc(loc)}</div>` : ''}
      <div class="card-price">${fmtPrice(h.price)}</div>
      ${feats.length ? `<div class="card-feats">${feats.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : ''}
    </div>
  </a>`;
}

// Pätička na každej obsahovej stránke
(function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  el.className = 'site-footer';
  el.innerHTML = `<div class="wrap"><span>© ${new Date().getFullYear()} ${esc(AGENCY.name)}</span>
    <a href="${esc(DISCORD)}" target="_blank" rel="noopener">Napíš nám na Discorde →</a></div>`;
})();
