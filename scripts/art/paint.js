// Runs in the browser: paints a wind-swept, oil-paint style gradient onto a canvas.
window.paint = function paint(canvas, o) {
  const W = (canvas.width = o.w), H = (canvas.height = o.h);
  const ctx = canvas.getContext('2d');
  let s = o.seed >>> 0;
  const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // value noise
  const G = 64, grid = new Float32Array(G * G).map(() => rnd());
  const sm = (t) => t * t * (3 - 2 * t);
  const noise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi); const g = (a, b) => grid[((b % G + G) % G) * G + ((a % G + G) % G)]; return (g(xi, yi) * (1 - xf) + g(xi + 1, yi) * xf) * (1 - yf) + (g(xi, yi + 1) * (1 - xf) + g(xi + 1, yi + 1) * xf) * yf; };
  const fbm = (x, y) => 0.6 * noise(x, y) + 0.3 * noise(x * 2.1 + 9, y * 2.1 + 4) + 0.1 * noise(x * 4.3 + 2, y * 4.3 + 7);
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const stops = o.stops.map(([t, c]) => [t, hex(c)]);
  const pal = (t) => { t = Math.max(0, Math.min(1, t)); for (let i = 1; i < stops.length; i++) { if (t <= stops[i][0]) { const [t0, a] = stops[i - 1], [t1, b] = stops[i]; const k = (t - t0) / (t1 - t0 || 1); return a.map((v, j) => Math.round(v + (b[j] - v) * k)); } } return stops[stops.length - 1][1]; };
  const ang = o.angle, ca = Math.cos(ang), sa = Math.sin(ang);
  // colour field: a ramp across the canvas, bent by low-frequency noise stretched along the stroke direction
  const field = (x, y) => {
    const u = x / W, v = y / H;
    const along = (x * ca + y * sa) / Math.max(W, H), across = (-x * sa + y * ca) / Math.max(W, H);
    const n = fbm(along * o.nAlong + 3, across * o.nAcross + 5);
    return o.ramp(u, v) + (n - 0.5) * o.noiseAmp;
  };
  ctx.fillStyle = `rgb(${pal(0.5).join(',')})`; ctx.fillRect(0, 0, W, H);
  ctx.lineCap = 'round';
  const pass = (count, wMin, wMax, lMin, lMax, aMin, aMax, jitter, tone) => {
    for (let i = 0; i < count; i++) {
      const x = rnd() * W * 1.3 - W * 0.15, y = rnd() * H * 1.3 - H * 0.15;
      let c = pal(field(x, y) + (rnd() - 0.5) * jitter);
      if (tone) { const d = (rnd() - 0.5) * tone; c = c.map((v) => Math.max(0, Math.min(255, v + d))); }
      const len = lMin + rnd() * (lMax - lMin), a = ang + (fbm(x * 0.0015, y * 0.0015) - 0.5) * o.wobble;
      const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
      ctx.strokeStyle = `rgba(${c.map(Math.round).join(',')},${aMin + rnd() * (aMax - aMin)})`;
      ctx.lineWidth = wMin + Math.pow(rnd(), 2) * (wMax - wMin);
      ctx.beginPath(); ctx.moveTo(x - dx, y - dy);
      ctx.quadraticCurveTo(x + (rnd() - 0.5) * len * 0.06, y + (rnd() - 0.5) * len * 0.06, x + dx, y + dy); ctx.stroke();
    }
  };
  const k = (W * H) / (1600 * 1600);
  pass(700 * k, 120, 320, 500, 1300, 0.35, 0.6, 0.10, 0);     // lay in the big masses
  pass(2600 * k, 18, 90, 300, 1000, 0.12, 0.30, 0.22, 10);    // broad strokes
  // soften into one surface
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; tmp.getContext('2d').drawImage(canvas, 0, 0);
  ctx.filter = `blur(${o.blur}px)`; ctx.drawImage(tmp, 0, 0); ctx.filter = 'none';
  pass(5200 * k, 3, 22, 220, 800, 0.05, 0.16, 0.30, 22);      // bristle streaks
  pass(9000 * k, 0.6, 2.4, 160, 620, 0.04, 0.12, 0.34, 46);   // fine hairs
  // grain
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * o.grain; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
};
