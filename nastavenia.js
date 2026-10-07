// =====================================================================
//  NASTAVENIA WEBU – všetko, čo budeš meniť, je v tomto súbore hore.
//  (Platí pre všetky stránky: Domov, Ponuka, Mapa, Makléri.)
// =====================================================================

// Názov kancelárie, logo a krátky popis na úvodnej stránke
const AGENCY = {
  name: 'ONYX Real Estate',
  logo: 'img/onyx_logo.png',
  // Veľký názov v strede úvodnej stránky a menší text pod ním
  heroTitle: 'ONYX',
  heroSubtitle: 'Real Estate',
  eyebrow: 'Realitná kancelária · Los Santos',
  tagline: 'Domy, vily a byty v Los Santos a okolí. Prezrite si ponuku aj 360° prehliadky interiérov a neváhajte nás kontaktovať.',
  // Pozadie úvodnej stránky: nechaj prázdne '' = zlatá kresba vily,
  // alebo daj cestu k fotke, napr. 'img/uvod.jpg' (ideálne široká fotka z hry, aspoň 1920 px)
  heroPhoto: ''
};

// ===== KONTAKT (stránka kontakt.html) =====
// Adresa a telefón kancelárie. Poloha na mapke je v pixeloch obrázka img/kontakt-mapa.png
// (x zľava, y zhora). Orientačné body (napr. Bahama Mamas) pridáš do "landmarks".
const CONTACT = {
  address: 'Blv. Del Perro 7171',          // ulica a číslo
  district: 'Morningwood, Los Santos, San Andreas',   // štvrť / mesto
  phone: '555-0100',                        // telefón kancelárie (doplň)
  email: 'info@onyx.ls',                    // e-mail kancelárie (doplň)
  hours: '',                                // napr. 'Po – Pi 10:00 – 22:00' (nechaj prázdne, ak nechceš)
  map: 'img/kontakt-mapa.png',
  pin: {x: 1216, y: 5008},
  // Orientačné body – svetlá bodka s názvom (x, y = pixely v obrázku mapy)
  landmarks: [
    // {name: 'Bahama Mamas', x: 0, y: 0},
  ]
  // Názvy ulíc sú v súbore kontakt-ulice.js
};

// Pozvánka na Discord (tlačidlo „Mám záujem“, keď formulár nie je dostupný)
const DISCORD = 'https://discord.gg/PrrqcxaUy7';
const CONTACT_LABEL = 'Mám záujem';

// ===== FILTRE =====
// Prvá hodnota je „kód“, ktorý píšeš do data.json, druhá je text na stránke.
// onlyUsed: true = ukážu sa len možnosti, ktoré má aspoň jeden dom.
const FILTERS = [
  {key: 'offer', title: 'Typ', open: true, options: [
    ['predaj', 'Predaj'], ['prenajom', 'Prenájom'], ['kupa', 'Kúpa']]},
  {key: 'area', title: 'Lokalita', open: true, options: [
    ['vinewood-hills', 'Vinewood Hills'], ['sandy-shores', 'Sandy Shores'], ['paleto-bay', 'Paleto Bay'],
    ['mirror-park', 'Mirror Park'], ['plaz', 'Pláž']]},
  {key: 'type', title: 'Druh nehnuteľnosti', open: true, options: [
    ['vila', 'Vily a luxusné domy'], ['dom', 'Bežné domy a bungalovy'], ['apartman', 'Apartmány a byty'],
    ['farma', 'Farmy a chaty'], ['biznis', 'Kancelárie alebo biznis']]},
  {key: 'price', title: 'Cena', options: [
    ['do500k', 'do 500 000 $'], ['500k-2m', '500 000 – 2 mil. $'], ['2m-5m', '2 – 5 mil. $'], ['nad5m', 'nad 5 mil. $']]},
  {key: 'rooms', title: 'Počet izieb', onlyUsed: true, options: [
    ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8'], ['9', '9'], ['10', '10']]},
  {key: 'pool', title: 'Bazén', options: [['true', 'S bazénom'], ['false', 'Bez bazéna']]},
  {key: 'view', title: 'Výhľad', options: [['more', 'Na more'], ['mesto', 'Na mesto'], ['priroda', 'Na prírodu a hory']]}
];

// ===== ŠTÍTKY STAVU =====
// V data.json: "status": "novinka"  alebo viac naraz: "status": ["novinka", "zlava"]
// kód: [text na stránke, farba]
const STATUSES = {
  novinka:     ['Novinka',     '#3c9a5f'],
  zlava:       ['Zľava',       '#c0392b'],
  rezervovane: ['Rezervované', '#d4881f'],
  predane:     ['Predané',     '#6f6a62'],
  prenajate:   ['Prenajaté',   '#5f6b78']
};


// =====================================================================
//  Odtiaľto nižšie už nič nemeň – vykreslí sa horná lišta s menu.
// =====================================================================
(function renderHeader() {
  const el = document.getElementById('site-header');
  if (!el) return;
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const links = [['index.html', 'Domov'], ['ponuka.html', 'Ponuka'], ['mapa.html', 'Mapa'], ['makleri.html', 'Makléri']];
  el.className = 'site-header';
  el.innerHTML =
    `<a class="brand" href="index.html">` +
      (AGENCY.logo ? `<img src="${AGENCY.logo}" alt="" onerror="this.remove()">` : '') +
      `<span>${AGENCY.name}</span></a>` +
    `<nav class="site-nav" aria-label="Hlavné menu">` +
      links.map(([href, text]) => `<a href="${href}"${page === href ? ' aria-current="page"' : ''}>${text}</a>`).join('') +
    `</nav>` +
    `<a class="hdr-cta" href="kontakt.html"${page === 'kontakt.html' ? ' aria-current="page"' : ''}>Kontakt</a>`;
})();
