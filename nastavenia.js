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
  phone: '(738) 153-3803',                        // telefón kancelárie (doplň)
  email: 'onyx_realestate@lifeinvader.com',                    // e-mail kancelárie (doplň)
  hours: '',                                // napr. 'Po – Pi 10:00 – 22:00' (nechaj prázdne, ak nechceš)
  map: 'img/kontakt-mapa.png',
  pin: {x: 1216, y: 5008},
  // Orientačné body – svetlá bodka s názvom (x, y = pixely v obrázku mapy)
  landmarks: [
    // {name: 'Bahama Mamas', x: 0, y: 0},
  ]
  // Názvy ulíc sú v súbore kontakt-ulice.js
};

// ===== ČASTÉ OTÁZKY (zobrazia sa na stránke Kontakt) =====
// Každá položka: ['Otázka', 'Odpoveď']. Nový odsek v odpovedi = \n
const FAQ = [
  ['Ako prebieha kúpa nehnuteľnosti?',
   'Pri vybranej nehnuteľnosti kliknite na „Mám záujem“ a vyplňte krátky formulár. Maklér vás kontaktuje e-mailom, dohodne s vami osobnú obhliadku a zodpovie všetky otázky. Ak sa rozhodnete pre kúpu, pripravíme zmluvu a po jej podpise a úhrade vám odovzdáme kľúče.'],
  ['Ako funguje prenájom?',
   'Pri každej nehnuteľnosti na prenájom je uvedená cena aj obdobie – za deň, týždeň alebo mesiac. Postup je rovnaký ako pri kúpe: vyplníte formulár, maklér vás kontaktuje, dohodnete si obhliadku a podmienky prenájmu.'],
  ['Môžem si nehnuteľnosť pozrieť ešte pred obhliadkou?',
   'Áno. Pri vybraných nehnuteľnostiach nájdete 360° prehliadku interiéru, v ktorej sa môžete prejsť miestnosť po miestnosti. Na mape si cez „Poobzerajte sa po lokalitách“ prezriete aj okolie z ulice.'],
  ['Čo znamená „Dizajn interiéru“?',
   'Uvádzame, ktoré štúdio interiér navrhlo:\nM.L.O. Architects (Maison Luxe Originals) – interiéry navrhnuté na mieru priamo pre konkrétnu budovu.\nI.P.L. Interiors (Interior Prestige Los Santos) – overený dizajn známy z prestížnych rezidencií.\nShell & Co. Living – cenovo dostupné bývanie, ktoré si zariadite podľa seba.'],
  ['Predávate nehnuteľnosti aj zariadené?',
   'Áno. Pri každej ponuke je uvedené, či je zariadená alebo nezariadená, a vo filtri „Vybavenie“ si môžete zobraziť len to, čo hľadáte.'],
  ['Čo znamená štítok „Rezervované“?',
   'Nehnuteľnosť už má záujemcu, s ktorým prebiehajú rokovania. Ak by obchod nakoniec neprebehol, ponuka sa opäť uvoľní – pokojne nám napíšte a dáme vám vedieť.'],
  ['Na čo slúži kód ponuky?',
   'Každá nehnuteľnosť má vlastný kód (napr. ONX-014). Keď sa o nej budete rozprávať s maklérom, stačí uviesť kód a hneď bude vedieť, o ktorú ide.'],
  ['Nenašli ste, čo hľadáte?',
   'Na úvodnej stránke kliknite pri „Hľadáte niečo konkrétne?“ na „Kontaktujte nás“ a vyplňte, akú nehnuteľnosť hľadáte. Maklér sa vám ozve, keď sa objaví vhodná ponuka.'],
  ['Môžem cez vás predať alebo prenajať svoju nehnuteľnosť?',
   'Samozrejme. Kliknite vyššie na náš e-mail, vyberte tému „Predaj nehnuteľnosti“ alebo „Prenájom“ a napíšte nám pár slov o vašej nehnuteľnosti. Maklér sa vám ozve a dohodne ďalší postup.'],
  ['Ako rýchlo dostanem odpoveď?',
   'Na správy odpovedáme čo najskôr, spravidla v ten istý deň. Odpoveď nájdete vo svojej e-mailovej schránke.']
];

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
  {key: 'design', title: 'Dizajn interiéru', onlyUsed: true, options: [
    ['mlo', 'M.L.O. Architects'], ['ipl', 'I.P.L. Interiors'], ['shell', 'Shell & Co. Living']]},
  {key: 'price', title: 'Cena predaja', options: [
    ['do500k', 'do 500 000 $'], ['500k-2m', '500 000 – 2 mil. $'], ['2m-5m', '2 – 5 mil. $'], ['nad5m', 'nad 5 mil. $']]},
  // Cena prenájmu sa porovnáva za mesiac (prenájom na deň/týždeň sa prepočíta automaticky)
  {key: 'rentPrice', title: 'Cena prenájmu (mesačne)', options: [
    ['r-do5k', 'do 5 000 $'], ['r-5k-20k', '5 000 – 20 000 $'], ['r-20k-50k', '20 000 – 50 000 $'], ['r-nad50k', 'nad 50 000 $']]},
  {key: 'rooms', title: 'Počet izieb', onlyUsed: true, options: [
    ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8'], ['9', '9'], ['10', '10']]},
  {key: 'furnished', title: 'Vybavenie', options: [['true', 'Zariadené'], ['false', 'Nezariadené']]},
  {key: 'pool', title: 'Bazén', options: [['true', 'S bazénom'], ['false', 'Bez bazéna']]},
  {key: 'view', title: 'Výhľad', options: [['more', 'Na more'], ['mesto', 'Na mesto'], ['priroda', 'Na prírodu a hory']]}
];

// ===== DIZAJN INTERIÉRU – karta štúdia v inzeráte (vedľa makléra) =====
// mono = skratka v štvorčeku, full = celý názov pod menom, desc = krátky popis
const DESIGNERS = {
  mlo:   {mono: 'MLO', full: 'Maison Luxe Originals',
          desc: 'Interiér navrhnutý na mieru priamo pre túto budovu. Jedinečné dispozičné riešenie, ktoré inde nenájdete.'},
  ipl:   {mono: 'IPL', full: 'Interior Prestige Los Santos',
          desc: 'Overený dizajn renomovaného štúdia, známy z prestížnych rezidencií v Los Santos.'},
  shell: {mono: 'S&C', full: 'Kompaktné bývanie',
          desc: 'Cenovo dostupné bývanie, ktoré si môžete zariadiť presne podľa svojich predstáv – alebo ho získať už kompletne zariadené.'}
};

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
