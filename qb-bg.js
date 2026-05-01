/* ============================================================
   QuantumBlock — Animated background v2
   "Active Theory" energy: lots of small particles, force fields,
   vortices, qubits entering superposition + entanglement.
   No Matrix-style hex rain.
   ============================================================ */

(function () {
  function getAccent() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--green').trim();
    return v || 'rgb(120, 220, 160)';
  }
  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }
  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;

  class QBBackground {
    constructor() {
      this.intensity = 'normal';
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.t = 0;
      this.mouse = { x: 0.5, y: 0.4, hasMoved: false };
      this.running = false;
      this._frame = this._frame.bind(this);
      this.build();
      this.bind();
    }

    build() {
      const wrap = document.createElement('div');
      wrap.id = 'qb-bg';
      wrap.style.cssText = `position:fixed; inset:0; z-index:0; pointer-events:none; overflow:hidden;`;
      document.body.prepend(wrap);
      this.wrap = wrap;

      // primary canvas — particles + flows + qubits
      const c = document.createElement('canvas');
      c.style.cssText = 'position:absolute; inset:0; width:100%; height:100%;';
      wrap.appendChild(c);
      this.canvas = c;
      this.ctx = c.getContext('2d');

      // overlay — bloom layer using composite mode
      const c2 = document.createElement('canvas');
      c2.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; mix-blend-mode:screen; pointer-events:none;';
      wrap.appendChild(c2);
      this.bloom = c2;
      this.bctx = c2.getContext('2d');

      // vignette
      const overlay = document.createElement('div');
      overlay.id = 'qb-bg-overlay';
      overlay.style.cssText = `
        position:absolute; inset:0;
        background:
          radial-gradient(ellipse at 30% 0%, transparent 0%, rgba(0,0,0,0.30) 70%, rgba(0,0,0,0.55) 100%),
          radial-gradient(circle at var(--mx,50%) var(--my,40%), rgba(120,220,160,0.05) 0%, transparent 30%);
      `;
      wrap.appendChild(overlay);
      this.overlay = overlay;

      this.resize();
      this.seed();

      // light theme overlay rule
      if (!document.getElementById('qb-bg-css')) {
        const style = document.createElement('style');
        style.id = 'qb-bg-css';
        style.textContent = `
          [data-theme="light"] #qb-bg-overlay {
            background:
              radial-gradient(ellipse at 30% 0%, transparent 0%, rgba(244,243,238,0.40) 70%, rgba(244,243,238,0.6) 100%),
              radial-gradient(circle at var(--mx,50%) var(--my,40%), rgba(40,140,90,0.06) 0%, transparent 30%) !important;
          }
        `;
        document.head.appendChild(style);
      }
    }

    seed() {
      const W = this.W, H = this.H;
      const area = W * H;

      // Vortex attractors — distributed so every region of the canvas
      // is inside at least one orbit (prevents "dead zones" where
      // particles drift in straight lines).
      const cells = [
        [0.22, 0.28], [0.78, 0.30],
        [0.30, 0.78], [0.72, 0.74],
        [0.50, 0.50],
      ];
      this.attractors = cells.map(([fx, fy], i) => ({
        x: fx * W, y: fy * H,
        vx: rand(-0.12, 0.12),
        vy: rand(-0.12, 0.12),
        spin: (i % 2 === 0 ? 1 : -1) * rand(0.7, 1.3),
        strength: rand(50, 90),
        radius: rand(180, 280),
      }));

      // Qubits — discrete entities with state superposition
      const qCount = 14;
      this.qubits = Array.from({ length: qCount }, () => ({
        x: rand(0, W),
        y: rand(0, H),
        vx: rand(-0.25, 0.25),
        vy: rand(-0.25, 0.25),
        phase: rand(0, TAU),
        omega: rand(0.6, 1.6),
        radius: rand(14, 26),
        state: Math.random(),  // 0 = |0>, 1 = |1>, between = superposition
        targetState: Math.random(),
      }));

      // Entanglement pairs
      this.entangled = [];
      for (let i = 0; i < qCount; i++) {
        if (Math.random() > 0.5) {
          let j = (i + 1 + Math.floor(Math.random() * (qCount - 2))) % qCount;
          if (j !== i) this.entangled.push([i, j]);
        }
      }

      // Particles — many, light, follow flow field + attractors
      const target = Math.floor(area / 1400); // ~1300 on 1080p
      this.particleCount = Math.min(2000, Math.max(400, target));
      this.particles = new Array(this.particleCount);
      for (let i = 0; i < this.particleCount; i++) {
        this.particles[i] = {
          x: rand(0, W), y: rand(0, H),
          vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2),
          life: rand(0, 1),
          maxLife: rand(180, 420),
          age: rand(0, 200),
          size: rand(0.5, 1.4),
          hue: Math.random() < 0.08 ? 1 : 0, // accent variant
          // for trail
          px: 0, py: 0,
        };
      }

      // pulses traveling between qubits along entanglement
      this.pulses = [];

      // ===== Blockchain layer =====
      // A drifting chain of blocks. Each block links to its predecessor.
      // The chain wanders through the orbital field (so it curves organically).
      const blockCount = 9;
      this.blocks = [];
      // start chain at a random spot, walk forward placing blocks
      let bx = rand(W * 0.08, W * 0.18);
      let by = rand(H * 0.25, H * 0.75);
      let bdir = rand(-0.3, 0.3); // initial heading angle
      for (let i = 0; i < blockCount; i++) {
        const seg = rand(140, 200);
        const nx = bx + Math.cos(bdir) * seg;
        const ny = by + Math.sin(bdir) * seg;
        this.blocks.push({
          x: bx, y: by,
          vx: rand(-0.08, 0.08),
          vy: rand(-0.05, 0.05),
          size: rand(11, 16),
          hash: this._hash(),
          height: 1000 + i,
          age: rand(0, 200),
          glow: 0,        // 0..1, fades after a tx confirms
          rot: rand(0, TAU),
          rotSpeed: rand(-0.002, 0.002),
        });
        bx = nx; by = ny;
        bdir += rand(-0.5, 0.5);
      }

      // Transactions traveling along the chain
      this.txs = [];
      this.txSpawnAt = this.t + 0.3;
    }

    resize() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      this.W = W; this.H = H;
      [this.canvas, this.bloom].forEach(c => {
        c.width = W * this.dpr;
        c.height = H * this.dpr;
        c.style.width = W + 'px';
        c.style.height = H + 'px';
      });
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.bctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      // re-seed for new sizing
      if (this.particles) this.seed();
    }

    bind() {
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('mousemove', e => {
        this.mouse.x = e.clientX / this.W;
        this.mouse.y = e.clientY / this.H;
        this.mouse.hasMoved = true;
        this.overlay.style.setProperty('--mx', (this.mouse.x * 100).toFixed(1) + '%');
        this.overlay.style.setProperty('--my', (this.mouse.y * 100).toFixed(1) + '%');
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.stop(); else this.start();
      });
    }

    setIntensity(level) {
      this.intensity = level;
      if (level === 'off') {
        this.wrap.style.display = 'none';
        this.stop();
      } else {
        this.wrap.style.display = '';
        if (level === 'subtle')  { this.canvas.style.opacity = 0.45; this.bloom.style.opacity = 0.35; }
        if (level === 'normal')  { this.canvas.style.opacity = 0.85; this.bloom.style.opacity = 0.7; }
        if (level === 'intense') { this.canvas.style.opacity = 1.0;  this.bloom.style.opacity = 1.0; }
        this.start();
      }
    }

    start() { if (!this.running) { this.running = true; requestAnimationFrame(this._frame); } }
    stop()  { this.running = false; }

    _accentRGB() {
      if (!this._cache || this._cacheTheme !== getTheme()) {
        const probe = document.createElement('span');
        probe.style.color = getAccent();
        probe.style.display = 'none';
        document.body.appendChild(probe);
        const cs = getComputedStyle(probe).color;
        document.body.removeChild(probe);
        this._cache = cs.match(/[\d.]+/g).slice(0,3).map(Number);
        this._cacheTheme = getTheme();
      }
      return this._cache;
    }
    _rgba(a) { const [r,g,b] = this._accentRGB(); return `rgba(${r|0},${g|0},${b|0},${a})`; }

    _hash() {
      // 6-char hex hash glyph
      const h = '0123456789abcdef';
      let s = '';
      for (let i = 0; i < 6; i++) s += h[(Math.random() * 16) | 0];
      return s;
    }

    // Pure orbital field — always tangential to nearest attractor.
    // No vertical bias possible; particles trace arcs/spirals.
    _orbitForce(x, y, out) {
      let fx = 0, fy = 0;
      for (const a of this.attractors) {
        const dx = a.x - x, dy = a.y - y;
        const d = Math.hypot(dx, dy) + 0.01;
        const reach = a.radius * 2.4;
        if (d < reach) {
          const fall = 1 - d / reach; // 0..1
          // tangent (perpendicular to radius) — orbital
          const tx = -dy / d, ty = dx / d;
          // radial (slight pull inward, kept small to keep orbits)
          const rx = dx / d, ry = dy / d;
          const tang = a.spin * 0.9 * fall;
          const rad  = 0.18 * fall * fall;
          fx += tx * tang + rx * rad;
          fy += ty * tang + ry * rad;
        }
      }
      out.x = fx; out.y = fy;
    }

    _frame(now) {
      if (!this.running) return;
      const prevT = this.t;
      this.t = now * 0.001;
      const dt = Math.min(2, (this.t - prevT) * 60); // normalize to ~1 per frame at 60fps
      const stepMul = this.reduced ? 0.35 : 1;

      const { ctx, bctx, W, H } = this;
      const theme = getTheme();

      // fade trail
      const fade = theme === 'light' ? 'rgba(244,243,238,0.10)' : 'rgba(7,9,10,0.14)';
      ctx.fillStyle = fade; ctx.fillRect(0, 0, W, H);
      bctx.fillStyle = theme === 'light' ? 'rgba(244,243,238,0.20)' : 'rgba(7,9,10,0.22)';
      bctx.fillRect(0, 0, W, H);

      // ---- update attractors (slow drift) ----
      for (const a of this.attractors) {
        a.x += a.vx * dt * stepMul;
        a.y += a.vy * dt * stepMul;
        if (a.x < 80 || a.x > W - 80) a.vx *= -1;
        if (a.y < 80 || a.y > H - 80) a.vy *= -1;
      }

      const mx = this.mouse.x * W;
      const my = this.mouse.y * H;
      const mouseActive = this.mouse.hasMoved;

      // ---- update + draw particles ----
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = this._rgba(0.18);
      ctx.beginPath();
      const accentRGB = this._accentRGB();
      const force = { x: 0, y: 0 };
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.px = p.x; p.py = p.y;

        // pure orbital field — produces spirals, no vertical streaks
        this._orbitForce(p.x, p.y, force);
        let ax = force.x;
        let ay = force.y;

        // mouse force (repel + swirl)
        if (mouseActive) {
          const dx = p.x - mx, dy = p.y - my;
          const d2 = dx*dx + dy*dy;
          if (d2 < 180*180) {
            const d = Math.sqrt(d2) + 0.01;
            const f = (1 - d / 180) * 1.4;
            ax += (dx/d) * f;
            ay += (dy/d) * f;
            // tangential swirl
            ax += -dy/d * f * 0.8;
            ay +=  dx/d * f * 0.8;
          }
        }

        p.vx = (p.vx + ax * 0.04 * stepMul) * 0.96;
        p.vy = (p.vy + ay * 0.04 * stepMul) * 0.96;
        p.x += p.vx * dt * stepMul;
        p.y += p.vy * dt * stepMul;

        // respawn at edge if escaped (no wrapping streaks)
        if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) {
          // place near a random attractor at random radius
          const a = this.attractors[Math.floor(Math.random()*this.attractors.length)];
          const r = rand(40, a.radius);
          const ang = rand(0, TAU);
          p.x = a.x + Math.cos(ang) * r;
          p.y = a.y + Math.sin(ang) * r;
          // give it tangential velocity to start orbiting cleanly
          p.vx = -Math.sin(ang) * a.spin * 0.6;
          p.vy =  Math.cos(ang) * a.spin * 0.6;
          p.age = 0;
        }

        // age + respawn
        p.age += stepMul;
        if (p.age > p.maxLife) {
          p.age = 0;
          // respawn near a random qubit or random pos
          if (Math.random() < 0.5 && this.qubits.length) {
            const q = this.qubits[Math.floor(Math.random() * this.qubits.length)];
            p.x = q.x + rand(-30, 30);
            p.y = q.y + rand(-30, 30);
          } else {
            p.x = rand(0, W); p.y = rand(0, H);
          }
          p.vx = rand(-0.2, 0.2); p.vy = rand(-0.2, 0.2);
          p.maxLife = rand(180, 420);
        }

        // draw stroke segment (trail)
        const lifeT = p.age / p.maxLife;
        const fadeLife = Math.sin(lifeT * Math.PI); // 0 → 1 → 0
        const alpha = 0.10 + fadeLife * 0.32;
        // skip jumps caused by wrap
        const jumpX = Math.abs(p.x - p.px), jumpY = Math.abs(p.y - p.py);
        if (jumpX < 50 && jumpY < 50) {
          ctx.strokeStyle = `rgba(${accentRGB[0]|0},${accentRGB[1]|0},${accentRGB[2]|0},${alpha})`;
          ctx.beginPath();
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        // bright head dot for some
        if (p.hue === 1 || fadeLife > 0.9) {
          bctx.fillStyle = `rgba(${accentRGB[0]|0},${accentRGB[1]|0},${accentRGB[2]|0},${0.7})`;
          bctx.beginPath();
          bctx.arc(p.x, p.y, p.size + 0.6, 0, TAU);
          bctx.fill();
        }
      }

      // ---- update qubits ----
      for (const q of this.qubits) {
        q.phase += 0.01 * q.omega * stepMul;
        q.x += q.vx * dt * stepMul;
        q.y += q.vy * dt * stepMul;
        if (q.x < 60 || q.x > W - 60) q.vx *= -1;
        if (q.y < 60 || q.y > H - 60) q.vy *= -1;
        // state evolves toward target then flips
        q.state = lerp(q.state, q.targetState, 0.012 * stepMul);
        if (Math.abs(q.state - q.targetState) < 0.05) {
          q.targetState = Math.random();
        }
      }

      // ---- entanglement pairs: sinuous lines + occasional pulses ----
      for (const [i, j] of this.entangled) {
        const a = this.qubits[i], b = this.qubits[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d > Math.min(W, H) * 0.7) continue; // ignore very far links

        // sinuous bezier
        const cx = (a.x + b.x) / 2 + Math.sin(this.t * 0.6 + i) * 24;
        const cy = (a.y + b.y) / 2 + Math.cos(this.t * 0.5 + j) * 24;

        // gradient stroke for entanglement
        const grd = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grd.addColorStop(0, this._rgba(0.45));
        grd.addColorStop(0.5, this._rgba(0.10));
        grd.addColorStop(1, this._rgba(0.45));
        ctx.strokeStyle = grd;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(cx, cy, b.x, b.y);
        ctx.stroke();

        // bloom layer subtle
        bctx.strokeStyle = this._rgba(0.18);
        bctx.lineWidth = 2.2;
        bctx.beginPath();
        bctx.moveTo(a.x, a.y);
        bctx.quadraticCurveTo(cx, cy, b.x, b.y);
        bctx.stroke();

        // occasionally fire a pulse
        if (Math.random() < 0.006 * stepMul) {
          this.pulses.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, cx, cy, t: 0, life: rand(0.5, 1.0) });
        }
      }

      // pulses
      for (let i = this.pulses.length - 1; i >= 0; i--) {
        const p = this.pulses[i];
        p.t += 0.02 * stepMul / p.life;
        if (p.t >= 1) { this.pulses.splice(i, 1); continue; }
        // quadratic bezier eval
        const u = 1 - p.t;
        const x = u*u * p.ax + 2*u*p.t * p.cx + p.t*p.t * p.bx;
        const y = u*u * p.ay + 2*u*p.t * p.cy + p.t*p.t * p.by;
        bctx.fillStyle = this._rgba(1);
        bctx.shadowColor = this._rgba(0.9);
        bctx.shadowBlur = 14;
        bctx.beginPath();
        bctx.arc(x, y, 2.2, 0, TAU);
        bctx.fill();
        bctx.shadowBlur = 0;
      }

      // ====================== BLOCKCHAIN LAYER ======================
      // ---- update blocks: drift through orbital field ----
      for (const b of this.blocks) {
        // orbital force (same field as particles, so chain follows currents)
        this._orbitForce(b.x, b.y, force);
        b.vx = (b.vx + force.x * 0.012 * stepMul) * 0.985;
        b.vy = (b.vy + force.y * 0.012 * stepMul) * 0.985;
        b.x += b.vx * dt * stepMul;
        b.y += b.vy * dt * stepMul;
        b.rot += b.rotSpeed * dt * stepMul;
        b.age += stepMul;
        b.glow *= 0.97;

        // wrap blocks: if a block drifts too far off, recycle it as a "new" block
        // appended to the end of the chain (block height advances)
        const off = 80;
        if (b.x < -off || b.x > W + off || b.y < -off || b.y > H + off) {
          // find the highest-height block and place this one near it (chained)
          let tip = this.blocks[0];
          for (const o of this.blocks) if (o.height > tip.height) tip = o;
          if (tip !== b) {
            const ang = rand(0, TAU);
            const seg = rand(140, 200);
            b.x = tip.x + Math.cos(ang) * seg;
            b.y = tip.y + Math.sin(ang) * seg;
            // clamp into canvas
            b.x = Math.max(80, Math.min(W - 80, b.x));
            b.y = Math.max(80, Math.min(H - 80, b.y));
            b.vx = rand(-0.05, 0.05);
            b.vy = rand(-0.05, 0.05);
            b.height = tip.height + 1;
            b.hash = this._hash();
            b.age = 0;
            b.glow = 1; // newly minted = glows
          }
        }
      }

      // ---- draw chain links (line from each block to the previous-height block) ----
      // Build sorted-by-height view once
      const chain = this.blocks.slice().sort((a, b) => a.height - b.height);
      ctx.lineWidth = 1;
      for (let i = 1; i < chain.length; i++) {
        const a = chain[i - 1], b = chain[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d > Math.min(W, H) * 0.55) continue; // skip too-distant links

        // dashed link with curve via mid offset
        const cx = (a.x + b.x) / 2 + Math.sin(this.t * 0.3 + i) * 12;
        const cy = (a.y + b.y) / 2 + Math.cos(this.t * 0.27 + i) * 12;

        ctx.strokeStyle = this._rgba(0.18);
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(cx, cy, b.x, b.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // ---- spawn transactions ----
      if (this.t > this.txSpawnAt && chain.length > 1) {
        // pick a source and target — usually adjacent (chain confirmation)
        // sometimes a "long-range" tx (like mempool propagation)
        const i = Math.floor(Math.random() * (chain.length - 1));
        let from = chain[i];
        let to = chain[i + 1];
        if (Math.random() < 0.18) {
          // long-range
          let j = Math.floor(Math.random() * chain.length);
          if (j === i) j = (j + 2) % chain.length;
          to = chain[j];
        }
        // mid control point — slight curve
        const cx = (from.x + to.x) / 2 + rand(-30, 30);
        const cy = (from.y + to.y) / 2 + rand(-30, 30);
        this.txs.push({
          ax: from.x, ay: from.y, bx: to.x, by: to.y, cx, cy,
          t: 0, speed: rand(0.006, 0.014),
          targetIdx: this.blocks.indexOf(to),
          trail: [],
        });
        this.txSpawnAt = this.t + rand(0.18, 0.55);
        // cap
        if (this.txs.length > 22) this.txs.shift();
      }

      // ---- update + draw transactions ----
      for (let i = this.txs.length - 1; i >= 0; i--) {
        const tx = this.txs[i];
        tx.t += tx.speed * dt * stepMul;
        if (tx.t >= 1) {
          // confirm: glow target block
          const target = this.blocks[tx.targetIdx];
          if (target) target.glow = Math.min(1, target.glow + 0.6);
          this.txs.splice(i, 1);
          continue;
        }
        // bezier eval
        const u = 1 - tx.t;
        const x = u*u * tx.ax + 2*u*tx.t * tx.cx + tx.t*tx.t * tx.bx;
        const y = u*u * tx.ay + 2*u*tx.t * tx.cy + tx.t*tx.t * tx.by;
        // trail
        tx.trail.push({ x, y, life: 1 });
        if (tx.trail.length > 16) tx.trail.shift();
        // draw trail (each segment fading)
        for (let k = 1; k < tx.trail.length; k++) {
          const p0 = tx.trail[k - 1], p1 = tx.trail[k];
          const a = (k / tx.trail.length) * 0.7;
          ctx.strokeStyle = this._rgba(a);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        // bright head
        bctx.fillStyle = this._rgba(1);
        bctx.shadowColor = this._rgba(0.9);
        bctx.shadowBlur = 10;
        bctx.beginPath();
        bctx.arc(x, y, 2, 0, TAU);
        bctx.fill();
        bctx.shadowBlur = 0;
      }

      // ---- draw blocks (hexagonal nodes with hash) ----
      ctx.font = '9px ui-monospace, "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const b of this.blocks) {
        const s = b.size;
        // hexagon path
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        // fill with subtle bg
        ctx.fillStyle = theme === 'light' ? 'rgba(244,243,238,0.6)' : 'rgba(7,9,10,0.55)';
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ang = k * (Math.PI / 3) + Math.PI / 6;
          const px = Math.cos(ang) * s;
          const py = Math.sin(ang) * s;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // border (brighter when glowing)
        const borderA = 0.32 + b.glow * 0.6;
        ctx.strokeStyle = this._rgba(borderA);
        ctx.lineWidth = 1 + b.glow * 1.2;
        ctx.stroke();
        ctx.restore();

        // glow on bloom layer
        if (b.glow > 0.05) {
          bctx.fillStyle = this._rgba(b.glow * 0.4);
          bctx.shadowColor = this._rgba(b.glow * 0.9);
          bctx.shadowBlur = 18 * b.glow;
          bctx.beginPath();
          bctx.arc(b.x, b.y, s * 0.9, 0, TAU);
          bctx.fill();
          bctx.shadowBlur = 0;
        }

        // hash text — only on larger blocks, dim
        if (s > 12) {
          ctx.fillStyle = this._rgba(0.55);
          ctx.fillText('#' + b.hash, b.x, b.y);
        }
      }

      // ====================== END BLOCKCHAIN LAYER ======================

      // ---- draw qubits (Bloch-sphere-ish discs in superposition) ----
      for (const q of this.qubits) {
        // outer probability ring — radius pulses with state
        const breath = 1 + Math.sin(q.phase * 1.4) * 0.18;
        const r0 = q.radius * breath;
        // probability cloud (radial gradient)
        const grd = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r0 * 1.4);
        grd.addColorStop(0, this._rgba(0.22));
        grd.addColorStop(0.6, this._rgba(0.05));
        grd.addColorStop(1, this._rgba(0));
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(q.x, q.y, r0 * 1.4, 0, TAU);
        ctx.fill();

        // ring (orbit / bra-ket)
        ctx.strokeStyle = this._rgba(0.55);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(q.x, q.y, r0, 0, TAU);
        ctx.stroke();

        // inner state segment — arc length encodes |state⟩
        const startA = -Math.PI / 2;
        const stateArc = q.state * TAU;
        ctx.strokeStyle = this._rgba(0.95);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(q.x, q.y, r0 - 4, startA, startA + stateArc);
        ctx.stroke();

        // |0> and |1> markers (top + bottom)
        ctx.fillStyle = this._rgba(0.85);
        ctx.beginPath(); ctx.arc(q.x, q.y - r0, 1.6, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(q.x, q.y + r0, 1.6, 0, TAU); ctx.fill();

        // core dot with bloom
        bctx.fillStyle = this._rgba(0.95);
        bctx.shadowColor = this._rgba(0.9);
        bctx.shadowBlur = 10;
        bctx.beginPath();
        bctx.arc(q.x, q.y, 2.2, 0, TAU);
        bctx.fill();
        bctx.shadowBlur = 0;
      }

      // ---- subtle attractor halos ----
      for (const a of this.attractors) {
        const grd = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.radius);
        grd.addColorStop(0, this._rgba(0.05));
        grd.addColorStop(1, this._rgba(0));
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.radius, 0, TAU); ctx.fill();
      }

      requestAnimationFrame(this._frame);
    }
  }

  window.QBBackground = QBBackground;

  function mount() {
    if (window.__qbBg) return window.__qbBg;
    const bg = new QBBackground();
    window.__qbBg = bg;
    const apply = () => {
      const t = (window.QB && window.QB.Tweaks && window.QB.Tweaks.get()) || {};
      let level = t.bgIntensity || 'normal';
      if (bg.reduced && level === 'intense') level = 'normal';
      bg.setIntensity(level);
      bg._cache = null;
    };
    if (window.QB && window.QB.Tweaks) window.QB.Tweaks.onChange(apply);
    apply();
    return bg;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
