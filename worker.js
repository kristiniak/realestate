// =====================================================================
//  ONYX – serverová časť webu (Cloudflare Worker)
//  Statické stránky sa servírujú ako doteraz, tento kód rieši len adresy /api/…:
//    /api/login    → prihlásenie cez Discord
//    /api/discord  → návrat z Discordu (OAuth2)
//    /api/me       → kto je prihlásený
//    /api/logout   → odhlásenie
//    /api/ticket   → vytvorí ticket (súkromný kanál) na Discord serveri
//    /api/interactions → tlačidlo „Uzavrieť e-mail“ v tickete (prepis + zmazanie kanála)
//
//  Nastavenia sa NEPÍŠU sem, ale do Cloudflare:
//  Workers & Pages → onyx → Settings → Variables and Secrets
//    DISCORD_CLIENT_ID      – Client ID aplikácie (OAuth2)
//    DISCORD_CLIENT_SECRET  – Client Secret (typ Secret)
//    DISCORD_BOT_TOKEN      – token bota (typ Secret)
//    DISCORD_GUILD_ID       – ID servera
//    DISCORD_CATEGORY_ID    – ID kategórie, kde vznikajú tickety
//    DISCORD_STAFF_ROLE_ID  – ID role maklérov (uvidia všetky tickety); viac rolí oddeľ čiarkou
//    DISCORD_PUBLIC_KEY     – Public Key aplikácie (kvôli tlačidlám)
//    DISCORD_TRANSCRIPT_CHANNEL_ID – kanál, kam sa ukladajú prepisy uzavretých ticketov
// =====================================================================

const API = 'https://discord.com/api/v10';
const MAX_OPEN_TICKETS = 3;          // koľko otvorených ticketov môže mať jeden človek naraz
const SESSION_HOURS = 12;            // ako dlho ostane návštevník prihlásený

// Oprávnenia v kanáli
const P = {VIEW: 1 << 10, SEND: 1 << 11, EMBED: 1 << 14, ATTACH: 1 << 15, HISTORY: 1 << 16, MANAGE_CH: 1 << 4, MANAGE_MSG: 1 << 13};
const MEMBER_ALLOW = P.VIEW | P.SEND | P.EMBED | P.ATTACH | P.HISTORY;
const STAFF_ALLOW = MEMBER_ALLOW | P.MANAGE_MSG;
const BOT_ALLOW = STAFF_ALLOW | P.MANAGE_CH;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    try {
      const missing = ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_CATEGORY_ID']
        .filter(k => !env[k]);
      if (missing.length) return json({error: 'not_configured', missing}, 503);
      switch (url.pathname) {
        case '/api/login': return login(req, env, url);
        case '/api/discord': return callback(req, env, url);
        case '/api/me': return me(req, env);
        case '/api/logout': return new Response(null, {status: 204, headers: {'Set-Cookie': cookie('onyx_s', '', 0)}});
        case '/api/ticket': return req.method === 'POST' ? ticket(req, env, url) : json({error: 'method'}, 405);
        case '/api/interactions': return interactions(req, env, ctx);
        default: return json({error: 'not_found'}, 404);
      }
    } catch (e) {
      console.error(e);
      return json({error: 'server', detail: String(e.message || e)}, 500);
    }
  }
};

// ---------- Prihlásenie cez Discord ----------
async function login(req, env, url) {
  const back = safeBack(url.searchParams.get('back'));
  const nonce = crypto.randomUUID();
  const q = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID, response_type: 'code', scope: 'identify guilds.join',
    redirect_uri: url.origin + '/api/discord', state: nonce
  });
  return new Response(null, {status: 302, headers: [
    ['Location', 'https://discord.com/oauth2/authorize?' + q],
    ['Set-Cookie', cookie('onyx_o', await sign(env, {nonce, back, exp: Date.now() + 600000}), 600)]
  ]});
}

async function callback(req, env, url) {
  const st = await verify(env, getCookie(req, 'onyx_o'));
  const back = st ? st.back : '/';
  const fail = reason => redirect(addParam(back, 'prihlasenie', reason));
  if (!st || st.nonce !== url.searchParams.get('state')) return fail('chyba');
  if (url.searchParams.get('error')) return fail('zrusene');

  const tok = await fetch(API + '/oauth2/token', {
    method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code',
      code: url.searchParams.get('code') || '', redirect_uri: url.origin + '/api/discord'
    })
  }).then(r => r.json());
  if (!tok.access_token) return fail('chyba');
  const user = await fetch(API + '/users/@me', {headers: {Authorization: 'Bearer ' + tok.access_token}}).then(r => r.json());
  if (!user.id) return fail('chyba');

  // Kto ešte nie je na našom serveri, toho tam bot rovno pridá (aby videl svoj ticket)
  await bot(env, `/guilds/${env.DISCORD_GUILD_ID}/members/${user.id}`, 'PUT', {access_token: tok.access_token}).catch(() => {});

  const session = {id: user.id, username: user.username, name: user.global_name || user.username,
    avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : '',
    exp: Date.now() + SESSION_HOURS * 3600000};
  return new Response(null, {status: 302, headers: [
    ['Location', back],
    ['Set-Cookie', cookie('onyx_s', await sign(env, session), SESSION_HOURS * 3600)],
    ['Set-Cookie', cookie('onyx_o', '', 0)]
  ]});
}

async function me(req, env) {
  const s = await verify(env, getCookie(req, 'onyx_s'));
  return json(s ? {user: {id: s.id, username: s.username, name: s.name, avatar: s.avatar}} : {user: null});
}

// ---------- Vytvorenie ticketu ----------
async function ticket(req, env, url) {
  if (req.headers.get('Origin') && req.headers.get('Origin') !== url.origin) return json({error: 'origin'}, 403);
  const s = await verify(env, getCookie(req, 'onyx_s'));
  if (!s) return json({error: 'login'}, 401);

  const body = await req.json().catch(() => ({}));
  const clip = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const form = {
    icName: clip(String(body.icName || '').normalize('NFC'), 60), phone: clip(body.phone, 15), email: clip(body.email, 80), interest: clip(body.interest, 20),
    message: String(body.message || '').trim().slice(0, 800)
  };
  if (!/^\p{L}+(?:[ '-]\p{L}+)+$/u.test(form.icName)) return json({error: 'icName'}, 400);   // meno a priezvisko, len písmená
  if (!/^\d{3,15}$/.test(form.phone)) return json({error: 'phone'}, 400);                     // len číslice
  if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[a-z]{2,}$/i.test(form.email)) return json({error: 'email'}, 400);              // musí obsahovať @
  // Termín obhliadky (nepovinný): dátum RRRR-MM-DD + čas HH:MM, nie v minulosti
  const date = String(body.date || ''), time = String(body.time || '');
  if (date || time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || (time && !/^\d{2}:\d{2}$/.test(time))) return json({error: 'when'}, 400);
    const yesterday = new Date(Date.now() - 36 * 3600000).toISOString().slice(0, 10);   // rezerva na časové pásma
    if (date < yesterday) return json({error: 'when'}, 400);
    const [y, m, d] = date.split('-');
    form.when = `${Number(d)}. ${Number(m)}. ${y}` + (time ? ` o ${time}` : '');
  }

  // Údaje o ponuke berieme priamo zo súboru data.json na webe (nedajú sa podvrhnúť)
  const houses = await env.ASSETS.fetch(new Request(url.origin + '/data.json')).then(r => r.json()).catch(() => []);
  const h = houses.find(x => x.id === body.listingId);
  if (!h) return json({error: 'listing'}, 404);
  const closed = [].concat(h.status || []).map(v => String(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))
    .some(k => k === 'predane' || k === 'prenajate');
  if (closed) return json({error: 'closed'}, 409);
  const code = h.code || String(h.id).toUpperCase();

  // Je človek na serveri?
  const g = env.DISCORD_GUILD_ID;
  const member = await bot(env, `/guilds/${g}/members/${s.id}`).catch(() => null);
  if (!member) return json({error: 'not_member'}, 403);

  // Už má ticket k tejto ponuke? Alebo priveľa otvorených?
  const channels = await bot(env, `/guilds/${g}/channels`);
  const mine = channels.filter(c => c.parent_id === env.DISCORD_CATEGORY_ID && (c.topic || '').includes('uid:' + s.id));
  const same = mine.find(c => (c.topic || '').includes('kod:' + code + ' '));
  if (same) return json({ok: true, existing: true, url: `https://discord.com/channels/${g}/${same.id}`, code});
  if (mine.length >= MAX_OPEN_TICKETS) return json({error: 'too_many', max: MAX_OPEN_TICKETS}, 429);

  // Maklér ponuky (ak má v makleri.json vyplnené "discordId", dostane prístup a označenie)
  const agents = await env.ASSETS.fetch(new Request(url.origin + '/makleri.json')).then(r => r.ok ? r.json() : []).catch(() => []);
  const agent = h.agent && agents.find(a => a.id === h.agent);
  const agentId = agent && /^\d{15,22}$/.test(String(agent.discordId || '')) ? String(agent.discordId) : '';

  const overwrites = [
    {id: g, type: 0, allow: '0', deny: String(P.VIEW)},                                  // @everyone nevidí
    {id: s.id, type: 1, allow: String(MEMBER_ALLOW), deny: '0'},                          // zákazník
    {id: env.DISCORD_CLIENT_ID, type: 1, allow: String(BOT_ALLOW), deny: '0'}             // bot
  ];
  const staffRoles = String(env.DISCORD_STAFF_ROLE_ID || '').split(/[\s,;]+/).filter(r => /^\d{15,22}$/.test(r));
  staffRoles.forEach(r => overwrites.push({id: r, type: 0, allow: String(STAFF_ALLOW), deny: '0'}));
  if (agentId && agentId !== s.id) overwrites.push({id: agentId, type: 1, allow: String(STAFF_ALLOW), deny: '0'});

  // Krátky názov kanála: email-014-meno (číslo z kódu ponuky ONX-014, meno max. 16 znakov)
  const norm = v => String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const num = (/(\d+)$/.exec(h.code || '') || [])[1];
  const chName = ['email', num, norm(s.username).slice(0, 16).replace(/-+$/, '')].filter(Boolean).join('-');
  const ch = await bot(env, `/guilds/${g}/channels`, 'POST', {
    name: chName, type: 0, parent_id: env.DISCORD_CATEGORY_ID,
    topic: `${String(h.name).slice(0, 200)} · kod:${code} · uid:${s.id}`, permission_overwrites: overwrites
  });

  // Úvodná správa s údajmi
  const money = n => Number(n).toLocaleString('sk-SK') + ' $';
  const periods = {den: 'deň', tyzden: 'týždeň', mesiac: 'mesiac'};
  const price = [typeof h.price === 'number' && 'Predaj: ' + money(h.price),
                 typeof h.rent === 'number' && 'Prenájom: ' + money(h.rent) + ' / ' + (periods[h.rentPeriod] || 'mesiac')]
                .filter(Boolean).join('\n') || 'Na vyžiadanie';
  const pageUrl = url.origin + '/nehnutelnost.html?id=' + encodeURIComponent(h.id);
  const photo = (h.photos || [])[0];
  const fields = [
    {name: 'Kód ponuky', value: code, inline: true},
    {name: 'Záujem o', value: form.interest || '—', inline: true},
    {name: 'Cena', value: price, inline: true},
    {name: 'Meno a priezvisko', value: form.icName, inline: true},
    {name: 'Tel. číslo', value: form.phone, inline: true},
    {name: 'E-mail', value: form.email, inline: true},
    {name: 'Maklér', value: agent ? agent.name : '—', inline: true}
  ];
  if (form.when) fields.push({name: 'Termín obhliadky', value: form.when});
  if (form.message) fields.push({name: 'Správa', value: form.message});
  const pingRoles = agentId ? [] : staffRoles;
  const pings = [`<@${s.id}>`, agentId && `<@${agentId}>`, ...pingRoles.map(r => `<@&${r}>`)].filter(Boolean);
  await bot(env, `/channels/${ch.id}/messages`, 'POST', {
    content: `${pings.join(' ')}\nDobrý deň, ďakujeme za záujem o nehnuteľnosť${h.code ? ' **' + h.code + '**' : ''}. Maklér vám odpovie v tomto e-maile.`,
    allowed_mentions: {users: [s.id, agentId].filter(Boolean), roles: pingRoles},
    embeds: [{
      title: 'Otvoriť inzerát na webe →', url: pageUrl, color: 0xc9a961,
      description: h.street || undefined, fields,
      thumbnail: photo ? {url: url.origin + '/' + String(photo).split('/').map(encodeURIComponent).join('/')} : undefined,
      footer: {text: `Dopyt z webu · ${s.name} (@${s.username})`}, timestamp: new Date().toISOString()
    }],
    components: [closeButtonRow()]
  }).catch(e => console.error('message', e));

  return json({ok: true, url: `https://discord.com/channels/${g}/${ch.id}`, code});
}

// ---------- Uzavretie ticketu (tlačidlo) + prepis ----------
const closeButtonRow = () => ({type: 1, components: [{type: 2, style: 4, label: 'Uzavrieť e-mail', emoji: {name: '🔒'}, custom_id: 'onyx_close'}]});

async function interactions(req, env, ctx) {
  if (req.method !== 'POST') return json({error: 'method'}, 405);
  const body = await req.text();
  if (!(await verifyDiscord(env, req, body))) return new Response('invalid request signature', {status: 401});
  const it = JSON.parse(body);
  if (it.type === 1) return json({type: 1});                                         // PING od Discordu
  if (it.type !== 3) return json({type: 4, data: {flags: 64, content: 'Neznáma akcia.'}});
  const id = it.data && it.data.custom_id;
  const user = (it.member && it.member.user) || it.user || {};

  if (id === 'onyx_close') {                                                          // 1. klik → potvrdenie (vidí ho len ten, kto klikol)
    return json({type: 4, data: {flags: 64, content: 'Naozaj chcete tento e-mail uzavrieť? Kanál sa zmaže a uloží sa jeho kópia.',
      components: [{type: 1, components: [
        {type: 2, style: 4, label: 'Áno, uzavrieť', custom_id: 'onyx_close_yes'},
        {type: 2, style: 2, label: 'Zrušiť', custom_id: 'onyx_close_no'}]}]}});
  }
  if (id === 'onyx_close_no') return json({type: 7, data: {content: 'Zrušené.', components: []}});
  if (id === 'onyx_close_yes') {
    ctx.waitUntil(closeTicket(env, it.channel_id, user).catch(e => console.error('close', e)));
    return json({type: 7, data: {content: 'Uzatváram, chvíľu strpenia…', components: []}});
  }
  return json({type: 4, data: {flags: 64, content: 'Neznáma akcia.'}});
}

async function closeTicket(env, channelId, user) {
  const ch = await bot(env, `/channels/${channelId}`);
  if (ch.parent_id !== env.DISCORD_CATEGORY_ID) return;                              // len kanály z našej kategórie
  const who = user.global_name || user.username || 'neznámy';
  await bot(env, `/channels/${channelId}/messages`, 'POST', {content: `🔒 E-mail uzavrel/a **${who}**. Kanál sa o chvíľu zmaže.`}).catch(() => {});

  // Všetky správy (po 100), od najstaršej
  let msgs = [], before = '';
  for (let i = 0; i < 50; i++) {
    const page = await bot(env, `/channels/${channelId}/messages?limit=100${before ? '&before=' + before : ''}`);
    msgs = msgs.concat(page);
    if (page.length < 100) break;
    before = page[page.length - 1].id;
  }
  msgs.reverse();

  const customerId = ((ch.topic || '').match(/uid:(\d+)/) || [])[1];
  const code = ((ch.topic || '').match(/kod:(\S+)/) || [])[1] || '';
  const roles = {};
  try { (await bot(env, `/guilds/${env.DISCORD_GUILD_ID}/roles`)).forEach(r => roles[r.id] = r.name); } catch (e) {}
  const html = transcriptText(ch, msgs, who, roles);
  const fileName = `prepis-${ch.name}.txt`;
  const people = [...new Set(msgs.filter(m => !m.author.bot).map(m => m.author.global_name || m.author.username))];
  const summary = {
    title: `Prepis: #${ch.name}`, color: 0xc9a961, timestamp: new Date().toISOString(),
    fields: [
      {name: 'Kód ponuky', value: code || '—', inline: true},
      {name: 'Zákazník', value: customerId ? `<@${customerId}>` : '—', inline: true},
      {name: 'Uzavrel/a', value: user.id ? `<@${user.id}>` : who, inline: true},
      {name: 'Správ', value: String(msgs.length), inline: true},
      {name: 'Účastníci', value: people.join(', ').slice(0, 1000) || '—'}
    ]
  };
  if (env.DISCORD_TRANSCRIPT_CHANNEL_ID)
    await sendFile(env, `/channels/${env.DISCORD_TRANSCRIPT_CHANNEL_ID}/messages`, {embeds: [summary], allowed_mentions: {parse: []}}, fileName, html)
      .catch(e => console.error('transcript', e));
  // Kópia aj zákazníkovi do súkromnej správy (ak má povolené správy zo servera)
  if (customerId) {
    try {
      const dm = await bot(env, '/users/@me/channels', 'POST', {recipient_id: customerId});
      await sendFile(env, `/channels/${dm.id}/messages`, {content: `Dobrý deň, váš e-mail s ONYX Real Estate${code ? ' k ponuke **' + code + '**' : ''} bol uzavretý. Posielame vám jeho kópiu. Ďakujeme!`}, fileName, html);
    } catch (e) { console.log('dm', e.message); }
  }
  await new Promise(r => setTimeout(r, 3000));
  await bot(env, `/channels/${channelId}`, 'DELETE');
}

async function sendFile(env, path, payload, name, text) {
  const fd = new FormData();
  fd.append('payload_json', JSON.stringify({...payload, attachments: [{id: 0, filename: name}]}));
  fd.append('files[0]', new Blob([text], {type: 'text/plain; charset=utf-8'}), name);
  const r = await fetch(API + path, {method: 'POST', headers: {Authorization: 'Bot ' + env.DISCORD_BOT_TOKEN}, body: fd});
  if (!r.ok) throw new Error(`Discord ${r.status} ${path}: ${await r.text()}`);
  return r.json();
}

// Prepis ako čistý text – Discord ho zobrazí priamo v náhľade súboru
function transcriptText(ch, msgs, closedBy, roles) {
  const fmt = t => new Date(t).toLocaleString('sk-SK', {timeZone: 'Europe/Bratislava', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'});
  const names = {};
  msgs.forEach(m => { names[m.author.id] = m.author.global_name || m.author.username; (m.mentions || []).forEach(u => names[u.id] = u.global_name || u.username); });
  const clean = t => String(t || '')
    .replace(/<@!?(\d+)>/g, (_, id) => '@' + (names[id] || 'používateľ'))
    .replace(/<@&(\d+)>/g, (_, id) => '@' + (roles[id] || 'rola'))
    .replace(/<#(\d+)>/g, '#kanál')
    .replace(/<a?:(\w+):\d+>/g, ':$1:')
    .replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1');
  const indent = t => clean(t).split('\n').map(l => '   ' + l).join('\n');
  const topic = (ch.topic || '').replace(/ · uid:\d+/, '').replace('kod:', 'Kód: ');
  const line = '═'.repeat(60);
  const out = [
    'ONYX REAL ESTATE – PREPIS E-MAILU', line,
    'Kanál:     #' + ch.name,
    topic ? 'Ponuka:    ' + topic : '',
    'Uzavreté:  ' + fmt(Date.now()) + ' (uzavrel/a ' + closedBy + ')',
    'Správ:     ' + msgs.length, line
  ].filter(v => v !== '');
  out.push('');
  msgs.forEach(m => {
    out.push(`[${fmt(m.timestamp)}] ${m.author.global_name || m.author.username}${m.author.bot ? ' (systém)' : ''}`);
    if (m.content) out.push(indent(m.content));
    (m.embeds || []).forEach(em => {
      if (em.title) out.push('   ┌ ' + clean(em.title));
      if (em.description) out.push('   │ ' + clean(em.description));
      (em.fields || []).forEach(f => out.push('   │ ' + clean(f.name) + ': ' + clean(f.value).replace(/\n/g, ', ')));
      out.push('   └');
    });
    (m.attachments || []).forEach(a => out.push('   📎 Príloha: ' + a.filename + ' – ' + a.url));
    if (!m.content && !(m.embeds || []).length && !(m.attachments || []).length) out.push('   (prázdna správa)');
    out.push('');
  });
  out.push(line, 'Koniec prepisu');
  return out.join('\n');
}

// Overenie, že požiadavka naozaj prišla od Discordu (Ed25519 podpis)
async function verifyDiscord(env, req, body) {
  const sig = req.headers.get('X-Signature-Ed25519'), ts = req.headers.get('X-Signature-Timestamp');
  if (!sig || !ts || !env.DISCORD_PUBLIC_KEY) return false;
  const hex = h => new Uint8Array(h.match(/.{2}/g).map(b => parseInt(b, 16)));
  try {
    let key;
    try { key = await crypto.subtle.importKey('raw', hex(env.DISCORD_PUBLIC_KEY), {name: 'Ed25519'}, false, ['verify']); }
    catch (e) { key = await crypto.subtle.importKey('raw', hex(env.DISCORD_PUBLIC_KEY), {name: 'NODE-ED25519', namedCurve: 'NODE-ED25519'}, false, ['verify']); }
    return await crypto.subtle.verify(key.algorithm.name === 'Ed25519' ? 'Ed25519' : {name: 'NODE-ED25519'}, key, hex(sig), new TextEncoder().encode(ts + body));
  } catch (e) { return false; }
}

// ---------- Pomocníci ----------
async function bot(env, path, method = 'GET', body) {
  const r = await fetch(API + path, {method, headers: {Authorization: 'Bot ' + env.DISCORD_BOT_TOKEN,
    ...(body ? {'Content-Type': 'application/json'} : {})}, body: body ? JSON.stringify(body) : undefined});
  if (r.status === 204) return {};
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Discord ${r.status} ${path}: ${data.message || ''}`);
  return data;
}
const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}});
const redirect = to => new Response(null, {status: 302, headers: {Location: to}});
const cookie = (name, value, maxAge) => `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
const getCookie = (req, name) => ((req.headers.get('Cookie') || '').match(new RegExp('(?:^|; )' + name + '=([^;]*)')) || [])[1] || '';
const safeBack = b => (b && /^\/[^/\\]/.test(b) ? b : '/').slice(0, 500);
const addParam = (path, k, v) => path + (path.includes('?') ? '&' : '?') + k + '=' + encodeURIComponent(v);

// Podpísané údaje v cookie (HMAC), aby sa nedali sfalšovať
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const hmacKey = env => crypto.subtle.importKey('raw', new TextEncoder().encode('onyx:' + env.DISCORD_CLIENT_SECRET),
  {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify']);
async function sign(env, obj) {
  const data = b64u(new TextEncoder().encode(JSON.stringify(obj)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), new TextEncoder().encode(data));
  return data + '.' + b64u(sig);
}
async function verify(env, token) {
  try {
    const [data, sig] = String(token).split('.');
    if (!data || !sig) return null;
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(env), unb64u(sig), new TextEncoder().encode(data));
    if (!ok) return null;
    const obj = JSON.parse(new TextDecoder().decode(unb64u(data)));
    return obj.exp > Date.now() ? obj : null;
  } catch (e) { return null; }
}
