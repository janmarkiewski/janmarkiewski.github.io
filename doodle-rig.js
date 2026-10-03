// Shared stick-figure rig: joint poses (40x52 box, feet anchor at 20,50) + path builder.
window.DoodleRig = (() => {
  const DEF = {
    'stand':  { head: [20, 22.5], neck: [20, 32.4], hip: [20, 43.5], eL: [15.5, 37.5], hL: [14, 41], eR: [24.5, 37.5], hR: [26, 41], kL: [18, 47], fL: [16.5, 50], kR: [22, 47], fR: [23.5, 50] },
    'walk-1': { head: [20, 21.8], neck: [20, 31.7], hip: [20, 43.2], eL: [15.8, 36.8], hL: [14.2, 39.5], eR: [24.2, 37.2], hR: [26, 41], kL: [16.6, 47], fL: [14.5, 50], kR: [22.6, 47], fR: [25.5, 50] },
    'walk-2': { head: [20, 22.5], neck: [20, 32.4], hip: [20, 43.5], eL: [15.8, 37.4], hL: [14.2, 41], eR: [24.2, 37], hR: [26, 39.5], kL: [18.6, 47], fL: [17, 50], kR: [21, 47], fR: [22.5, 50] },
    'sit':    { head: [20, 20.5], neck: [20, 30.4], hip: [20, 42], eL: [15.5, 36], hL: [14, 39.5], eR: [24.5, 36], hR: [26, 39.5], kL: [21, 44.5], fL: [22.5, 48.5], kR: [25, 44.5], fR: [26.5, 48.5] },
    'wave':   { head: [20, 22.5], neck: [20, 32.4], hip: [20, 43.5], eL: [15.6, 37.6], hL: [14, 41], eR: [27, 33.5], hR: [32.5, 26], kL: [18, 47], fL: [16.5, 50], kR: [22, 47], fR: [23.5, 50] },
    'hang':   { head: [20, 27], neck: [20, 37], hip: [20, 47], eL: [5, 26], hL: [12, 15], eR: [35, 26], hR: [28, 15], kL: [18.5, 50.5], fL: [17, 54], kR: [21.5, 50.5], fR: [23, 54] }
  };
  const ANCHOR = { 'stand': 50, 'walk-1': 50, 'walk-2': 50, 'sit': 42, 'wave': 50, 'hang': 15 };
  const JOINTS = ['head', 'neck', 'hip', 'eL', 'hL', 'eR', 'hR', 'kL', 'fL', 'kR', 'fR'];
  const CAST = ['pip', 'ada', 'oz', 'juno', 'moss', 'dot'];
  const HEADS = { pip: [1, 0.96, 0.4], ada: [0.98, 0.95, 1.7], oz: [1.04, 0.93, 2.6], juno: [1, 0.97, 3.3], moss: [1.02, 0.94, 4.4], dot: [0.97, 0.96, 5.2] };
  const KEY = 'doodle-poses-v2';
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const load = () => {
    const out = clone(DEF);
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) for (const k in s) if (out[k]) Object.assign(out[k], s[k]); } catch (e) {}
    if (window.DOODLE_POSES_BAKED) for (const k in window.DOODLE_POSES_BAKED) if (out[k] && !localStorage.getItem(KEY)) Object.assign(out[k], window.DOODLE_POSES_BAKED[k]);
    return out;
  };
  const save = (poses) => { try { localStorage.setItem(KEY, JSON.stringify(poses)); } catch (e) {} };
  const reset = () => { try { localStorage.removeItem(KEY); } catch (e) {} };
  const jitter = (amp = 1.2) => Array.from({ length: 24 }, () => (Math.random() - 0.5) * amp);
  const f = (n) => n.toFixed(2);
  const pts = (q) => 'M' + q.map(v => f(v[0]) + ' ' + f(v[1])).join(' L');
  const smooth = (p) => { let d = 'M' + f(p[0][0]) + ' ' + f(p[0][1]); for (let i = 1; i < p.length - 1; i++) { const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; d += ' Q' + f(p[i][0]) + ' ' + f(p[i][1]) + ' ' + f(mx) + ' ' + f(my); } const l = p[p.length - 1]; return d + ' L' + f(l[0]) + ' ' + f(l[1]); };
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const nrm = (dx, dy) => { const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  const qpts = (a, el, b, n = 9) => { const c = [2 * el[0] - (a[0] + b[0]) / 2, 2 * el[1] - (a[1] + b[1]) / 2], o = []; for (let i = 0; i < n; i++) { const t = i / (n - 1), u = 1 - t; o.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } return o; };
  const seg = (ps, t0, t1) => { const n = ps.length - 1, at = (t) => { const x = Math.max(0, Math.min(1, t)) * n, i = Math.min(n - 1, Math.floor(x)); return lerp(ps[i], ps[i + 1], x - i); }; const o = []; for (let i = 0; i < 6; i++) o.push(at(t0 + (t1 - t0) * i / 5)); return o; };
  const closed = (q) => smooth([...q, q[0], q[1]]) + 'Z';
  const tube = (ps, w0, w1, J, o, cap) => {
    const L = [], R = [], n = ps.length;
    for (let i = 0; i < n; i++) { const a = ps[Math.max(0, i - 1)], b = ps[Math.min(n - 1, i + 1)], [dx, dy] = nrm(b[0] - a[0], b[1] - a[1]), w = w0 + (w1 - w0) * i / (n - 1); L.push([ps[i][0] - dy * w + J(i + o) * .16, ps[i][1] + dx * w + J(i + o + 3) * .16]); R.push([ps[i][0] + dy * w + J(i + o + 6) * .16, ps[i][1] - dx * w + J(i + o + 9) * .16]); }
    const e1 = ps[n - 1], [ex, ey] = nrm(e1[0] - ps[n - 2][0], e1[1] - ps[n - 2][1]), s0 = ps[0], [sx, sy] = nrm(s0[0] - ps[1][0], s0[1] - ps[1][1]);
    const q = cap ? [...L, [e1[0] + ex * w1 * .95, e1[1] + ey * w1 * .95], ...R.reverse(), [s0[0] + sx * w0 * .95, s0[1] + sy * w0 * .95]] : [...L, ...R.reverse()];
    return cap ? closed(q) : pts([...q, q[0]]);
  };
  const oval = (cx, cy, rx, ry, J, o, n = 12) => { const q = []; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; q.push([cx + Math.cos(t) * rx + J(i + o) * .2, cy + Math.sin(t) * ry + J(i + o + 4) * .2]); } return closed(q); };
  const OUTFIT = {
    pip:  { sleeve: .42, leg: .46, len: 1, flare: 0 },
    ada:  { sleeve: .3, sleeveW: 2, leg: 0, len: 5, flare: 2.8 },
    oz:   { sleeve: .93, leg: .9, len: 1, flare: 0, coat: true },
    juno: { sleeve: .9, leg: .9, len: 1.4, flare: .3 },
    moss: { sleeve: .42, leg: .52, len: .8, flare: 0, bib: true },
    dot:  { sleeve: .42, leg: 0, len: .5, flare: 0, skirt: true }
  };
  const layers = (p, o = {}) => {
    const j = o.jit || [], J = (i) => (j.length ? j[i % j.length] : 0), cast = o.cast || 'pip', of = OUTFIT[cast] || OUTFIT.pip;
    const P = (q, i, a = .5) => [q[0] + J(i) * a, q[1] + J(i + 11) * a];
    const out = [], A = (d, fill, w) => out.push({ d, fill: fill || null, w: w || 1.25 }), D = (d) => out.push({ d, fill: null, w: 0.7 });
    const [hx, hy] = p.head, [sxh, syh, ph] = HEADS[cast] || HEADS.pip;
    const nk = p.neck, hp = p.hip, shY = nk[1] + 0.6;
    const shL = [nk[0] - 3.7, shY + 1], shR = [nk[0] + 3.7, shY + 1], hipL = [hp[0] - 1.9, hp[1] + .2], hipR = [hp[0] + 1.9, hp[1] + .2];
    const legL = qpts(hipL, p.kL, p.fL), legR = qpts(hipR, p.kR, p.fR), armL = qpts(shL, p.eL, p.hL), armR = qpts(shR, p.eR, p.hR);
    const torso = (len, flare, k) => closed([[nk[0] - 1.9, shY - .3], P([nk[0] - 4.3, shY + .7], k), P(lerp([nk[0] - 4.4, shY], [hp[0] - 4.6 - flare * .4, hp[1]], .55), k + 1, .35), P([hp[0] - 4.8 - flare, hp[1] + len], k + 2, .35), P([hp[0], hp[1] + len + .5], k + 3, .3), P([hp[0] + 4.8 + flare, hp[1] + len], k + 4, .35), P(lerp([nk[0] + 4.4, shY], [hp[0] + 4.6 + flare * .4, hp[1]], .55), k + 5, .35), P([nk[0] + 4.3, shY + .7], k + 6), [nk[0] + 1.9, shY - .3]]);
    if (cast === 'dot') A(smooth([[hx - 8.4, hy - 5.6], [hx - 13.8 + J(1) * .4, hy - 3.8], [hx - 14.6 + J(2) * .5, hy + 1.6], [hx - 12.4 + J(3) * .5, hy + 6]]) + ' ' + smooth([[hx - 8.8, hy - 4.2], [hx - 12.2, hy - 2.4], [hx - 12.8, hy + 1.8], [hx - 11.6, hy + 4.6]]), null, 1.1);
    // legs
    [[legL, 20], [legR, 30]].forEach(([lg, k]) => { A(tube(seg(lg, Math.max(0, of.leg - .06), 1), .82, .75, J, k, true), 'paper'); if (of.leg) A(tube(seg(lg, 0, of.leg), 1.75, 1.6, J, k + 5, false), 'paper'); });
    if (cast === 'dot') [[legL, 40], [legR, 44]].forEach(([lg, k]) => { A(tube(seg(lg, .6, .9), 1, .95, J, k, false), 'paper', 1); });
    // shoes
    A(oval(p.fL[0] - 1, p.fL[1] - .9, 3.3, 1.75, J, 50), 'paper'); A(oval(p.fR[0] + 1, p.fR[1] - .9, 3.3, 1.75, J, 54), 'paper');
    D('M' + f(p.fL[0] - 4) + ' ' + f(p.fL[1] - .4) + ' Q' + f(p.fL[0] - 1) + ' ' + f(p.fL[1] + .5) + ' ' + f(p.fL[0] + 2) + ' ' + f(p.fL[1] - .4) + ' M' + f(p.fR[0] - 2) + ' ' + f(p.fR[1] - .4) + ' Q' + f(p.fR[0] + 1) + ' ' + f(p.fR[1] + .5) + ' ' + f(p.fR[0] + 4) + ' ' + f(p.fR[1] - .4));
    // coat back / torso
    if (of.coat) A(torso(5.4, 1.6, 60), 'paper');
    A(torso(of.len, of.flare, 70), 'paper');
    if (of.coat) { D(smooth([[nk[0] + .2, shY + .2], P([nk[0] + .5 + (hp[0] - nk[0]) * .5, (shY + hp[1]) / 2], 80, .3), [hp[0] + .6, hp[1] + 5.6]])); A('M' + f(nk[0] - 1.9) + ' ' + f(shY - .2) + ' L' + f(nk[0] - .4) + ' ' + f(shY + 3.4) + ' L' + f(nk[0] + .3) + ' ' + f(shY + .4) + ' M' + f(nk[0] + 1.9) + ' ' + f(shY - .2) + ' L' + f(nk[0] + 1.2) + ' ' + f(shY + 3.2), null, 1);
      const pk = lerp([nk[0] - 4, shY], [hp[0] - 5.4, hp[1] + 5], .72); D(pts([[pk[0], pk[1]], [pk[0] + .2, pk[1] + 2], [pk[0] + 2.4, pk[1] + 2], [pk[0] + 2.3, pk[1]]])); }
    else A('M' + f(nk[0] - 1.9) + ' ' + f(shY - .2) + ' Q' + f(nk[0]) + ' ' + f(shY + 2.2 + J(8) * .3) + ' ' + f(nk[0] + 1.9) + ' ' + f(shY - .2), null, 1);
    if (cast === 'pip') { const y = lerp([nk[0], shY], hp, .62)[1]; D('M' + f(hp[0] - 4.4) + ' ' + f(y) + ' Q' + f(hp[0] - 1) + ' ' + f(y - 1.2 + J(5) * .3) + ' ' + f(hp[0] + 1.4) + ' ' + f(y) + ' Q' + f(hp[0] + 3.4) + ' ' + f(y + 1) + ' ' + f(hp[0] + 4.6) + ' ' + f(y)); const pc = lerp([nk[0] + 1.4, shY + 2.2], hp, .1); D(pts([[pc[0], pc[1]], [pc[0] + .1, pc[1] + 1.8], [pc[0] + 2, pc[1] + 1.8], [pc[0] + 1.9, pc[1]]])); }
    if (cast === 'ada') { const wy = lerp([nk[0], shY], hp, .55); D('M' + f(wy[0] - 4.6) + ' ' + f(wy[1]) + ' Q' + f(wy[0]) + ' ' + f(wy[1] + .9) + ' ' + f(wy[0] + 4.6) + ' ' + f(wy[1])); for (let i = 0; i < 7; i++) { const q = [[-2, .7], [1.6, .75], [-3.6, .88], [0, .9], [3.4, .86], [-1.2, 1.02], [2.2, 1.04]][i], c = lerp([nk[0], shY], [hp[0], hp[1] + 4.6], q[1]); A('M' + f(c[0] + q[0] + J(i) * .3) + ' ' + f(c[1]) + ' l0.15 0', null, 1.1); } }
    if (cast === 'juno') { const by = hp[1] + 1.4; A(pts([[hp[0] - 5, by - 1.6], [hp[0] + 5, by - 1.6]]), null, 1); for (let i = 0; i < 6; i++) { const x = hp[0] - 4.2 + i * 1.7; D(pts([[x, by - 1.4], [x + J(i) * .2, by + .2]])); } }
    if (of.bib) { A(closed([P([nk[0] - 2.6, shY + 3.4], 90, .25), P([nk[0] + 2.6, shY + 3.4], 91, .25), P([hp[0] + 3.4, hp[1] + .6], 92, .25), P([hp[0] - 3.4, hp[1] + .6], 93, .25)]), 'paper', 1.1); D(pts([[nk[0] - 2.4, shY + 3.6], [nk[0] - 3.4, shY + .4]]) + ' ' + pts([[nk[0] + 2.4, shY + 3.6], [nk[0] + 3.4, shY + .4]])); A('M' + f(nk[0] - 1.8) + ' ' + f(shY + 4.4) + ' l0.15 0 M' + f(nk[0] + 1.8) + ' ' + f(shY + 4.4) + ' l0.15 0', null, 1.2); }
    if (of.skirt) { A(closed([P([hp[0] - 4.6, hp[1] - .4], 95, .25), P([hp[0] + 4.6, hp[1] - .4], 96, .25), P([hp[0] + 6.4, hp[1] + 4.2], 97, .3), P([hp[0], hp[1] + 4.7], 98, .3), P([hp[0] - 6.4, hp[1] + 4.2], 99, .3)]), 'paper', 1.15); for (let i = -1; i <= 1; i++) D(pts([[hp[0] + i * 2.2, hp[1]], [hp[0] + i * 3.3 + J(i + 2) * .2, hp[1] + 4.3]])); }
    // arms
    [[armL, 100], [armR, 110]].forEach(([am, k]) => { A(tube(seg(am, of.sleeve - .05, .97), .72, .68, J, k, true), 'paper'); A(tube(seg(am, 0, of.sleeve), of.sleeveW || 1.55, (of.sleeveW || 1.55) * .9, J, k + 4, false), 'paper', 1.15); });
    A(oval(p.hL[0], p.hL[1], 1.35, 1.3, J, 120, 9), 'paper', 1.1); A(oval(p.hR[0], p.hR[1], 1.35, 1.3, J, 124, 9), 'paper', 1.1);
    // head
    A(oval(hx - 9.7 * sxh, hy + .3, 2.3, 2.8, J, 130, 9), 'paper', 1.15); A(oval(hx + 9.7 * sxh, hy + .3, 2.3, 2.8, J, 134, 9), 'paper', 1.15);
    D('M' + f(hx - 10.4 * sxh) + ' ' + f(hy - .8) + ' q-0.9 1 0 2.2 M' + f(hx + 10.4 * sxh) + ' ' + f(hy - .8) + ' q0.9 1 0 2.2');
    const hq = []; for (let i = 0; i < 20; i++) { const t = (i / 20) * Math.PI * 2, rr = 10 * (1 + 0.045 * Math.sin(3 * t + ph) + 0.03 * Math.sin(5 * t + ph * 2)), yk = Math.sin(t) > 0 ? 1.02 : syh; hq.push([hx + Math.cos(t) * rr * sxh + J(i) * .55, hy + Math.sin(t) * rr * yk + J(i + 7) * .55]); }
    A(closed(hq), 'paper', 1.3);
    // face
    A(o.blink ? 'M' + f(hx - 3.6) + ' ' + f(hy) + ' l2 0 M' + f(hx + 1.6) + ' ' + f(hy) + ' l2 0' : 'M' + f(hx - 2.9) + ' ' + f(hy) + ' l0.4 0.1 M' + f(hx + 2.5) + ' ' + f(hy) + ' l0.4 0.1', null, o.blink ? 1 : 1.75);
    A('M' + f(hx - .2) + ' ' + f(hy + 1) + ' q1.6 -0.1 1.3 1.5', null, .9);
    A(o.smile ? 'M' + f(hx - 2.2) + ' ' + f(hy + 4) + ' Q' + f(hx + .2) + ' ' + f(hy + 6.3) + ' ' + f(hx + 2.4) + ' ' + f(hy + 4) : 'M' + f(hx - 1.5) + ' ' + f(hy + 4.6) + ' Q' + f(hx + .2 + J(2) * .3) + ' ' + f(hy + 5.4) + ' ' + f(hx + 1.8) + ' ' + f(hy + 4.4), null, 1);
    // hair / hats
    if (cast === 'pip') A('M' + f(hx - 0.8) + ' ' + f(hy - 9.4) + ' q0.6 -2.8 3 -2.6 M' + f(hx + .5) + ' ' + f(hy - 11) + ' q1.8 -0.5 2.1 1', null, 1.1);
    if (cast === 'ada') { A(oval(hx - 6.9, hy - 8.6, 2.7, 2.5, J, 140, 9), 'paper', 1.15); A(oval(hx + 6.9, hy - 8.6, 2.7, 2.5, J, 144, 9), 'paper', 1.15); D('M' + f(hx - 6.6) + ' ' + f(hy - 9.8) + ' q0.6 0.8 0 1.8 M' + f(hx + 7.2) + ' ' + f(hy - 9.8) + ' q-0.6 0.8 0 1.8'); }
    if (cast === 'oz') { A('M' + f(hx - 9.8) + ' ' + f(hy - 3) + ' Q' + f(hx) + ' ' + f(hy - 9.4) + ' ' + f(hx + 9.8) + ' ' + f(hy - 3), null, 1.1); A(oval(hx - 3.3, hy - 6.8, 2.5, 2.2, J, 150, 9), 'paper', 1.15); A(oval(hx + 3.3, hy - 6.8, 2.5, 2.2, J, 154, 9), 'paper', 1.15); D('M' + f(hx - 3.6) + ' ' + f(hy - 7.6) + ' q0.8 -0.6 1.4 0 M' + f(hx + 3) + ' ' + f(hy - 7.6) + ' q0.8 -0.6 1.4 0'); }
    if (cast === 'juno') { A(closed([[hx - 10.3, hy - 2.2], P([hx - 9.8, hy - 9], 160, .3), P([hx - 4, hy - 12.9], 161, .3), [hx, hy - 13.2], P([hx + 4, hy - 12.9], 162, .3), P([hx + 9.8, hy - 9], 163, .3), [hx + 10.3, hy - 2.2], [hx, hy - .4]]), 'paper', 1.2); A('M' + f(hx - 10.2) + ' ' + f(hy - 4.4) + ' Q' + f(hx) + ' ' + f(hy - 2.4) + ' ' + f(hx + 10.2) + ' ' + f(hy - 4.4), null, 1); for (let i = 0; i < 7; i++) { const x = hx - 7.2 + i * 2.4; D(pts([[x, hy - 4.4 + Math.abs(x - hx) * .05 + .9], [x, hy - 2.2 + Math.abs(x - hx) * .05]])); } A(oval(hx + J(6) * .2, hy - 14.8, 2, 1.9, J, 166, 9), 'paper', 1.1);
      A(closed([[nk[0] - 4, shY - .6], P([nk[0], shY + 1.6], 170, .25), [nk[0] + 4, shY - .6], [nk[0], shY + .2]]), 'paper', 1.1); A(tube([[nk[0] + 1.8, shY + .8], [nk[0] + 2.6, shY + 3.4], [nk[0] + 3 + J(9) * .3, shY + 6]], .9, .9, J, 172, false), 'paper', 1); }
    if (cast === 'moss') { const q = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * (1.06 + 0.88 * i / 14), rr = i % 2 ? 12.6 + J(i) * .9 : 9.6; q.push([hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 0.98]); } A(pts(q), null, 1.1); D('M' + f(hx - 5) + ' ' + f(hy + 2.4) + ' l0.1 0 M' + f(hx - 3.8) + ' ' + f(hy + 3.2) + ' l0.1 0 M' + f(hx + 4.4) + ' ' + f(hy + 2.6) + ' l0.1 0'); }
    if (cast === 'dot') { A('M' + f(hx - 8) + ' ' + f(hy - 4.4) + ' Q' + f(hx - 4) + ' ' + f(hy - 9.4 + J(1) * .4) + ' ' + f(hx + 1) + ' ' + f(hy - 6.4) + ' Q' + f(hx + 4.6) + ' ' + f(hy - 9.6) + ' ' + f(hx + 8.2) + ' ' + f(hy - 4.2), null, 1.1); A(oval(hx - 9.6, hy - 6, 1.1, 1.1, J, 180, 7), 'ink', .8); }
    return out;
  };
  const paths = layers;
  return { CAST, layers, DEF, ANCHOR, JOINTS, KEY, clone, load, save, reset, jitter, paths };
})();
