// Spoločné pomocné funkcie pre stránky Domov, Ponuka a Makléri (nemeň)
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtPrice = p => typeof p === 'number' ? p.toLocaleString('sk-SK') + ' $' : 'Cena na vyžiadanie';
const roomsText = n => n + ' ' + (n == 1 ? 'izba' : n < 5 ? 'izby' : 'izieb');

const normKey = v => String(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const statusesOf = h => [].concat(h.status || []).map(normKey).filter(k => STATUSES[k]);
// Predané alebo prenajaté = už nie je dostupné (sivé, nepočíta sa do ponuky)
const isClosed = h => statusesOf(h).some(k => k === 'predane' || k === 'prenajate');
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

// ===== Predaj / prenájom =====
// "offer" môže byť jeden typ ("predaj") alebo viac naraz (["predaj", "prenajom"]).
// Prenájom má vlastnú cenu "rent" a obdobie "rentPeriod" (den / tyzden / mesiac).
const RENT_PERIODS = {den: 'deň', tyzden: 'týždeň', mesiac: 'mesiac'};
const offersOf = h => [].concat(h.offer || []).map(String);
const offerText = h => offersOf(h).map(o => optLabel('offer', o)).join(' · ');
const fmtMoney = n => n.toLocaleString('sk-SK') + ' $';
const rentText = h => typeof h.rent === 'number' ? fmtMoney(h.rent) + ' / ' + (RENT_PERIODS[h.rentPeriod] || 'mesiac') : '';
// Cena na zoradenie: predajná, a keď nie je, tak cena prenájmu
const sortPrice = h => typeof h.price === 'number' ? h.price : typeof h.rent === 'number' ? h.rent : null;
// Hlavná cena + prípadne druhý riadok s prenájmom
function priceParts(h) {
  const rent = rentText(h);
  if (typeof h.price === 'number') return {main: fmtMoney(h.price), sub: rent ? 'alebo prenájom ' + rent : ''};
  if (rent) return {main: rent, sub: ''};
  return {main: 'Cena na vyžiadanie', sub: ''};
}

const hasTour = h => !!(h.tour && h.tour.scenes && Object.keys(h.tour.scenes).length);

// Karta domu – klik otvorí stránku inzerátu (nehnutelnost.html)
function cardHtml(h) {
  const photo = (h.photos || [])[0];
  const loc = [h.area && optLabel('area', h.area), h.type && optLabel('type', h.type)].filter(Boolean).join(' · ');
  const feats = [
    offersOf(h).length && offerText(h),
    h.rooms && roomsText(h.rooms),
    h.pool === true && 'Bazén',
    h.view && 'Výhľad ' + [].concat(h.view).map(v => optLabel('view', v).toLowerCase()).join(', ')
  ].filter(Boolean);
  return `<a class="card${isClosed(h) ? ' is-sold' : ''}" href="nehnutelnost.html?id=${encodeURIComponent(h.id)}">
    <div class="card-img"${photo ? ` style="background-image:url('${esc(photo)}')"` : ''}>
      ${photo ? '' : 'Zatiaľ bez fotiek'}
      <div class="card-badges">${badgesHtml(h)}</div>
      ${hasTour(h) ? '<span class="card-360">360°</span>' : ''}
    </div>
    <div class="card-body">
      <div class="card-title">${esc(h.name)}</div>
      ${h.street ? `<div class="card-street">${esc(h.street)}</div>` : ''}
      ${loc ? `<div class="card-loc">${esc(loc)}</div>` : ''}
      <div class="card-price">${esc(priceParts(h).main)}${priceParts(h).sub ? `<span class="card-rent">${esc(priceParts(h).sub)}</span>` : ''}</div>
      ${feats.length ? `<div class="card-feats">${feats.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : ''}
    </div>
  </a>`;
}

// Text pre uzavretú ponuku: "Predané", "Prenajaté" alebo oboje
const closedText = h => statusesOf(h).filter(k => k === 'predane' || k === 'prenajate').map(k => STATUSES[k][0]).join(' · ');

// Posuvný riadok kariet so šípkami (napr. úspešné obchody na úvodnej stránke)
// html = karty, vráti kód; po vložení do stránky zavolaj initCarousel(prvok)
const carouselHtml = cards => `<div class="carousel">
    <button class="car-btn car-prev" type="button" aria-label="Predchádzajúce" data-car="-1">‹</button>
    <div class="car-track" tabindex="0">${cards}</div>
    <button class="car-btn car-next" type="button" aria-label="Ďalšie" data-car="1">›</button>
  </div>`;
function initCarousel(root) {
  const track = root.querySelector('.car-track');
  const prev = root.querySelector('.car-prev'), next = root.querySelector('.car-next');
  const step = () => { const c = track.firstElementChild; return c ? c.getBoundingClientRect().width + 22 : track.clientWidth; };
  const update = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
    root.classList.toggle('no-scroll', max <= 0);
  };
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-car]'); if (!b) return;
    track.scrollBy({left: Number(b.dataset.car) * step(), behavior: 'smooth'});
  });
  track.addEventListener('scroll', update, {passive: true});
  window.addEventListener('resize', update);
  update();
}

// Pätička na každej obsahovej stránke
(function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  el.className = 'site-footer';
  el.innerHTML = `<div class="wrap"><span>© ${new Date().getFullYear()} ${esc(AGENCY.name)}</span></div>`;
})();

// Spoiler (OOC poznámka): na mobile sa ukáže ťuknutím
document.addEventListener('click', e => { const s = e.target.closest('.spoiler'); if (s) s.classList.toggle('open'); });
