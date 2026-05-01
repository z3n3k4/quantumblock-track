/* ============================================================
   QuantumBlock — shared app logic
   - i18n (ES/EN)
   - Theme (dark/light)
   - Hash chain prominence
   - Mock signals + empty state
   - Tweaks panel host protocol (vanilla)
   ============================================================ */

const I18N = {
  es: {
    nav_track: "Track Record",
    nav_landing: "Inicio",
    nav_verify: "Verificar",
    status_live: "Cadena viva",
    last_update: "Última actualización",

    track_kicker: "Track record auditable",
    track_title: "Cada señal, encadenada.",
    track_sub: "Historial inmutable de señales BTC. Hash chain SHA256, verificable independientemente. Sin retoques. Sin huecos.",

    metric_total: "Señales emitidas",
    metric_open: "Abiertas",
    metric_closed: "Cerradas",
    metric_win: "Win rate",
    metric_winsub: "% que tocó al menos TP1",
    metric_tp1: "TP1 hit rate",
    metric_tp2: "TP2 hit rate",
    metric_tp3: "TP3 hit rate",
    metric_avg: "PnL promedio",
    metric_avgsub: "Asumiendo escalonado por TP",
    metric_best: "Mejor trade",
    metric_worst: "Peor trade",

    chain_title: "Cadena de bloques",
    chain_sub: "Cada bloque referencia el hash del anterior. Modificar uno rompe la cadena.",

    open_title: "Posiciones abiertas",
    open_empty: "No hay posiciones abiertas en este momento.",

    history_title: "Histórico completo",
    history_filter_all: "Todas",
    history_filter_long: "Long",
    history_filter_short: "Short",
    history_filter_win: "Win",
    history_filter_loss: "Loss",
    history_search: "Buscar id, símbolo, hash…",

    th_id: "#",
    th_date: "Fecha",
    th_sym: "Symbol",
    th_dir: "Dir",
    th_entry: "Entry",
    th_sl: "SL",
    th_tp1: "TP1",
    th_tp2: "TP2",
    th_tp3: "TP3",
    th_status: "Estado",
    th_pnl: "PnL",
    th_hash: "Hash",
    empty_table: "Aún no hay señales en el track record. Las primeras aparecerán cuando QuantumBlock dispare alertas.",

    dist_title: "Distribuciones",
    dist_pnl: "PnL por trade (%)",
    dist_hold: "Hold time (h)",
    dist_rr: "R:R alcanzado",

    verify_title: "¿Cómo verificar?",
    verify_p1: "Cada fila incluye un row_hash (SHA256) que enlaza con la fila anterior, formando una cadena inmutable. Si alguien modifica un valor histórico, el hash cambia y la cadena se rompe.",
    verify_p2: "Descarga signals.json o signals.csv y ejecuta el script de verify.md. Reproducible en 5 líneas de Python.",
    verify_genesis: "Genesis hash",

    // landing
    hero_kicker: "Señales BTC · Track record verificable",
    hero_title: "Operamos. Lo grabamos en piedra criptográfica.",
    hero_sub: "QuantumBlock publica señales de BTC con entry, SL y tres targets escalonados — y las encadena con SHA256. Cada bloque referencia al anterior. Si tocamos historia, se rompe la cadena. Cualquiera puede verificarlo.",
    hero_cta: "Ver track record",
    hero_cta2: "Cómo verificar",

    live_label: "STATS EN VIVO · cadena pública",
    live_total: "Señales",
    live_chain: "Bloques en cadena",
    live_uptime: "Uptime cadena",

    how_kicker: "Cómo funciona",
    how_title: "Tres pasos. Cero opacidad.",
    how_1_t: "01 · Señal",
    how_1_d: "Detectamos un setup. Publicamos entry, stop loss y tres targets escalonados (TP1 / TP2 / TP3). Timestamp UTC al segundo.",
    how_2_t: "02 · Vida del trade",
    how_2_d: "Binance es el oráculo. Si el precio toca un nivel, el bot lo registra con timestamp. Cierre por SL, TP3, o tiempo.",
    how_3_t: "03 · Auditoría",
    how_3_d: "Cada fila publicada tiene un SHA256 que depende del row_hash anterior. Re-ejecuta el script y comprueba la cadena tú mismo.",

    anatomy_kicker: "Anatomía de una señal",
    anatomy_title: "Un bloque, ocho campos materiales.",
    anatomy_sub: "Estos campos están en la cadena. Cualquier cambio rompe el hash. El resto (TP hits, cierre) son transiciones observables verificables contra el histórico de Binance.",

    why_kicker: "Por qué importa",
    why_title: "Track records no verificables son ficción.",
    why_p: "Casi cualquier cuenta de señales puede borrar pérdidas, editar entries o publicar solo ganadores. Una cadena de hashes hace eso imposible: cada modificación deja huella matemática. Tú no tienes que confiar — comprueba.",
    why_b1: "Inmutabilidad",
    why_b1d: "SHA256 + chaining. Modificar es romper.",
    why_b2: "Reproducible",
    why_b2d: "Script Python de 30 líneas. Sin servicios.",
    why_b3: "Oráculo neutro",
    why_b3d: "Binance OHLC. No nuestra base de datos.",
    why_b4: "Datos abiertos",
    why_b4d: "JSON + CSV. Sin login. Sin paywall.",

    pricing_kicker: "Acceso",
    pricing_title: "Lista de espera abierta.",
    pricing_sub: "El track record es público para siempre. Las señales en vivo se distribuyen por Telegram a un grupo limitado.",
    pricing_input: "tu@email.com",
    pricing_cta: "Unirme",
    pricing_note: "Te avisamos cuando abramos plazas. Cero spam.",

    footer_legal: "Información histórica auditable. No constituye asesoramiento financiero.",
  },
  en: {
    nav_track: "Track Record",
    nav_landing: "Home",
    nav_verify: "Verify",
    status_live: "Chain live",
    last_update: "Last update",

    track_kicker: "Auditable track record",
    track_title: "Every signal. Chained.",
    track_sub: "Immutable BTC signal history. SHA256 hash chain, independently verifiable. No edits. No gaps.",

    metric_total: "Signals issued",
    metric_open: "Open",
    metric_closed: "Closed",
    metric_win: "Win rate",
    metric_winsub: "% that hit at least TP1",
    metric_tp1: "TP1 hit rate",
    metric_tp2: "TP2 hit rate",
    metric_tp3: "TP3 hit rate",
    metric_avg: "Avg PnL",
    metric_avgsub: "Assuming scaled exits per TP",
    metric_best: "Best trade",
    metric_worst: "Worst trade",

    chain_title: "Block chain",
    chain_sub: "Each block references the previous hash. Tamper one, break the rest.",

    open_title: "Open positions",
    open_empty: "No open positions right now.",

    history_title: "Full history",
    history_filter_all: "All",
    history_filter_long: "Long",
    history_filter_short: "Short",
    history_filter_win: "Win",
    history_filter_loss: "Loss",
    history_search: "Search id, symbol, hash…",

    th_id: "#",
    th_date: "Date",
    th_sym: "Symbol",
    th_dir: "Dir",
    th_entry: "Entry",
    th_sl: "SL",
    th_tp1: "TP1",
    th_tp2: "TP2",
    th_tp3: "TP3",
    th_status: "Status",
    th_pnl: "PnL",
    th_hash: "Hash",
    empty_table: "No signals in the track record yet. The first ones will appear once QuantumBlock fires alerts.",

    dist_title: "Distributions",
    dist_pnl: "PnL per trade (%)",
    dist_hold: "Hold time (h)",
    dist_rr: "Realized R:R",

    verify_title: "How to verify",
    verify_p1: "Every row carries a row_hash (SHA256) chained to the previous row. Modifying any historical value changes the hash and breaks the chain.",
    verify_p2: "Download signals.json or signals.csv and run the script in verify.md. Reproducible in 5 lines of Python.",
    verify_genesis: "Genesis hash",

    hero_kicker: "BTC signals · Verifiable track record",
    hero_title: "We trade. We carve it in cryptographic stone.",
    hero_sub: "QuantumBlock publishes BTC signals with entry, SL and three scaled targets — and chains them with SHA256. Each block references the previous one. Touch history, the chain breaks. Anyone can verify.",
    hero_cta: "View track record",
    hero_cta2: "How to verify",

    live_label: "LIVE STATS · public chain",
    live_total: "Signals",
    live_chain: "Chained blocks",
    live_uptime: "Chain uptime",

    how_kicker: "How it works",
    how_title: "Three steps. Zero opacity.",
    how_1_t: "01 · Signal",
    how_1_d: "We detect a setup. Publish entry, stop loss, three scaled targets (TP1 / TP2 / TP3). UTC timestamp to the second.",
    how_2_t: "02 · Trade life",
    how_2_d: "Binance is the oracle. If price touches a level, the bot logs it with a timestamp. Close on SL, TP3, or time.",
    how_3_t: "03 · Audit",
    how_3_d: "Every published row has a SHA256 hash depending on the previous row_hash. Re-run the script and walk the chain yourself.",

    anatomy_kicker: "Signal anatomy",
    anatomy_title: "One block. Eight material fields.",
    anatomy_sub: "These fields are in the chain. Any change breaks the hash. The rest (TP hits, close) are observable transitions, verifiable against Binance OHLC.",

    why_kicker: "Why it matters",
    why_title: "Unverifiable track records are fiction.",
    why_p: "Almost any signal account can quietly delete losers, edit entries, or surface only winners. A hash chain makes that impossible: every change leaves a mathematical fingerprint. You don't trust — you check.",
    why_b1: "Immutability",
    why_b1d: "SHA256 + chaining. Modify equals break.",
    why_b2: "Reproducible",
    why_b2d: "30-line Python script. No services.",
    why_b3: "Neutral oracle",
    why_b3d: "Binance OHLC. Not our database.",
    why_b4: "Open data",
    why_b4d: "JSON + CSV. No login. No paywall.",

    pricing_kicker: "Access",
    pricing_title: "Waitlist open.",
    pricing_sub: "The track record is public forever. Live signals go out via Telegram to a limited group.",
    pricing_input: "your@email.com",
    pricing_cta: "Join",
    pricing_note: "We'll ping you when seats open. Zero spam.",

    footer_legal: "Historical, auditable information. Not financial advice.",
  }
};

const Tweaks = (() => {
  const KEY = 'qb_tweaks_v1';
  const defaults = { theme: 'dark', hashProm: 'hero', lang: 'es', bgIntensity: 'normal' };
  let state = { ...defaults };
  try { state = { ...defaults, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch {}
  const subs = [];

  function apply() {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.documentElement.setAttribute('data-hash-prom', state.hashProm);
    document.documentElement.setAttribute('lang', state.lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (I18N[state.lang] && I18N[state.lang][k]) el.textContent = I18N[state.lang][k];
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const [attr, key] = el.getAttribute('data-i18n-attr').split(':');
      if (I18N[state.lang] && I18N[state.lang][key]) el.setAttribute(attr, I18N[state.lang][key]);
    });
    subs.forEach(fn => fn(state));
  }
  function set(patch) {
    state = { ...state, ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    apply();
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*'); } catch {}
  }
  function get() { return { ...state }; }
  function onChange(fn) { subs.push(fn); }

  return { apply, set, get, onChange };
})();

/* ============== Mock data (deterministic) ============== */
function genMockSignals(count = 36) {
  // deterministic pseudo-random
  let seed = 0xBEEF;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed % 10000) / 10000; };
  const out = [];
  let prev_hash = "0".repeat(64);
  let t = Date.UTC(2026, 0, 8, 11, 0, 0); // start
  for (let i = 1; i <= count; i++) {
    const dir = rnd() > 0.45 ? "long" : "short";
    const entry = 60000 + Math.round((rnd()-0.5) * 25000);
    const slDist = entry * (0.012 + rnd() * 0.018);
    const tpStep = entry * (0.014 + rnd() * 0.022);
    const sl  = dir === "long" ? entry - slDist : entry + slDist;
    const tp1 = dir === "long" ? entry + tpStep : entry - tpStep;
    const tp2 = dir === "long" ? entry + tpStep*2 : entry - tpStep*2;
    const tp3 = dir === "long" ? entry + tpStep*3.4 : entry - tpStep*3.4;

    // outcome
    const r = rnd();
    let status, tp1_hit=false, tp2_hit=false, tp3_hit=false, close_reason, pnl;
    if (i > count - 3) {
      status = "open"; close_reason = null;
      if (r > 0.5) tp1_hit = true;
      pnl = null;
    } else if (r < 0.20) {
      status = "loss"; close_reason = "sl"; pnl = -((slDist/entry)*100);
    } else if (r < 0.45) {
      status = "win-partial"; tp1_hit = true; close_reason = "time";
      pnl = ((tpStep/entry)*100) * 0.4;
    } else if (r < 0.75) {
      status = "win-full"; tp1_hit = tp2_hit = true; close_reason = "tp2";
      pnl = ((tpStep/entry)*100) * 1.4;
    } else {
      status = "win-full"; tp1_hit = tp2_hit = tp3_hit = true; close_reason = "tp3";
      pnl = ((tpStep/entry)*100) * 2.5;
    }
    // hash
    const material = `${i}|${t}|BTCUSDT|${dir}|${entry.toFixed(2)}|${sl.toFixed(2)}|${tp1.toFixed(2)}|${tp2.toFixed(2)}|${tp3.toFixed(2)}`;
    const row_hash = fakeHash(prev_hash + "|" + material, i);
    out.push({
      id: i,
      ts: t,
      symbol: "BTCUSDT",
      direction: dir,
      timeframe: rnd()>0.5 ? "4h" : "1h",
      entry, sl, tp1, tp2, tp3,
      tp1_hit, tp2_hit, tp3_hit,
      status, close_reason,
      pnl,
      prev_hash, row_hash,
      hold_h: status === "open" ? null : Math.round(2 + rnd()*46)
    });
    prev_hash = row_hash;
    t += (3 + Math.floor(rnd()*16)) * 3600 * 1000;
  }
  return out;
}
function fakeHash(input, i) {
  // deterministic 64-hex string (visual only — not real SHA256)
  let h = 0xa1b2c3d4 ^ i;
  for (let k = 0; k < input.length; k++) h = ((h << 5) - h + input.charCodeAt(k)) | 0;
  let s = "";
  let v = h >>> 0;
  for (let k = 0; k < 64; k++) {
    v = (v * 1664525 + 1013904223) >>> 0;
    s += "0123456789abcdef"[(v >>> ((k%8)*4)) & 0xf];
  }
  return s;
}

/* ============== formatters ============== */
const fmt = {
  px: n => n == null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }),
  pct: n => n == null ? "—" : (n>=0?"+":"") + n.toFixed(2) + "%",
  date: t => {
    const d = new Date(t);
    const pad = x => String(x).padStart(2,"0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  },
  shortHash: h => h.slice(0,10),
};

/* ============== Header chain strip (block stream) ============== */
function mountHelix(container) {
  if (!container) return;
  // Generate a stream of fake blocks; some win, some loss, some open
  function rndHex(n) {
    let s = ''; const c = '0123456789abcdef';
    for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * 16)];
    return s;
  }
  const states = [
    { cls: 'win',  pnl: () => '+' + (Math.random() * 7 + 0.4).toFixed(2) + '%', cls2: 'pos' },
    { cls: 'win',  pnl: () => '+' + (Math.random() * 4 + 0.2).toFixed(2) + '%', cls2: 'pos' },
    { cls: 'loss', pnl: () => '−' + (Math.random() * 1.6 + 0.6).toFixed(2) + '%', cls2: 'neg' },
    { cls: 'open', pnl: () => '···', cls2: 'opn' },
    { cls: 'win',  pnl: () => '+' + (Math.random() * 11 + 1).toFixed(2) + '%', cls2: 'pos' },
  ];
  const N = 24;
  const blocks = [];
  blocks.push({ cls: 'genesis', id: '000', hash: '0000000000', pnl: 'GEN', cls2: '' });
  for (let i = 1; i <= N; i++) {
    const s = states[Math.floor(Math.random() * states.length)];
    blocks.push({
      cls: s.cls, id: String(i).padStart(3, '0'),
      hash: rndHex(10), pnl: s.pnl(), cls2: s.cls2,
    });
  }

  function render(arr) {
    return arr.map((b, i) =>
      `${i ? '<div class="bs-link"></div>' : ''}` +
      `<div class="bs-block ${b.cls}">` +
        `<div class="bs-id">// <b>#${b.id}</b></div>` +
        `<div class="bs-hash">${b.hash}</div>` +
        `<div class="bs-pnl ${b.cls2}">${b.pnl}</div>` +
      `</div>`
    ).join('');
  }
  // duplicate for seamless loop
  const html = render(blocks) + '<div class="bs-link"></div>' + render(blocks);

  const wrap = document.createElement('div');
  wrap.className = 'block-stream';
  wrap.innerHTML = `<div class="block-stream-track">${html}</div>`;
  container.appendChild(wrap);
}

window.QB = { I18N, Tweaks, genMockSignals, fakeHash, fmt, mountHelix };
/* v3 — block stream */
