const React = { createElement(tag, props) { const el = document.createElement(tag); el.src = props.src; el.alt = props.alt; Object.assign(el.style, props.style); return el; } };
class DCLogic {
 state = {};
 setState(update) { Object.assign(this.state, update); this.refresh(); }
 refresh() {
 const vals = this.renderVals();
 document.querySelectorAll('[data-condition]').forEach(el => { el.hidden = !vals[el.dataset.condition]; });
 document.querySelector('[data-run-label]').textContent = vals.runLabel;
 document.querySelector('[data-terminal-lines]').replaceChildren(...vals.termLines.map(line => { const el = document.createElement('div'); el.style.whiteSpace = 'pre-wrap'; el.textContent = line; return el; }));
 const image = document.querySelector('[data-lightbox-image]'); image.replaceChildren(); if(vals.lbImg) image.append(vals.lbImg);
 }
}

class Component extends DCLogic {
  componentDidMount() {
    this._lbClick = (e) => { const el = e.target.closest && e.target.closest('[data-lb]'); if (el) { e.preventDefault(); this.setState({ lb: el.getAttribute('data-lb') }); } };
    this._lbKey = (e) => { if (e.key === 'Escape' && this.state?.lb) this.setState({ lb: null }); };
    document.addEventListener('click', this._lbClick, true);
    document.addEventListener('keydown', this._lbKey);
    this.startPlate();
    this.startDoodles();
    const SPEED = 28; // px per second
    let v = SPEED, target = SPEED, pos = null, last = performance.now();
    const onEnter = () => { target = 0; }, onLeave = () => { target = SPEED; };
    let el = null;
    const mq = window.matchMedia('(max-width:880px)');
    let loop = 0, canScroll = false, ro = null, checkAt = 0;
    const measure = () => { if (!el) return; const copy = el.querySelector('[data-loop-copy]'); loop = copy ? copy.offsetHeight : 0; canScroll = el.scrollHeight > el.clientHeight + 1; };
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (now > checkAt) {
        checkAt = now + 1000;
        const cur = document.querySelector('[data-side-inner]');
        if (cur !== el) {
          if (el) { el.removeEventListener('mouseenter', onEnter); el.removeEventListener('mouseleave', onLeave); }
          if (ro) ro.disconnect();
          el = cur; pos = null;
          if (el) { el.addEventListener('mouseenter', onEnter); el.addEventListener('mouseleave', onLeave); ro = new ResizeObserver(measure); ro.observe(el); const c = el.querySelector('[data-loop-copy]'); if (c) ro.observe(c); measure(); }
        }
      }
      if (document.hidden || !el || mq.matches) { pos = null; }
      else if (canScroll) {
        if (pos === null || Math.abs(el.scrollTop - pos) > 2) pos = el.scrollTop;
        v += (target - v) * Math.min(1, dt * 3);
        pos += v * dt;
        if (loop > 0) { if (pos >= loop) pos -= loop; if (pos < 0) pos += loop; }
        el.scrollTop = pos;
      }
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
    this._cleanup = () => { if (ro) ro.disconnect(); if (el) { el.removeEventListener('mouseenter', onEnter); el.removeEventListener('mouseleave', onLeave); } };
  }
  startPlate() {
    const plate = document.querySelector('[data-plate]');
    if (!plate) return;
    const wells = [...plate.querySelectorAll('[data-well]')];
    wells.forEach((w, i) => { w.__i = i; });
    const COLS = 44, ROWS = Math.ceil(wells.length / COLS);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const BANDS = [
      [0.00, ['#ff2d55','#f0506e','#e8364a','#ff4f7b','#8fa596']],
      [0.16, ['#ff1f4b','#e23a3a','#ff3d8b','#c8283c','#f5788a']],
      [0.27, ['#5a3b2e','#2b2f55','#e02b3d','#7a4a33','#3a2a3d']],
      [0.42, ['#e02b3d','#8a2433','#6b4532','#4a3f63','#ff4a6a','#a88a7a']],
      [0.55, ['#3d4a2a','#5f7a2e','#7ad94a','#4b4f3a','#8c8f86']],
      [0.68, ['#f08a6a','#d6b8a8','#9aa6b0','#ef6a5a','#c9a59a']],
      [0.82, ['#8fbfae','#a9c9bd','#7aa89a','#ff3355','#bcd3c8']]
    ];
    const lane = Array.from({ length: COLS }, () => 0.55 + Math.random() * 0.6);
    const bandAt = (r) => { const t = r / Math.max(1, ROWS - 1); let p = BANDS[0][1]; for (const [s, c] of BANDS) if (t >= s) p = c; return p; };
    const weight = wells.map((_, i) => {
      const r = Math.floor(i / COLS), c = i % COLS, t = r / Math.max(1, ROWS - 1);
      const dens = 0.45 + 0.55 * Math.exp(-Math.pow((t - 0.42) / 0.32, 2));
      return dens * lane[c];
    });
    const pick = () => { for (let k = 0; k < 6; k++) { const i = Math.floor(Math.random() * wells.length); if (Math.random() < weight[i]) return i; } return Math.floor(Math.random() * wells.length); };
    const lit = new Set(); const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
    const grid = plate.querySelector('[data-plategrid]');
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;mix-blend-mode:multiply;filter:blur(3px);';
    grid.appendChild(cv);
    const ctx = cv.getContext('2d');
    let pos = [], dpr = 1;
    const layout = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = grid.clientWidth, H = grid.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
      pos = wells.map(w => [w.offsetLeft + w.offsetWidth / 2, w.offsetTop + w.offsetHeight / 2, w.offsetWidth / 2]);
    };
    layout();
    const plRO = new ResizeObserver(layout); plRO.observe(grid);
    const active = new Map();
    const IN = 900, OUT = 900;
    const on = (i, hold, col, amp) => {
      const w = wells[i]; if (!w || lit.has(w)) return; lit.add(w);
      const pal = bandAt(Math.floor(i / COLS));
      const c = col || pal[Math.floor(Math.random() * pal.length)];
      const amt = amp != null ? amp : 0.45 + Math.random() * 0.55;
      active.set(i, { c, amt, t0: performance.now(), hold: Math.min(hold, 1e8), s: 1 + Math.random() * 0.14, ox: (Math.random() - 0.5) * 0.2, oy: (Math.random() - 0.5) * 0.2 });
      later(() => lit.delete(w), hold + OUT);
      return c;
    };
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const back = (t) => { const k = 1.7; return 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2); };
    const draw = (now) => {
      this._dvdRaf = requestAnimationFrame(draw);
      if (!this._plateVisible || document.hidden) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const [i, a] of active) {
        const t = now - a.t0; let o, s;
        if (t < IN) { o = easeOut(t / IN); s = 0.55 + (a.s - 0.55) * back(Math.min(1, t / 1100)); }
        else if (t < a.hold) { o = 1; s = a.s; }
        else if (t < a.hold + OUT) { const p = (t - a.hold) / OUT; o = 1 - easeOut(p); s = a.s - (a.s - 0.55) * p; }
        else { active.delete(i); continue; }
        const [x, y, r] = pos[i]; if (!r) continue;
        ctx.globalAlpha = o * a.amt; ctx.fillStyle = a.c;
        ctx.beginPath(); ctx.arc(x + a.ox * r, y + a.oy * r, r * 1.08 * s, 0, Math.PI * 2); ctx.fill();
      }
    };
    this._dvdRaf = requestAnimationFrame(draw);
    const LOGOS = ['assets/plate-ttuhsc-s.png', 'assets/plate-bidmc-s.png', 'assets/plate-harvard-s.png'];
    const BRAND = [['#cc0000','#e8323c','#8a0b12','#2a2a2a','#d9555a'], ['#049fe0','#0a6fbd','#044a99','#3bb4ea','#7fcdf0'], ['#a51c30','#b8283c','#7a1424','#55305a','#8a4a3a']];
    let ambient = null;
    const TEXTS = ['TECH', 'BIDMC', 'HARVARD'];
    const FONT = { H:['101','101','111','101','101'], A:['010','101','111','101','101'], R:['110','101','110','101','101'], V:['101','101','101','101','010'], D:['110','101','101','101','110'], B:['110','101','110','101','110'], I:['111','010','010','010','111'], M:['10001','11011','10101','10001','10001'], C:['011','100','100','100','011'], T:['111','010','010','010','010'], E:['111','100','110','100','111'] };
    const textCells = (word) => {
      const out = []; const len = [...word].reduce((n, ch) => n + FONT[ch][0].length, 0) + word.length - 1;
      let row = Math.floor((ROWS - len) / 2); const col0 = COLS - 9;
      for (const ch of word) {
        const g = FONT[ch], w = g[0].length;
        for (let ly = 0; ly < 5; ly++) for (let lx = 0; lx < w; lx++) if (g[ly][lx] === '1') out.push((row + lx) * COLS + col0 + (4 - ly));
        row += w + 1;
      }
      return out;
    };
    const sample = (src) => new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const W = img.naturalWidth || 100, H = img.naturalHeight || 100;
        const cw = COLS * 4, ch = ROWS * 4;
        const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch);
        const box = (ROWS - 3) * 4, s = Math.min(box / W, box / H), dw = W * s, dh = H * s;
        const cxL = Math.round(COLS * 0.4) * 4;
        ctx.drawImage(img, cxL - dw / 2, (ch - dh) / 2, dw, dh);
        const d = ctx.getImageData(0, 0, cw, ch).data, out = [];
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          let R = 0, G = 0, B = 0;
          for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const p = ((r * 4 + y) * cw + c * 4 + x) * 4; R += d[p]; G += d[p + 1]; B += d[p + 2]; }
          R /= 16; G /= 16; B /= 16;
          const ink = 1 - Math.min(R, G, B) / 255;
          if (ink > 0.16) out.push([r * COLS + c, 'rgb(' + Math.round(R) + ',' + Math.round(G) + ',' + Math.round(B) + ')', Math.min(1, ink * 1.15)]);
        }
        const cols = out.map(o => o[1]);
        res({ px: out, pal: cols.length ? cols : null, src, W, H });
      };
      img.onerror = () => res({ px: [], pal: null });
      img.src = src;
    });
    const hex = (c) => { if (c[0] === '#') return c; const m = c.match(/\d+/g); return '#' + m.slice(0, 3).map(v => (+v).toString(16).padStart(2, '0')).join(''); };
    const runLogos = async () => {
      const data = await Promise.all(LOGOS.map(sample));
      let n = 0;
      const show = () => {
        if (!this._plateVisible || document.hidden) return later(show, 500);
        const idx = n % data.length; const { px, src, W, H } = data[idx]; n++;
        const r0 = wells[0].getBoundingClientRect(), r1 = wells[wells.length - 1].getBoundingClientRect();
        const gx = r0.left, gy = r0.top, gw = r1.right - r0.left, gh = r1.bottom - r0.top;
        const sc = Math.min(gw / W, gh / H), ow = W * sc, oh = H * sc;
        const ovBase = { src, w: ow, h: oh, x0: gx + (gw - ow) / 2, y0: gy + (gh - oh) / 2, gy0: gy, gx0: gx };
        const bp = BRAND[idx]; ambient = bp;
        const order = px.slice().sort(() => Math.random() - 0.5);
        order.forEach(([i, c, amp], k) => later(() => {
          const r = wells[0].getBoundingClientRect(), dx = r.left - ovBase.gx0, dy = r.top - ovBase.gy0;
          on(i, 3800 - k * 3, hex(c), amp);
        }, k * (1500 / Math.max(1, order.length))));
        const tc = textCells(TEXTS[idx]);
        tc.forEach((i, k) => later(() => on(i, 3600 - k * 6, bp[0], 0.95), 500 + k * 22));
        later(show, 6200);
      };
      show();
    };
    const tick = () => {
      if (!this._plateVisible || document.hidden) return later(tick, 400);
      if (lit.size < 80) {
        const i = pick();
        const pal = ambient || bandAt(Math.floor(i / COLS));
        on(i, 1200 + Math.random() * 2400, pal[Math.floor(Math.random() * pal.length)]);
      }
      later(tick, 60 + Math.random() * 140);
    };
    const hover = (ev) => { const w = ev.target.closest && ev.target.closest('[data-well]'); if (w) on(w.__i, 1600); };
    plate.addEventListener('mouseover', hover);
    this._plateVisible = true;
    const io = new IntersectionObserver(([en]) => { this._plateVisible = en.isIntersecting; });
    io.observe(plate);
    if (!reduce) { tick(); runLogos(); } else wells.forEach((_, i) => { if (Math.random() < weight[i] * 0.45) on(i, 1e9); });
    this._dvdCleanup = () => { plRO.disconnect(); io.disconnect(); plate.removeEventListener('mouseover', hover); timers.forEach(clearTimeout); };
  }
  startDoodles() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const NS = 'http://www.w3.org/2000/svg';
    const J = (v, a) => v + (Math.random() - 0.5) * a;
    const pts2d = (p) => 'M' + p.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L');
    const smooth = (p) => { let d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1); for (let i = 1; i < p.length - 1; i++) { const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; d += ' Q' + p[i][0].toFixed(1) + ' ' + p[i][1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1); } const l = p[p.length - 1]; return d + ' L' + l[0].toFixed(1) + ' ' + l[1].toFixed(1); };
    const SHAPES = {
      loop: (w, h, j) => { const p = [], cx = w / 2, cy = h / 2, rx = w / 2 + 6, ry = h / 2 + 5, n = 26, st = -2.6; for (let i = 0; i <= n; i++) { const t = st + (i / n) * Math.PI * 2.15; p.push([J(cx + Math.cos(t) * rx, j * 3), J(cy + Math.sin(t) * ry, j * 2.4)]); } return [smooth(p)]; },
      underline: (w, h, j) => { const p = [], n = 9, y = h - 4; for (let i = 0; i <= n; i++) p.push([J(8 + (w - 16) * i / n, j * 2), J(y + (i % 2 ? 2.5 : -1), j * 1.6)]); const p2 = []; for (let i = 0; i <= n; i++) p2.push([J(14 + (w - 30) * i / n, j * 2), J(y + 4 + (i % 2 ? -1 : 2), j * 1.6)]); return [smooth(p), smooth(p2)]; },
      star: (w, h, j) => { const cx = w - 14, cy = 4, R = 9, r = 4, p = []; for (let i = 0; i <= 10; i++) { const t = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; p.push([J(cx + Math.cos(t) * rr, j * 1.6), J(cy + Math.sin(t) * rr, j * 1.6)]); } return [pts2d(p)]; },
      sparks: (w, h, j) => { const out = [], cx = w - 6, cy = 2; [[-150, 0], [-110, 0], [-70, 0]].forEach(([deg]) => { const t = deg * Math.PI / 180; out.push(pts2d([[J(cx + Math.cos(t) * 6, j), J(cy + Math.sin(t) * 6, j)], [J(cx + Math.cos(t) * 15, j * 1.5), J(cy + Math.sin(t) * 15, j * 1.5)]])); }); return out; },
      arrow: (w, h, j) => { const x0 = -34, y0 = h + 16, x1 = -4, y1 = h / 2 + 2; const p = []; for (let i = 0; i <= 8; i++) { const t = i / 8; p.push([J(x0 + (x1 - x0) * t, j * 2), J(y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 10, j * 2)]); } return [smooth(p), pts2d([[J(x1 - 9, j), J(y1 + 1, j)], [x1, y1], [J(x1 - 3, j), J(y1 + 10, j)]])]; },
      scribble: (w, h, j) => { const p = [], n = 14, cx = w - 22; for (let i = 0; i <= n; i++) p.push([J(cx + Math.cos(i * 1.9) * 10, j * 2), J(h / 2 + Math.sin(i * 2.3) * 7, j * 2)]); return [smooth(p)]; },
      check: (w, h, j) => { const x = w - 26, y = h / 2; return [smooth([[J(x, j), J(y, j)], [J(x + 6, j), J(y + 7, j)], [J(x + 20, j), J(y - 10, j)]])]; }
    };
    const KEYS = Object.keys(SHAPES);
    const mk = (tag, a) => { const el = document.createElementNS(NS, tag); for (const k in a) el.setAttribute(k, a[k]); return el; };
    const circ = (cx, cy, r, j) => { const p = []; for (let i = 0; i <= 19; i++) { const t = (i / 18) * Math.PI * 2; p.push([J(cx + Math.cos(t) * r, j), J(cy + Math.sin(t) * r, j)]); } return smooth(p) + 'Z'; };
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const onScreen = (r) => r.width > 0 && r.bottom > 30 && r.top < innerHeight - 30;
    const timers = [];
    const wait = (ms) => new Promise(r => timers.push(setTimeout(r, ms)));
    const chars = new Set(); let raf = 0, ropeSvg = null;
    const frameAll = () => {
      raf = 0;
      chars.forEach(c => { const t = c.target, el = t && (t.closest ? t : null); const ink = el && el.closest('aside') ? '#f1f3ea' : '#111'; if (c.ink !== ink) { c.ink = ink; c.paper = ink === '#111' ? '#f1f3ea' : '#000'; } c.tick && c.tick(performance.now()); const p = c.pos(); if (!p) { c.box.style.visibility = 'hidden'; return; } c.render && c.render(); c.box.style.visibility = (p.y < -40 || p.y > innerHeight + 60) ? 'hidden' : 'visible'; c.box.style.transform = 'translate(' + (p.x - 20).toFixed(1) + 'px,' + (p.y - 50).toFixed(1) + 'px)'; c.flipEl.style.transformOrigin = c.pose === 'hang' ? '20px 15px' : '20px 50px'; c.flipEl.style.transform = (c.rot ? 'rotate(' + c.rot.toFixed(2) + 'deg) ' : '') + (c.flip ? 'scaleX(-1)' : '');
        const lvl = c.ropeHold ? 3 : c.pose === 'hang' ? 2 : 1; if (c.lvl !== lvl) { c.lvl = lvl; const S = [0, [1.2, .8, .16], [3, 1.6, .13], [5, 2.4, .11]][lvl]; c.box.style.filter = 'drop-shadow(' + (-S[0]) + 'px ' + S[0] + 'px ' + S[1] + 'px rgba(40,38,30,' + S[2] + '))'; }
        if (c.clipY || c.clipX) { const bl = p.x - 20, bt = p.y - 50; const cb = c.clipY ? Math.max(0, bt + 52 - c.clipY()) : -12; let cl = -12, cr = -12; if (c.clipX) { const [L0, R0] = c.clipX(); cl = Math.max(-12, L0 - bl); cr = Math.max(-12, bl + 40 - R0); } c.box.style.clipPath = 'inset(-14px ' + cr.toFixed(1) + 'px ' + cb.toFixed(1) + 'px ' + cl.toFixed(1) + 'px)'; } else if (c.box.style.clipPath) c.box.style.clipPath = '';
        const offscr = p.y < -40 || p.y > innerHeight + 60; if (c.ropeEl) { if (c.ropeLine && !offscr) { const [A, B] = c.ropeLine, mx = (A.x + B.x) / 2 + (B.y - A.y) * .015, my = (A.y + B.y) / 2; let dd = 'M' + A.x.toFixed(1) + ' ' + A.y.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + B.x.toFixed(1) + ' ' + B.y.toFixed(1); if (c.lasso) dd += ' M' + (B.x - 4.5).toFixed(1) + ' ' + B.y.toFixed(1) + ' a4.5 2.6 0 1 0 9 0 a4.5 2.6 0 1 0 -9 0'; c.ropeEl.setAttribute('d', dd); } else c.ropeEl.setAttribute('d', ''); } });
      if (chars.size) raf = requestAnimationFrame(frameAll);
    };
    const makeChar = () => {
      const box = document.createElement('div');
      box.setAttribute('aria-hidden', 'true');
      box.style.cssText = 'position:fixed;left:0;top:0;width:40px;height:52px;pointer-events:none;z-index:40;will-change:transform;visibility:hidden;filter:drop-shadow(-1.2px 1.2px 0.8px rgba(40,38,30,.16));';
      const flipEl = document.createElement('div'); flipEl.style.cssText = 'width:100%;height:100%;transform-origin:20px 50px;';
      const svg = mk('svg', { width: 40, height: 52, viewBox: '0 0 40 52' }); svg.style.cssText = 'overflow:visible;display:block;transform-origin:20px 50px;transform:scale(0);';
      const parts = [];
      const ensure = (n) => { while (parts.length < n) { const el = mk('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); svg.insertBefore(el, svg.querySelector('g')); parts.push(el); } };
      flipEl.appendChild(svg); box.appendChild(flipEl); document.body.appendChild(box);
      const c = { box, flipEl, svg, pose: 'stand', flip: false, frame: 0, blink: 0, u: () => 0, base: () => null };
      c.offY = 0;
      c.pos = () => { const b = c.base(c.u()); if (!b) return null; const want = c.pose === 'sit' ? 8 : c.pose === 'hang' ? 35 : 0; if (c.pose === 'hang') c.offY = 35; else c.offY += (want - c.offY) * 0.18; return { x: b.x, y: b.y + c.offY }; };
      if (!ropeSvg) { ropeSvg = mk('svg', {}); ropeSvg.setAttribute('aria-hidden', 'true'); ropeSvg.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:39;overflow:visible;filter:drop-shadow(-3px 3px 1.5px rgba(40,38,30,.12));'; document.body.appendChild(ropeSvg); }
      c.ropeEl = mk('path', { fill: 'none', stroke: '#111', 'stroke-width': 1.2, 'stroke-linecap': 'round' }); ropeSvg.appendChild(c.ropeEl);
      const RIG = window.DoodleRig, POSES = RIG ? RIG.load() : null;
      c.jit = RIG ? RIG.jitter() : []; c.cast = RIG ? RIG.CAST[Math.floor(Math.random() * RIG.CAST.length)] : 'pip';
      const target = () => {
        const fr = c.frame, s = fr % 2, pose = c.pose;
        const k = pose === 'walk' ? 'stand' : (POSES[pose] ? pose : 'stand');
        const p = RIG.clone(POSES[k]), tm = performance.now() / 1000 + (c.seed || (c.seed = Math.random() * 10));
        const shift = (keys, dx, dy) => keys.forEach(q => { p[q][0] += dx; p[q][1] += dy; });
        if (pose === 'walk') {
          const ph = tm * Math.PI * 2 * 1.5, sL = Math.sin(ph), sR = -sL, lL = Math.max(0, Math.cos(ph)), lR = Math.max(0, -Math.cos(ph));
          p.fL[0] += sL * 3.2; p.fL[1] -= lL * 1.8; p.kL[0] += sL * 1.7; p.kL[1] -= lL * .9;
          p.fR[0] += sR * 3.2; p.fR[1] -= lR * 1.8; p.kR[0] += sR * 1.7; p.kR[1] -= lR * .9;
          p.hL[0] += sR * 2.4; p.eL[0] += sR * 1.1; p.hR[0] += sL * 2.4; p.eR[0] += sR * -1.1;
          shift(['head', 'neck', 'eL', 'hL', 'eR', 'hR'], .5, -Math.abs(Math.cos(ph)) * .9); p.hip[1] -= Math.abs(Math.cos(ph)) * .5;
        } else if (pose === 'stand' || pose === 'wave') { const br = Math.sin(tm * 1.7) * .35; shift(['head', 'neck'], Math.sin(tm * .6) * .4, br); }
        if (pose === 'sit') { const sw = Math.sin(tm * 2.3) * 2.4; shift(['head'], Math.sin(tm * .5) * .5, Math.sin(tm * 1.6) * .3); p.fL[0] += sw; p.fR[0] -= sw; p.kL[0] += sw * 0.4; p.kR[0] -= sw * 0.4; }
        if (pose === 'wave') { const wv = Math.sin(tm * 9); p.hR[0] += wv * 1.8; p.hR[1] += Math.abs(wv) * .7; p.eR[0] += wv * .5; }
        if (pose === 'hang') {
          const hs = c.handScreen && c.handScreen();
          if (hs) { const th = -(c.rot || 0) * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th); const loc = (H) => { const dx = H.x - hs.P.x, dy = H.y - hs.P.y; let lx = dx * cs - dy * sn, ly = dx * sn + dy * cs; if (c.flip) lx = -lx; return [20 + lx, 15 + ly]; }; const a1 = loc(hs.A), b1 = loc(hs.B); const [l, r] = a1[0] < b1[0] ? [a1, b1] : [b1, a1]; p.hL = l; p.hR = r; p.eL = [Math.min(l[0] - 6, 6.5), (l[1] + p.neck[1]) / 2 - 2]; p.eR = [Math.max(r[0] + 6, 33.5), (r[1] + p.neck[1]) / 2 - 2]; }
          if (c.ropeHold) { p.hL = [19.3, 12.6]; p.hR = [20.7, 16.4]; p.eL = [14.6, 21.5]; p.eR = [25.4, 23.5]; }
          const sw = -(c.rot || 0) * 0.16 * (c.flip ? -1 : 1) + Math.sin(fr * 0.7) * 0.8;
          p.fL[0] += sw * 1.4; p.fR[0] += sw * 1.4; p.kL[0] += sw * 0.6; p.kR[0] += sw * 0.6;
        }
        return p;
      };
      c.render = () => {
        if (!RIG) return;
        const t = target();
        if (!c.cur) c.cur = t; else for (const k in t) c.cur[k] = [c.cur[k][0] + (t[k][0] - c.cur[k][0]) * 0.3, c.cur[k][1] + (t[k][1] - c.cur[k][1]) * 0.3];
        if (c.pose === 'hang') { c.cur.hL = t.hL; c.cur.hR = t.hR; }
        const ls = RIG.layers(c.cur, { jit: c.jit, blink: c.blink > 0, smile: c.pose === 'wave', cast: c.cast }), ink = c.ink || '#111', paper = c.paper || '#f1f3ea';
        ensure(ls.length);
        parts.forEach((el, i) => { const l = ls[i]; if (!l) { el.setAttribute('d', ''); return; } el.setAttribute('d', l.d); el.setAttribute('fill', l.fill === 'paper' ? paper : l.fill === 'ink' ? ink : 'none'); el.setAttribute('stroke', ink); el.setAttribute('stroke-width', l.w); });
      };
      const tickJ = () => { c.frame++; c.jit = RIG ? RIG.jitter() : []; if (c.blink > 0) c.blink--; else if (Math.random() < 0.04) c.blink = 2; };
      c.render(); const iv = setInterval(tickJ, 130);
      c.popIn = () => { svg.style.transformOrigin = c.pose === 'hang' ? '20px 15px' : c.pose === 'sit' ? '20px 42px' : '20px 50px'; svg.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.18)', offset: 0.62 }, { transform: 'scale(1)' }], { duration: 460, easing: 'cubic-bezier(.3,0,.3,1)', fill: 'forwards' }); return wait(460); };
      c.poof = () => { svg.style.transformOrigin = c.pose === 'hang' ? '20px 15px' : c.pose === 'sit' ? '20px 42px' : '20px 50px';
        const g = mk('g', {}); svg.appendChild(g);
        for (let i = 0; i < 7; i++) { const t = (i / 7) * Math.PI * 2 + rnd(-.2, .2); g.appendChild(mk('path', { d: pts2d([[20 + Math.cos(t) * 15, 24 + Math.sin(t) * 17], [20 + Math.cos(t) * 21, 24 + Math.sin(t) * 23]]), stroke: c.ink || '#111', 'stroke-width': 1.3, 'stroke-linecap': 'round', fill: 'none' })); }
        g.animate([{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }], { duration: 420, fill: 'forwards' });
        svg.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: 0.3 }, { transform: 'scale(0)' }], { duration: 360, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
        return wait(440).then(() => g.remove());
      };
      c.kill = () => { clearInterval(iv); box.remove(); c.ropeEl && c.ropeEl.remove(); chars.delete(c); };
      c.set = (v) => { c.u = () => v; };
      c.tween = (a, z, dur) => { const t0 = performance.now(); c.flip = z < a; c.u = () => { const k = Math.min(1, (performance.now() - t0) / dur); const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; return a + (z - a) * (0.15 * k + 0.85 * e); }; return wait(dur).then(() => c.set(z)); };
      chars.add(c); if (!raf) raf = requestAnimationFrame(frameAll);
      return c;
    };
    this._charsKill = () => { timers.forEach(clearTimeout); cancelAnimationFrame(raf); [...chars].forEach(c => c.kill()); };
    const imgTargets = () => [...document.querySelectorAll('img')].filter(im => !im.closest('aside') && !im.closest('[role="dialog"]') && getComputedStyle(im).position !== 'fixed' && (() => { const r = im.getBoundingClientRect(); return r.width > 130 && r.height > 90 && r.top > 50 && r.top < innerHeight - 70 && r.left >= 0; })());
    const strTargets = () => [...document.querySelectorAll('path[stroke="#c8102e"]')].filter(p => onScreen(p.ownerSVGElement.getBoundingClientRect()));
    const rowTargets = () => [...document.querySelectorAll('[data-row]')].filter(r => { const b = r.getBoundingClientRect(); return b.width > 0 && b.top > 40 && b.bottom < innerHeight - 20; });
    const feetHands = (c) => () => { const b = c.base(c.u()); return b && { x: b.x, y: b.y - 35 }; };
    const ropeIn = async (c, handsFn, finalPose) => {
      const side = Math.random() < .5 ? -1 : 1, prev = c.pos, t0 = performance.now(), py = -12;
      c.flip = side > 0; c.pose = 'hang'; c.ropeHold = true; c.svg.style.transform = 'scale(1)'; c.box.style.opacity = 1;
      c.pos = () => { const H = handsFn(); if (!H || H.y > innerHeight + 40 || H.y < -20) { c.ropeLine = null; return null; } const t = (performance.now() - t0) / 1000, Lr = Math.max(40, H.y - py), Lt = Lr * (0.55 + 0.45 * Math.min(1, t / 1.1)); let th = side * 1.2 * Math.exp(-1.8 * t) * Math.cos(2 * Math.PI * t / 1.45); if (t > 1.9) th *= Math.max(0, 1 - (t - 1.9) / .4); const hx = H.x + Lt * Math.sin(th), hy = py + Lt * Math.cos(th); c.rot = -th * 180 / Math.PI; c.ropeLine = [{ x: H.x, y: py }, { x: hx, y: hy }]; return { x: hx, y: hy + 35 }; };
      for (let i = 0; i < 20; i++) { await wait(122); const H = handsFn(); if (!H || H.y > innerHeight + 40 || H.y < -20) break; }
      c.rot = 0; c.ropeHold = false; c.pos = prev; if (finalPose) { c.pose = finalPose; c.offY = 0; }
      await anim(480, k => { const H = handsFn(); if (H && H.y < innerHeight + 40 && H.y > -20) c.ropeLine = [{ x: H.x, y: py }, { x: H.x, y: H.y + (py - H.y) * k * k }]; });
      c.ropeLine = null;
    };
    const ropeOut = async (c, handsFn) => {
      const py = -12, prev = c.pos;
      if (c.pose === 'sit') { c.pose = 'stand'; await wait(450); }
      if (c.pose !== 'hang') { c.pose = 'wave'; await wait(250); }
      await anim(560, k => { const H = handsFn(); if (!H) return; c.lasso = true; c.ropeLine = [{ x: H.x, y: H.y }, { x: H.x + Math.sin(k * 9) * 7 * (1 - k), y: H.y + (py - H.y) * Math.pow(k, .7) }]; });
      c.lasso = false; await wait(180);
      const H0 = handsFn(); if (!H0) return;
      const fixedHands = { dx: 0 }, t0 = performance.now();
      c.pose = 'hang'; c.ropeHold = true; c.offY = 35;
      c.pos = () => { const H = handsFn() || H0; if (H.y > innerHeight + 40) { c.ropeLine = null; return null; } const t = (performance.now() - t0) / 1000, lift = 30 * t + 300 * t * t, hx = H.x + Math.sin(t * 7) * 3 * Math.exp(-t), hy = H.y - lift; c.rot = -Math.sin(t * 7) * 6 * Math.exp(-t); c.ropeLine = [{ x: H.x, y: py }, { x: hx, y: hy }]; return { x: hx, y: hy + 35 }; };
      while (chars.has(c)) { await wait(120); const p = c.pos(); if (!p || p.y < -30) break; }
      c.ropeLine = null;
      c.ropeLine = null; c.ropeHold = false; c.rot = 0; c.pos = prev;
    };
    const walkOnOff = async (c, el, uFrom, uTo, perPx) => { c.clipX = () => { const r = el.getBoundingClientRect(); return [r.left, r.right]; }; c.pose = 'walk'; c.svg.style.transform = 'scale(1)'; c.box.style.opacity = 1; c.set(uFrom); await c.tween(uFrom, uTo, Math.max(1300, Math.abs(uTo - uFrom) * perPx * 30)); c.pose = 'stand'; };
    const sitOnImage = async (im) => {
      const c = makeChar(); c.target = im;
      c.base = (u) => { const r = im.getBoundingClientRect(); return { x: r.left + u * r.width, y: r.top }; };
      const W = () => im.getBoundingClientRect().width, uT = rnd(.2, .8), walked = Math.random() < .55, offL = -26 / W(), offR = 1 + 26 / W();
      if (walked) await walkOnOff(c, im, Math.random() < .5 ? offL : offR, uT, W());
      else { c.set(uT); await ropeIn(c, feetHands(c), 'stand'); }
      await wait(350); c.pose = 'sit'; await wait(rnd(1800, 3000));
      if (Math.random() < .5) { c.pose = 'wave'; await wait(1300); c.pose = 'sit'; await wait(rnd(900, 1600)); }
      if (walked || Math.random() < .4) { c.pose = 'stand'; await wait(400); await walkOnOff(c, im, uT, uT < .5 ? offL : offR, W()); }
      else await ropeOut(c, feetHands(c));
      c.kill();
    };
    const walkString = async (p) => {
      const sv = p.ownerSVGElement, L = p.getTotalLength(), c = makeChar(); c.target = p; c.pose = 'stand';
      c.base = (u) => { const pt = p.getPointAtLength(Math.max(0, Math.min(L, u))), r = sv.getBoundingClientRect(); return { x: r.left + pt.x / 100 * r.width, y: r.top + pt.y / 100 * r.height + 1 }; };
      const pxPer = () => sv.getBoundingClientRect().width / 100;
      const a = L * rnd(.08, .2), m = L * rnd(.42, .58), z = L * rnd(.8, .92);
      c.set(a); await ropeIn(c, feetHands(c), 'stand'); await wait(400);
      c.pose = 'walk'; await c.tween(a, m, Math.max(1600, (m - a) * pxPer() * 30));
      c.pose = Math.random() < .6 ? 'wave' : 'stand'; await wait(1200);
      c.pose = 'walk'; await c.tween(m, z, Math.max(1400, (z - m) * pxPer() * 30)); c.pose = 'stand'; await wait(700);
      await ropeOut(c, feetHands(c)); c.kill();
    };
    const anim = (dur, fn) => new Promise(res => { const t0 = performance.now(); const st = () => { const k = Math.min(1, (performance.now() - t0) / dur); fn(k); if (k < 1) requestAnimationFrame(st); else res(); }; requestAnimationFrame(st); });
    const swinger = async () => {
      const c = makeChar(); c.pose = 'hang'; c.rot = 0; c.hy = 0; c.svg.style.transform = 'scale(1)'; c.box.style.transformOrigin = '20px 15px'; c.box.style.opacity = 0;
      let p = null, sv = null, L = 0;
      c.handScreen = () => { if (!p) return null; const r = sv.getBoundingClientRect(), sx = r.width / 100, sy = r.height / 100, u = Math.max(0, Math.min(L, c.u())), dl = 8 / Math.max(.5, sx), at = (v) => { const q = p.getPointAtLength(Math.max(0, Math.min(L, v))); return { x: r.left + q.x * sx, y: r.top + q.y * sy }; }; return { P: at(u), A: at(u - dl), B: at(u + dl) }; };
      c.pos = () => { if (!p) return null; const u = Math.max(0, Math.min(L, c.u())), pt = p.getPointAtLength(u), q1 = p.getPointAtLength(Math.min(L, u + 1.2)), q0 = p.getPointAtLength(Math.max(0, u - 1.2)), r = sv.getBoundingClientRect(), sx = r.width / 100, sy = r.height / 100; c.alpha = Math.atan2((q1.y - q0.y) * sy, (q1.x - q0.x) * sx); return { x: r.left + pt.x * sx, y: r.top + pt.y * sy + 35 + c.hy }; };
      while (chars.has(c)) {
        const st = strTargets();
        if (!st.length) { p = null; c.box.style.opacity = 0; await wait(700); continue; }
        const others = st.filter(x => x !== p); p = others.length ? pick(others) : st[0]; sv = p.ownerSVGElement; L = p.getTotalLength(); c.target = p;
        const fwd = Math.random() < .5, a = fwd ? L * .05 : L * .95, z = fwd ? L * .95 : L * .05;
        c.flip = p.getPointAtLength(z).x < p.getPointAtLength(a).x; const dir = c.flip ? -1 : 1;
        c.set(a); c.rot = 0; c.tick = null; c.hy = 0;
        await ropeIn(c, () => { const hs = c.handScreen(); return hs && hs.P; }, null);
        c.hy = 0;
        const pxw = () => sv.getBoundingClientRect().width / 100, dur = Math.max(4000, Math.abs(z - a) * pxw() / 34 * 1000), t0 = performance.now();
        c.u = () => { const k = Math.min(1, (performance.now() - t0) / dur); return a + (z - a) * (k - Math.sin(k * Math.PI * 2 * Math.round(dur / 900)) / (Math.PI * 2 * Math.round(dur / 900)) * 0.5); };
        c.tick = (now) => { const t = (now - t0) / 1000; c.rot = dir * (8 + 12 * Math.exp(-t * 1.6)) * Math.sin(t * Math.PI * 2 / 1.8 + 0.3); };
        let off = 0; const tEnd = t0 + dur;
        while (performance.now() < tEnd && chars.has(c)) { await wait(300); const r = sv.getBoundingClientRect(); off = (r.bottom < 0 || r.top > innerHeight) ? off + 300 : 0; if (off > 1200) break; }
        c.set(c.u()); c.tick = null; const r0 = c.rot;
        await anim(260, k => { c.rot = r0 * (1 - k); });
        await wait(rnd(500, 1200));
        await ropeOut(c, () => { const hs = c.handScreen(); return hs && hs.P; });
        c.box.style.opacity = 0; c.hy = 0; c.rot = 0;
        await wait(rnd(900, 1800));
      }
    };
    timers.push(setTimeout(swinger, 700));
    const walkRow = async (row) => {
      const c = makeChar(); c.target = row;
      const lineY = () => { const cells = [...row.children], r = row.getBoundingClientRect(), first = cells[0] && cells[0].getBoundingClientRect(); return first && first.bottom < r.bottom - 2 ? first.bottom - .5 : r.top; };
      c.base = (u) => { const r = row.getBoundingClientRect(); return { x: r.left + u, y: lineY() }; };
      const W = row.getBoundingClientRect().width, m = rnd(W * .25, W * .75), walked = Math.random() < .6, from = Math.random() < .5 ? -24 : W + 24;
      if (walked) { c.clipX = () => { const r = row.getBoundingClientRect(); return [r.left, r.right]; }; c.pose = 'walk'; c.svg.style.transform = 'scale(1)'; c.set(from); await c.tween(from, m, Math.max(1500, Math.abs(m - from) * 30)); c.pose = 'stand'; }
      else { c.set(m); await ropeIn(c, feetHands(c), 'stand'); }
      await wait(350); c.pose = 'sit'; await wait(rnd(2000, 3400));
      if (walked) { c.pose = 'stand'; await wait(400); const to = m < W / 2 ? -24 : W + 24; c.pose = 'walk'; await c.tween(m, to, Math.max(1400, Math.abs(to - m) * 30)); }
      else await ropeOut(c, feetHands(c));
      c.kill();
    };
    const peek = async (im) => {
      const c = makeChar(); c.target = im; c.pose = 'stand'; c.flip = Math.random() < .5; c.svg.style.transform = 'scale(1)';
      const fx = rnd(.12, .88);
      c.base = (u) => { const r = im.getBoundingClientRect(); return { x: r.left + fx * r.width, y: r.top + u }; };
      c.clipY = () => im.getBoundingClientRect().top;
      c.set(54); await wait(rnd(200, 600));
      await c.tween(54, 18, 900);
      await wait(rnd(1400, 2400));
      if (Math.random() < .35) { await c.tween(18, 13, 300); c.pose = 'wave'; await wait(1100); c.pose = 'stand'; await c.tween(13, 18, 300); }
      await wait(rnd(400, 900));
      await c.tween(18, 56, 650); c.kill();
    };
    const hitText = (x, y) => {
      if (x < 2 || y < 2 || x > innerWidth - 2 || y > innerHeight - 2) return true;
      const el = document.elementFromPoint(x, y); if (!el) return false;
      if (el.closest('aside') || el.closest('button') || el.closest('a')) return true;
      for (const n of el.childNodes) { if (n.nodeType !== 3 || !n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const q of rg.getClientRects()) if (x >= q.left - 3 && x <= q.right + 3 && y >= q.top - 3 && y <= q.bottom + 3) return true; }
      return false;
    };
    const freeBox = (cx, footY, h = 46) => { for (const dx of [-11, 0, 11]) for (const dy of [4, 14, 26, h]) if (hitText(cx + dx, footY - dy)) return false; return true; };
    let borderCache = [], borderT = 0;
    const borderEls = () => { if (performance.now() - borderT > 8000) { borderT = performance.now(); borderCache = [...document.querySelectorAll('div, h3, section')].filter(el => { if (el.closest('aside') || el.closest('[role="dialog"]')) return false; const cs = getComputedStyle(el); return parseFloat(cs.borderBottomWidth) >= 1 && cs.borderBottomStyle === 'solid' && el.offsetWidth > 220; }); } return borderCache; };
    const ledges = () => {
      const out = [];
      imgTargets().forEach(im => out.push({ el: im, kind: 'top' }));
      borderEls().forEach(el => { const r = el.getBoundingClientRect(); if (r.bottom > 70 && r.bottom < innerHeight - 20) out.push({ el, kind: 'bottom' }); });
      return out;
    };
    const ledgeY = (L) => { const r = L.el.getBoundingClientRect(); return L.kind === 'top' ? r.top : r.bottom - .5; };
    const pathFree = (L, u0, u1) => { const r = L.el.getBoundingClientRect(), y = ledgeY(L), n = Math.max(2, Math.ceil(Math.abs(u1 - u0) * r.width / 16)); for (let i = 0; i <= n; i++) { const u = u0 + (u1 - u0) * i / n, x = r.left + u * r.width; if (x < r.left + 4 || x > r.right - 4) continue; if (!freeBox(x, y)) return false; } return true; };
    const sitLedge = async (L, uT) => {
      const c = makeChar(); c.target = L.el;
      c.base = (u) => { const r = L.el.getBoundingClientRect(); return { x: r.left + u * r.width, y: ledgeY(L) }; };
      const W = () => L.el.getBoundingClientRect().width, offL = -26 / W(), offR = 1 + 26 / W();
      const canL = pathFree(L, 0, uT), canR = pathFree(L, uT, 1);
      const walked = (canL || canR) && Math.random() < .7, fromL = canL && (!canR || Math.random() < .5);
      if (walked) await walkOnOff(c, L.el, fromL ? offL : offR, uT, W());
      else { c.set(uT); await ropeIn(c, feetHands(c), 'stand'); }
      await wait(350); c.pose = 'sit'; await wait(rnd(2000, 3400));
      if (Math.random() < .45) { c.pose = 'wave'; await wait(1300); c.pose = 'sit'; await wait(rnd(900, 1600)); }
      const outL = pathFree(L, 0, uT), outR = pathFree(L, uT, 1);
      if (walked && (outL || outR)) { c.pose = 'stand'; await wait(400); await walkOnOff(c, L.el, uT, (outL && (!outR || uT < .5)) ? offL : offR, W()); }
      else await ropeOut(c, feetHands(c));
      c.kill();
    };
    const planLedge = (L) => {
      const r = L.el.getBoundingClientRect(), y = ledgeY(L); if (r.width < 80 || y < 70 || y > innerHeight - 24) return null;
      const cands = []; for (let i = 1; i < 14; i++) { const u = i / 14, x = r.left + u * r.width; if (freeBox(x, y)) cands.push(u); }
      if (!cands.length) return null; const u = pick(cands); return { x: r.left + u * r.width, y, run: () => sitLedge(L, u) };
    };
    const planString = (p) => {
      const sv = p.ownerSVGElement, L = p.getTotalLength(), r = sv.getBoundingClientRect(), N = 36, ok = [];
      for (let i = 0; i <= N; i++) { const pt = p.getPointAtLength(L * i / N); ok.push(freeBox(r.left + pt.x / 100 * r.width, r.top + pt.y / 100 * r.height)); }
      let best = [0, -1], st = -1; for (let i = 0; i <= N; i++) { if (ok[i]) { if (st < 0) st = i; if (i - st > best[1] - best[0]) best = [st, i]; } else st = -1; }
      if (best[1] - best[0] < 6) return null;
      const a = L * best[0] / N, z = L * best[1] / N, mid = p.getPointAtLength((a + z) / 2);
      return { x: r.left + mid.x / 100 * r.width, y: r.top + mid.y / 100 * r.height, run: () => walkStringRun(p, a, z) };
    };
    const walkStringRun = async (p, a0, z0) => {
      const sv = p.ownerSVGElement, L = p.getTotalLength(), c = makeChar(); c.target = p; c.pose = 'stand';
      c.base = (u) => { const pt = p.getPointAtLength(Math.max(0, Math.min(L, u))), r = sv.getBoundingClientRect(); return { x: r.left + pt.x / 100 * r.width, y: r.top + pt.y / 100 * r.height + 1 }; };
      const pxPer = () => sv.getBoundingClientRect().width / 100, fw = Math.random() < .5, a = fw ? a0 : z0, z = fw ? z0 : a0, m = (a + z) / 2;
      c.set(a); await ropeIn(c, feetHands(c), 'stand'); await wait(400);
      c.pose = 'walk'; await c.tween(a, m, Math.max(1500, Math.abs(m - a) * pxPer() * 30));
      c.pose = Math.random() < .6 ? 'wave' : 'stand'; await wait(1200);
      c.pose = 'walk'; await c.tween(m, z, Math.max(1400, Math.abs(z - m) * pxPer() * 30)); c.pose = 'sit'; await wait(rnd(1400, 2400));
      await ropeOut(c, feetHands(c)); c.kill();
    };
    const runner = () => {
      if (chars.size >= 5) return false;
      const ps = [...chars].map(c => c.pos()).filter(Boolean), busy = new Set([...chars].map(c => c.target));
      const plans = [];
      ledges().forEach(L => { if (!busy.has(L.el)) { const pl = planLedge(L); if (pl) plans.push(pl); } });
      strTargets().forEach(p => { if (!busy.has(p)) { const pl = planString(p); if (pl) { plans.push(pl); plans.push(pl); } } });
      if (!plans.length) return false;
      const sc = plans.map(pl => [pl, ps.length ? Math.min(...ps.map(q => Math.hypot(q.x - pl.x, q.y - pl.y))) : 1e4]).filter(s => s[1] > 160);
      if (!sc.length) return false;
      sc.sort((a, b) => b[1] - a[1]); pick(sc.slice(0, 4))[0].run(); return true;
    };
    let runs = 0;
    const doodle = () => {
      if (!document.hidden && (runs === 0 || chars.size === 0 || Math.random() < 0.6) && runner()) { runs++; return; }
      const cells = [...document.querySelectorAll('[data-row] > div[title]')].filter(c => { const r = c.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; });
      if (!cells.length || document.hidden) return;
      const cell = cells[Math.floor(Math.random() * cells.length)], row = cell.parentElement;
      if (getComputedStyle(row).position === 'static') row.style.position = 'relative';
      const kind = KEYS[Math.floor(Math.random() * KEYS.length)];
      const w = cell.offsetWidth, h = cell.offsetHeight, pad = 40;
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('width', w + pad * 2); svg.setAttribute('height', h + pad * 2);
      svg.style.cssText = 'position:absolute;pointer-events:none;overflow:visible;z-index:6;left:' + (cell.offsetLeft - pad) + 'px;top:' + (cell.offsetTop - pad) + 'px;';
      const g = document.createElementNS(NS, 'g'); g.setAttribute('transform', 'translate(' + pad + ' ' + pad + ')'); svg.appendChild(g);
      const paths = SHAPES[kind](w, h, 1).map(() => { const p = document.createElementNS(NS, 'path'); p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#111'); p.setAttribute('stroke-width', '1.6'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); g.appendChild(p); return p; });
      const boil = () => { SHAPES[kind](w, h, 1).forEach((d, i) => paths[i] && paths[i].setAttribute('d', d)); };
      boil(); row.appendChild(svg);
      paths.forEach((p, i) => { const L = p.getTotalLength() + 2; p.style.strokeDasharray = L; p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 520 + L * 1.4, delay: i * 180, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' }); });
      const iv = setInterval(boil, 110);
      const hold = 1800 + Math.random() * 1200;
      setTimeout(() => { svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: 'forwards' }).onfinish = () => { clearInterval(iv); svg.remove(); }; }, hold + 700);
    };
    const loop = () => { doodle(); this._doodleT = setTimeout(loop, 2200 + Math.random() * 3200); };
    const watch = () => { const seen = [...chars].some(c => c.box.style.visibility === 'visible' && c.box.style.opacity !== '0'); if (!document.hidden && !seen) runner(); timers.push(setTimeout(watch, 900)); };
    timers.push(setTimeout(watch, 1200));
    this._doodleT = setTimeout(loop, 1500);
  }
  componentWillUnmount() { this._charsKill && this._charsKill(); document.removeEventListener("click", this._lbClick, true); document.removeEventListener("keydown", this._lbKey); clearTimeout(this._doodleT); cancelAnimationFrame(this._raf); cancelAnimationFrame(this._dvdRaf); this._cleanup && this._cleanup(); this._dvdCleanup && this._dvdCleanup(); }
  renderVals() { const TERM = ['> source("GSE162467_complete_analysis.R")', '=== SECTION 10: UMAP ===', '=== SECTION 11: SingleR annotation (ImmGen) ===', 'VCL arm — n = 2729 cells', 'Leiden clusters (res = 0.6) → 13 clusters', 'rendering F1_VCL_UMAP_CellTypes.pdf ...', 'Saved F1'];
    const ph = this.state?.ph || 'idle', nl = this.state?.nl || 0;
    const runDemo = () => {
      (this._runT || []).forEach(clearTimeout); this._runT = [];
      this.setState({ ph: 'run', nl: 0 });
      TERM.forEach((_, i) => this._runT.push(setTimeout(() => this.setState({ nl: i + 1 }), 200 + i * 210)));
      this._runT.push(setTimeout(() => this.setState({ ph: 'done' }), 200 + TERM.length * 210 + 600));
    };
    return { runDemo, runLabel: ph === 'idle' ? 'run' : ph === 'run' ? 'running…' : 'run again', showCode: ph !== 'run', showTerm: ph === 'run', showPlot: false, termLines: TERM.slice(0, nl), lbOpen: !!this.state?.lb, lbImg: this.state?.lb ? React.createElement('img', { src: this.state.lb, alt: '', style: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', boxShadow: '0 0 0 1px #111', background: '#f1f3ea', animation: 'lbZoom .55s cubic-bezier(.22,1,.36,1) both' } }) : null, closeLb: () => this.setState({ lb: null }) }; }
}

const component = new Component();
component.refresh();
document.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', () => component.renderVals()[el.dataset.action]()));
document.querySelectorAll('[style-hover]').forEach(el => { const initial = el.getAttribute('style'); el.addEventListener('mouseenter', () => el.setAttribute('style', initial + ';' + el.getAttribute('style-hover'))); el.addEventListener('mouseleave', () => el.setAttribute('style', initial)); });
component.componentDidMount();
window.addEventListener('pagehide', () => component.componentWillUnmount(), {once:true});
