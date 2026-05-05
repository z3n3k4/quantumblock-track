/* ============================================================
   QuantumBlock — Track Record page logic
   ============================================================ */

(function() {
  const { I18N, Tweaks, genMockSignals, fmt } = window.QB;

  // local page state
  let pageState = (() => {
    try { return JSON.parse(localStorage.getItem('qb_track_state')) || {}; } catch { return {}; }
  })();
  function persistPage(patch) {
    pageState = { ...pageState, ...patch };
    try { localStorage.setItem('qb_track_state', JSON.stringify(pageState)); } catch {}
  }

  // Listen for tweak-driven state changes
  if (!pageState.state) pageState.state = 'populated';
  if (!pageState.filter) pageState.filter = 'all';
  if (!pageState.sort) pageState.sort = { key: 'id', dir: 'desc' };
  if (!pageState.search) pageState.search = '';

  let signals = [];
  let usingRealData = false;

  // -------------- normalise signals.json → internal format --------------
  function normalizeFromAPI(s) {
    const tp1_hit = !!s.tp1_hit_at;
    const tp2_hit = !!s.tp2_hit_at;
    const tp3_hit = !!s.tp3_hit_at;
    const closed  = !!s.closed_at;

    let status;
    if (!closed)                        status = 'open';
    else if (s.close_reason === 'sl')   status = 'loss';
    else if (tp1_hit && !tp2_hit)       status = 'win-partial';
    else                                status = 'win';

    // ISO strings from Python: "2026-04-30 11:14:08 UTC" → normalize for Date()
    const toISO = str => str ? str.replace(' ', 'T').replace(' UTC', 'Z') : null;
    const ts = new Date(toISO(s.timestamp_emision)).getTime();

    let hold_h = null;
    if (closed && s.closed_at) {
      const ms = new Date(toISO(s.closed_at)) - new Date(toISO(s.timestamp_emision));
      if (!isNaN(ms)) hold_h = ms / 3600000;
    }

    return {
      id: s.id,
      ts,
      symbol: s.symbol,
      direction: s.direction,
      timeframe: s.timeframe,
      entry: s.entry_price,
      sl: s.stop_loss,
      tp1: s.target_1,
      tp2: s.target_2,
      tp3: s.target_3,
      pnl: s.pnl_pct,
      tp1_hit, tp2_hit, tp3_hit,
      status,
      close_reason: s.close_reason || '',
      row_hash: s.row_hash || '0'.repeat(64),
      hold_h,
      source_label: (s.source || '').toLowerCase() === 'quantumblock_model' ? 'AI/LM' : 'Strategy',
    };
  }

  // -------------- compute metrics --------------
  function computeMetrics(rows) {
    const total = rows.length;
    const open = rows.filter(r => r.status === 'open').length;
    const closed = total - open;
    const closedRows = rows.filter(r => r.status !== 'open');
    const winRows = closedRows.filter(r => r.tp1_hit);
    const win_rate = closed ? (winRows.length / closed) * 100 : null;
    const tp1_rate = closed ? (closedRows.filter(r=>r.tp1_hit).length/closed)*100 : null;
    const tp2_rate = closed ? (closedRows.filter(r=>r.tp2_hit).length/closed)*100 : null;
    const tp3_rate = closed ? (closedRows.filter(r=>r.tp3_hit).length/closed)*100 : null;
    const pnls = closedRows.map(r=>r.pnl).filter(x=>x!=null);
    const avg = pnls.length ? pnls.reduce((a,b)=>a+b,0)/pnls.length : null;
    const best = pnls.length ? Math.max(...pnls) : null;
    const worst = pnls.length ? Math.min(...pnls) : null;
    return { total, open, closed, win_rate, tp1_rate, tp2_rate, tp3_rate, avg, best, worst };
  }

  // -------------- render metrics --------------
  function renderMetrics(m) {
    const t = I18N[Tweaks.get().lang];
    const cells = [
      { lbl: t.metric_total, val: m.total, sub: '' },
      { lbl: t.metric_open, val: m.open, sub: '', cls: m.open ? 'warn' : 'muted' },
      { lbl: t.metric_closed, val: m.closed, sub: '' },
      { lbl: t.metric_win, val: m.win_rate==null?'—':m.win_rate.toFixed(1)+'%', sub: t.metric_winsub, cls: m.win_rate>=50?'pos':(m.win_rate==null?'':'neg') },
      { lbl: t.metric_tp1, val: m.tp1_rate==null?'—':m.tp1_rate.toFixed(1)+'%' },
      { lbl: t.metric_tp2, val: m.tp2_rate==null?'—':m.tp2_rate.toFixed(1)+'%' },
      { lbl: t.metric_tp3, val: m.tp3_rate==null?'—':m.tp3_rate.toFixed(1)+'%' },
      { lbl: t.metric_avg, val: m.avg==null?'—':fmt.pct(m.avg), sub: t.metric_avgsub, cls: m.avg>0?'pos':(m.avg==null?'':'neg') },
      { lbl: t.metric_best, val: m.best==null?'—':fmt.pct(m.best), cls: 'pos' },
      { lbl: t.metric_worst, val: m.worst==null?'—':fmt.pct(m.worst), cls: 'neg' },
    ];
    document.getElementById('metrics-grid').innerHTML = cells.map(c => `
      <div class="metric">
        <div class="lbl">${c.lbl}</div>
        <div class="val ${c.cls||''}">${c.val}</div>
        ${c.sub ? `<div class="sub">${c.sub}</div>` : ''}
      </div>
    `).join('');
  }

  // -------------- render chain visualization --------------
  function renderChain(rows) {
    const row = document.getElementById('chain-row');
    if (!rows.length) {
      row.innerHTML = `
        <div class="chain-block genesis">
          <div class="b-id">GENESIS</div>
          <div class="b-pnl">0×</div>
          <div class="b-hash">0000…0000</div>
        </div>
        <div class="chain-link"></div>
        <div style="color: var(--ink-faint); font-size: 11px; padding: 0 16px; letter-spacing: 0.06em; text-transform: uppercase;">
          waiting for signal #001 …
        </div>
      `;
      return;
    }
    // newest first → genesis at far right (or build oldest → newest with arrow)
    const sorted = [...rows].sort((a,b)=>a.id-b.id);
    const items = [];
    items.push(`
      <div class="chain-block genesis" title="Genesis">
        <div class="b-id">GENESIS</div>
        <div class="b-pnl">000…</div>
        <div class="b-hash">block #0</div>
      </div>
      <div class="chain-link"></div>
    `);
    sorted.forEach((s, idx) => {
      const cls = s.status === 'open' ? 'open' : (s.status === 'loss' ? 'loss' : 'win');
      const pnl = s.pnl == null ? '···' : fmt.pct(s.pnl);
      const pnlCls = s.pnl == null ? 'warn' : (s.pnl >= 0 ? 'pos' : 'neg');
      items.push(`
        <div class="chain-block ${cls} chain-block--linked" data-id="${s.id}" title="Ver señal #${String(s.id).padStart(3,'0')} en el histórico">
          <div class="b-id">#${String(s.id).padStart(3,'0')} · ${s.direction.toUpperCase()}</div>
          <div class="b-pnl ${pnlCls}">${pnl}</div>
          <div class="b-hash" data-hash="${s.row_hash}" title="${s.row_hash}">${fmt.shortHash(s.row_hash)}…</div>
        </div>
      `);
      if (idx < sorted.length - 1) items.push(`<div class="chain-link"></div>`);
    });
    items.push(`
      <div class="chain-link"></div>
      <div class="chain-block" style="border-style: dashed; opacity: 0.5;">
        <div class="b-id">PENDING</div>
        <div class="b-pnl" style="color: var(--ink-faint); font-size: 12px;">awaiting</div>
        <div class="b-hash">…</div>
      </div>
    `);
    row.innerHTML = items.join('');
    // scroll to the right (tip of chain)
    requestAnimationFrame(() => {
      const canvas = row.parentElement;
      canvas.scrollLeft = canvas.scrollWidth;
    });
  }

  // -------------- open positions panel --------------
  function renderOpen(rows) {
    const t = I18N[Tweaks.get().lang];
    const opens = rows.filter(r => r.status === 'open');
    document.getElementById('open-count').textContent = opens.length ? `${opens.length} active` : '0';
    const root = document.getElementById('open-list');
    if (!opens.length) {
      root.innerHTML = `<div style="padding: 32px 20px; text-align: center; color: var(--ink-faint); font-style: italic;">${t.open_empty}</div>`;
      return;
    }
    root.innerHTML = opens.map(s => tradeCardHTML(s)).join('');
  }

  function renderRecent(rows) {
    const recent = [...rows].filter(r=>r.status!=='open').sort((a,b)=>b.id-a.id).slice(0,6);
    const root = document.getElementById('recent-list');
    if (!recent.length) {
      root.innerHTML = `<div style="padding: 32px 20px; text-align: center; color: var(--ink-faint); font-style: italic;">No closed trades yet.</div>`;
      return;
    }
    root.innerHTML = recent.map(s => tradeCardHTML(s)).join('');
  }

  function tradeCardHTML(s) {
    const tp1cls = s.tp1_hit ? 'hit' : '';
    const tp2cls = s.tp2_hit ? 'hit' : '';
    const tp3cls = s.tp3_hit ? 'hit' : '';
    const slcls  = s.close_reason === 'sl' ? 'miss-sl' : '';
    const dirTag = s.direction === 'long' ? 'long' : 'short';
    let statusTag, statusLbl;
    if (s.status === 'open') { statusTag = 'open'; statusLbl = 'OPEN'; }
    else if (s.status === 'loss') { statusTag = 'loss'; statusLbl = 'LOSS'; }
    else if (s.status === 'win-partial') { statusTag = 'win'; statusLbl = 'WIN · TP1'; }
    else { statusTag = 'win'; statusLbl = (s.tp3_hit?'WIN · TP3':'WIN · TP2'); }
    const pnl = s.pnl == null ? '···' : fmt.pct(s.pnl);
    const pnlCls = s.pnl == null ? 'warn' : (s.pnl >= 0 ? 'pos' : 'neg');
    return `
      <div class="trade-card">
        <div class="tc-id">#${String(s.id).padStart(3,'0')}</div>
        <div class="tc-mid">
          <div class="tc-row1">
            <span class="tc-sym">${s.symbol}</span>
            <span class="tag ${dirTag}">${s.direction}</span>
            <span class="tag ${statusTag}">${statusLbl}</span>
            <span class="tc-meta">${s.timeframe} · ${fmt.date(s.ts)} UTC</span>
          </div>
          <div class="tc-bar">
            <div class="seg ${slcls}">SL · ${fmt.px(s.sl)}</div>
            <div class="seg">ENT · ${fmt.px(s.entry)}</div>
            <div class="seg ${tp1cls}">TP1 · ${fmt.px(s.tp1)}</div>
            <div class="seg ${tp2cls}">TP2 · ${fmt.px(s.tp2)}</div>
            <div class="seg ${tp3cls}">TP3 · ${fmt.px(s.tp3)}</div>
          </div>
        </div>
        <div class="tc-right">
          <div class="tc-pnl ${pnlCls}">${pnl}</div>
          <div class="tc-hash" data-hash="${s.row_hash}" title="${s.row_hash}">${fmt.shortHash(s.row_hash)}…</div>
        </div>
      </div>
    `;
  }

  // -------------- distributions --------------
  function renderDistributions(rows) {
    const closed = rows.filter(r => r.status !== 'open');
    document.getElementById('closed-n').textContent = closed.length;

    if (!closed.length) {
      ['dist-pnl','dist-hold','dist-rr'].forEach(id => {
        document.getElementById(id).innerHTML = '<div style="margin: auto; color: var(--ink-faint); font-size: 11px;">no data</div>';
        const ax = document.getElementById(id+'-axis'); if (ax) ax.innerHTML = '';
      });
      return;
    }

    // PnL distribution
    const pnls = closed.map(r=>r.pnl).filter(x=>x!=null);
    const minP = Math.min(...pnls, -3);
    const maxP = Math.max(...pnls, 3);
    const buckets = 18;
    const step = (maxP - minP) / buckets;
    const counts = new Array(buckets).fill(0);
    pnls.forEach(p => {
      const idx = Math.min(buckets-1, Math.max(0, Math.floor((p - minP) / step)));
      counts[idx]++;
    });
    const maxC = Math.max(...counts, 1);
    document.getElementById('dist-pnl').innerHTML = counts.map((c,i) => {
      const center = minP + (i+0.5)*step;
      return `<div class="bar ${center<0?'neg':''}" style="height: ${Math.max(2, c/maxC*100)}%" title="${center.toFixed(1)}% : ${c}"></div>`;
    }).join('');
    document.getElementById('dist-pnl-axis').innerHTML = `<span>${minP.toFixed(1)}%</span><span>0%</span><span>${maxP.toFixed(1)}%</span>`;

    // Hold time
    const holds = closed.map(r=>r.hold_h).filter(x=>x!=null);
    const maxH = Math.max(...holds, 24);
    const hb = 12;
    const hstep = maxH / hb;
    const hc = new Array(hb).fill(0);
    holds.forEach(h => { hc[Math.min(hb-1, Math.floor(h/hstep))]++; });
    const maxHC = Math.max(...hc, 1);
    document.getElementById('dist-hold').innerHTML = hc.map(c => `<div class="bar" style="height:${Math.max(2,c/maxHC*100)}%"></div>`).join('');
    document.getElementById('dist-hold-axis').innerHTML = `<span>0h</span><span>${(maxH/2).toFixed(0)}h</span><span>${maxH.toFixed(0)}h</span>`;

    // R:R achieved (pnl% / sl distance%)
    const rrs = closed.map(r => {
      const slPct = Math.abs(r.sl - r.entry)/r.entry*100;
      return slPct ? r.pnl/slPct : 0;
    });
    const minR = Math.min(...rrs, -1);
    const maxR = Math.max(...rrs, 3);
    const rb = 14;
    const rstep = (maxR - minR)/rb;
    const rc = new Array(rb).fill(0);
    rrs.forEach(r => { rc[Math.min(rb-1, Math.max(0, Math.floor((r-minR)/rstep)))]++; });
    const maxRC = Math.max(...rc, 1);
    document.getElementById('dist-rr').innerHTML = rc.map((c,i) => {
      const center = minR + (i+0.5)*rstep;
      return `<div class="bar ${center<0?'neg':''}" style="height:${Math.max(2,c/maxRC*100)}%"></div>`;
    }).join('');
    document.getElementById('dist-rr-axis').innerHTML = `<span>${minR.toFixed(1)}R</span><span>0R</span><span>${maxR.toFixed(1)}R</span>`;
  }

  // -------------- history table --------------
  function renderTable(rows) {
    const t = I18N[Tweaks.get().lang];
    const tbody = document.getElementById('history-body');
    // filter
    let filtered = rows.slice();
    if (pageState.filter !== 'all') {
      filtered = filtered.filter(r => {
        if (pageState.filter === 'long') return r.direction==='long';
        if (pageState.filter === 'short') return r.direction==='short';
        if (pageState.filter === 'win') return r.tp1_hit && r.status!=='open';
        if (pageState.filter === 'loss') return r.status==='loss';
        return true;
      });
    }
    if (pageState.search) {
      const q = pageState.search.toLowerCase();
      filtered = filtered.filter(r =>
        String(r.id).includes(q) ||
        r.symbol.toLowerCase().includes(q) ||
        r.row_hash.includes(q)
      );
    }
    // sort
    const { key, dir } = pageState.sort;
    filtered.sort((a,b) => {
      const av = a[key], bv = b[key];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return dir==='asc' ? -1 : 1;
      if (av > bv) return dir==='asc' ? 1 : -1;
      return 0;
    });

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="13" class="empty">${t.empty_table}</td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map(s => {
      const dirTag = s.direction === 'long' ? 'long' : 'short';
      let statusCls, statusLbl;
      if (s.status === 'open') { statusCls = 'warn'; statusLbl = 'OPEN'; }
      else if (s.status === 'loss') { statusCls = 'neg'; statusLbl = 'LOSS · SL'; }
      else if (s.status === 'win-partial') { statusCls = 'pos'; statusLbl = 'WIN · TP1'; }
      else { statusCls = 'pos'; statusLbl = s.tp3_hit ? 'WIN · TP3' : 'WIN · TP2'; }
      const pnlCls = s.pnl == null ? 'warn' : (s.pnl >= 0 ? 'pos' : 'neg');
      const srcCls = s.source_label === 'AI/LM' ? 'src-ai' : 'src-strategy';
      return `
        <tr data-id="${s.id}">
          <td class="num muted">#${String(s.id).padStart(3,'0')}</td>
          <td class="muted">${fmt.date(s.ts)}</td>
          <td>${s.symbol}</td>
          <td><span class="tag ${dirTag}">${s.direction}</span></td>
          <td class="num">${fmt.px(s.entry)}</td>
          <td class="num neg">${fmt.px(s.sl)}</td>
          <td class="num"><span class="${s.tp1_hit?'tp-hit':'tp-miss'}">${fmt.px(s.tp1)}</span></td>
          <td class="num"><span class="${s.tp2_hit?'tp-hit':'tp-miss'}">${fmt.px(s.tp2)}</span></td>
          <td class="num"><span class="${s.tp3_hit?'tp-hit':'tp-miss'}">${fmt.px(s.tp3)}</span></td>
          <td><span class="${srcCls}">${s.source_label}</span></td>
          <td class="${statusCls}" style="font-weight:500;">${statusLbl}</td>
          <td class="num ${pnlCls}">${s.pnl==null?'···':fmt.pct(s.pnl)}</td>
          <td class="hash-cell" title="${s.row_hash}">${fmt.shortHash(s.row_hash)}…</td>
        </tr>
      `;
    }).join('');
  }

  // -------------- hash marquee replaced by helix --------------
  function renderMarquee() {
    const strip = document.getElementById('helix-strip');
    if (strip && !strip.dataset.mounted) {
      strip.dataset.mounted = '1';
      window.QB.mountHelix(strip);
    }
  }

  // -------------- header meta --------------
  function renderMeta(rows) {
    document.getElementById('chain-len').textContent = `${rows.length} blocks`;
    document.getElementById('last-update-val').textContent = rows.length
      ? fmt.date(Math.max(...rows.map(r=>r.ts))) + ' UTC'
      : '— · awaiting first signal';
  }

  // -------------- master render (sync, uses current `signals`) --------------
  function doRender() {
    renderMarquee(signals);
    renderMeta(signals);
    renderMetrics(computeMetrics(signals));
    renderChain(signals);
    renderOpen(signals);
    renderRecent(signals);
    renderDistributions(signals);
    renderTable(signals);
    // hide dev toggle once real data is loaded
    const toggle = document.getElementById('state-toggle');
    if (toggle) toggle.style.display = usingRealData ? 'none' : '';
    syncTweakUI();
  }

  // -------------- master render (async — tries signals.json first) --------------
  async function renderAll() {
    if (pageState.state === 'empty' && !usingRealData) {
      signals = [];
      doRender();
      return;
    }
    try {
      const resp = await fetch('signals.json?v=' + Date.now());
      if (!resp.ok) throw new Error('no file');
      const data = await resp.json();
      const raw = Array.isArray(data) ? data : (data.signals || []);
      signals = raw.map(normalizeFromAPI);
      usingRealData = true;
    } catch {
      // development fallback: use mock data so the page still looks good
      if (!usingRealData) signals = pageState.state === 'empty' ? [] : genMockSignals(36);
    }
    doRender();
  }

  // -------------- interactions --------------
  document.getElementById('theme-toggle').addEventListener('click', () => {
    Tweaks.set({ theme: Tweaks.get().theme === 'dark' ? 'light' : 'dark' });
  });
  document.getElementById('lang-toggle').addEventListener('click', () => {
    Tweaks.set({ lang: Tweaks.get().lang === 'es' ? 'en' : 'es' });
    renderAll();
  });
  document.getElementById('state-toggle').addEventListener('click', () => {
    persistPage({ state: pageState.state === 'populated' ? 'empty' : 'populated' });
    renderAll();
  });

  // filters
  document.getElementById('filter-row').addEventListener('click', e => {
    const btn = e.target.closest('.filter-pill');
    if (!btn) return;
    document.querySelectorAll('#filter-row .filter-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    persistPage({ filter: btn.dataset.filter });
    renderTable(signals);
  });
  document.getElementById('history-search').addEventListener('input', e => {
    persistPage({ search: e.target.value });
    renderTable(signals);
  });

  // sorting
  document.querySelectorAll('#history-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      const cur = pageState.sort;
      const newDir = (cur.key === key && cur.dir === 'desc') ? 'asc' : 'desc';
      persistPage({ sort: { key, dir: newDir } });
      document.querySelectorAll('#history-table th').forEach(x => {
        x.classList.remove('sorted');
        const a = x.querySelector('.arrow'); if (a) a.textContent = '';
      });
      th.classList.add('sorted');
      const a = th.querySelector('.arrow'); if (a) a.textContent = newDir === 'asc' ? '▲' : '▼';
    });
  });

  // -------------- tweaks panel host protocol --------------
  const panel = document.getElementById('tweaks-panel');
  function syncTweakUI() {
    const s = Tweaks.get();
    panel.querySelectorAll('.seg').forEach(seg => {
      const key = seg.dataset.tweak;
      seg.querySelectorAll('button').forEach(b => {
        const v = b.dataset.val;
        if (key === 'state') {
          b.classList.toggle('active', pageState.state === v);
        } else {
          b.classList.toggle('active', s[key] === v);
        }
      });
    });
  }
  panel.querySelectorAll('.seg').forEach(seg => {
    seg.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const key = seg.dataset.tweak;
      const val = btn.dataset.val;
      if (key === 'state') {
        persistPage({ state: val });
        renderAll();
      } else {
        Tweaks.set({ [key]: val });
        if (key === 'lang') renderAll();
        else syncTweakUI();
      }
    });
  });
  document.getElementById('tweaks-close').addEventListener('click', () => {
    panel.classList.remove('open');
    try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch {}
  });

  // host edit-mode protocol
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || !d.type) return;
    if (d.type === '__activate_edit_mode') panel.classList.add('open');
    if (d.type === '__deactivate_edit_mode') panel.classList.remove('open');
  });
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch {}

  // -------------- copy-hash on click --------------
  (function() {
    let toastTimer = null;

    function showToast() {
      // Locomotive Scroll aplica transform al <body>, lo que rompe position:fixed
      // dentro de él. Appendar al <html> (documentElement) evita ese problema.
      let t = document.getElementById('copy-toast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'copy-toast';
        document.documentElement.appendChild(t);
      }
      t.textContent = '✓ Hash copiado';
      t.style.cssText = [
        'position:fixed', 'bottom:32px', 'left:50%',
        'transform:translateX(-50%)', 'background:#3ce6ac', 'color:#000',
        'font-size:12px', 'font-weight:700', 'letter-spacing:0.06em',
        'padding:8px 20px', 'border-radius:6px', 'z-index:99999',
        'pointer-events:none', 'transition:opacity 0.3s',
        'box-shadow:0 4px 16px rgba(60,230,172,0.35)', 'opacity:1'
      ].join(';');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 1800);
    }

    function copyHash(hash) {
      if (!hash || hash === '0'.repeat(64)) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(hash).then(showToast).catch(() => fallback(hash));
      } else {
        fallback(hash);
      }
    }

    function fallback(text) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); showToast(); } catch {}
      document.body.removeChild(ta);
    }

    document.addEventListener('click', function(e) {
      // Hash copy — prioridad sobre navegación
      const hashEl = e.target.closest('.hash-cell, .tc-hash, .b-hash');
      if (hashEl) {
        const hash = hashEl.dataset.hash || hashEl.title || '';
        if (hash) copyHash(hash);
        return;
      }
      // Chain block → navegar + highlight fila en tabla
      const block = e.target.closest('.chain-block--linked[data-id]');
      if (block) navigateToRow(parseInt(block.dataset.id));
    });

    function highlightRow(row) {
      const tds = row.querySelectorAll('td');
      // Estado inicial: verde inmediato
      tds.forEach(td => { td.style.background = 'rgba(60,230,172,0.14)'; td.style.transition = 'none'; });
      if (tds[0]) tds[0].style.boxShadow = 'inset 4px 0 0 #3ce6ac';
      // Doble rAF para que el browser pinte el verde antes de iniciar el fade
      requestAnimationFrame(() => requestAnimationFrame(() => {
        tds.forEach(td => {
          td.style.transition = 'background 2.5s ease, box-shadow 2.5s ease';
          td.style.background = '';
          td.style.boxShadow = '';
        });
        setTimeout(() => { tds.forEach(td => { td.style.transition = ''; }); }, 2600);
      }));
    }

    function navigateToRow(id) {
      // Resetear filtro a "Todas" si hay uno activo
      const active = document.querySelector('#filter-row .filter-pill.active');
      const needsReset = active && active.dataset.filter !== 'all';
      if (needsReset) {
        const btnAll = document.querySelector('#filter-row .filter-pill[data-filter="all"]');
        if (btnAll) btnAll.click();
      }
      // Esperar re-render de la tabla (más tiempo si se cambió el filtro)
      setTimeout(() => {
        const tbody = document.getElementById('history-body');
        if (!tbody) return;
        const row = tbody.querySelector(`tr[data-id="${id}"]`);
        if (!row) return;

        if (window.__qbScroll && typeof window.__qbScroll.scrollTo === 'function') {
          // Locomotive Scroll activo — usar su API para no romper el sistema de scroll
          window.__qbScroll.scrollTo(row, {
            offset: -160,
            duration: 800,
            callback: () => highlightRow(row)
          });
        } else {
          // Fallback nativo
          row.scrollIntoView({ block: 'center' });
          highlightRow(row);
        }
      }, needsReset ? 150 : 80);
    }
  })();

  // boot
  Tweaks.apply();
  renderAll();
})();
