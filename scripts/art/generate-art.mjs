// Paints the green-to-orange gradient artwork used across the site and writes
// it to public/art/*.png. The output is committed (as WebP), so this only needs
// re-running to change the art. It drives a headless browser canvas, so it
// needs Playwright available (not a project dependency):
//
//   npx -p playwright node scripts/art/generate-art.mjs [name …]
//
// then convert the PNGs to WebP (quality ~80).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const G = [[0,'#07302b'],[0.16,'#0c5348'],[0.32,'#157a63'],[0.46,'#3fa585'],[0.56,'#b9c98f'],[0.66,'#f3c66b'],[0.78,'#f39a33'],[0.9,'#ea6a1f'],[1,'#c24612']];
const base = { stops: G, angle: -0.5, nAlong: 1.5, nAcross: 5, noiseAmp: 0.95, wobble: 0.7, blur: 14, grain: 14 };
const ARTS = {
  // hero: green upper-left sweeping to orange lower-right (portrait)
  hero: { ...base, w: 1400, h: 1750, seed: 11, ramp: (u, v) => 0.1 + 0.3 * u + 0.62 * v },
  // wide: mostly warm with a green current on the right
  wide: { ...base, w: 2000, h: 1100, seed: 23, angle: -1.15, nAlong: 1.6, nAcross: 6, ramp: (u, v) => 0.9 - 0.8 * Math.pow(u, 1.5) + 0.08 * v },
  // three step cards: green-led, balanced, orange-led
  step1: { ...base, w: 1200, h: 840, seed: 5, angle: -0.35, ramp: (u, v) => 0.12 + 0.5 * u + 0.25 * v },
  step2: { ...base, w: 1200, h: 840, seed: 31, angle: -0.8, ramp: (u, v) => 0.85 - 0.6 * u + 0.1 * v },
  step3: { ...base, w: 1200, h: 840, seed: 47, angle: -0.2, ramp: (u, v) => 0.2 + 0.75 * v + 0.1 * u },
  // deep: dark evergreen with a warm glow rising from one corner
  deep: { ...base, w: 2000, h: 1200, seed: 61, angle: -0.6, noiseAmp: 0.5, ramp: (u, v) => 0.16 + 1.25 * Math.pow(Math.max(0, u * 0.8 + v * 0.7 - 0.5), 1.25),
          stops: [[0,'#05211d'],[0.3,'#083a32'],[0.5,'#0d5a4b'],[0.66,'#2f8a6c'],[0.78,'#d9a94f'],[0.9,'#ee7a24'],[1,'#c84a12']] },
  // cta: green core for white type, orange rising at both edges
  cta: { ...base, w: 2000, h: 1000, seed: 77, angle: -0.42, ramp: (u, v) => 0.1 + 1.9 * Math.pow(Math.abs(u - 0.5), 1.35) + 0.22 * v },
};
(async () => {
  const only = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent('<canvas id="c"></canvas>');
  await p.addScriptTag({ path: path.join(__dirname, 'paint.js') });
  for (const [name, o] of Object.entries(ARTS)) {
    if (only.length && !only.includes(name)) continue;
    const { ramp, ...rest } = o;
    const data = await p.evaluate(({ rest, rampSrc }) => {
      const c = document.getElementById('c');
      window.paint(c, { ...rest, ramp: eval(rampSrc) });
      return c.toDataURL('image/png');
    }, { rest, rampSrc: ramp.toString() });
    fs.writeFileSync(path.join(__dirname, '../../public/art', name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
    console.log('painted', name, o.w + 'x' + o.h);
  }
  await b.close();
})();
