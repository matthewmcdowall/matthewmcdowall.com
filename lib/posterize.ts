// Frame posterization + blob detection shared by the ambient layer and the
// intro. Pure functions over pixel buffers, no DOM.
//
// posterizeInto() rewrites an RGBA buffer in place to the site palette —
// paper (transparent), ink, soft ink, oxblood red — and accumulates per-cell
// counts of ink and red pixels on an 8px grid. findBlobs() then runs
// connected components over those cells and returns the bounding boxes the
// HUD tracks.

export interface Detection {
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
  red: boolean;
}

export interface PosterizeOpts {
  inkLum?: number; // below this luminance: solid ink (default 62)
  softLum?: number; // below this: soft ink (default 92)
}

export function posterizeInto(d: Uint8ClampedArray, w: number, h: number, cellInk: Uint16Array, cellRed: Uint16Array, cw: number, opts: PosterizeOpts = {}): void {
  const inkLum = opts.inkLum ?? 62;
  const softLum = opts.softLum ?? 92;
  cellInk.fill(0);
  cellRed.fill(0);
  for (let y = 0; y < h; y++) {
    const crow = (y >> 3) * cw;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const lum = (r * 299 + g * 587 + b * 114) / 1000;
      const redness = r - Math.max(g, b);
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      let a = 0;
      let red = false;
      if (redness > 45 && r > 80) {
        a = Math.max(0.55, Math.min(1, (redness - 30) / 70));
        red = true;
      } else if (sat > 90 && r > g && g > b && lum > 100) {
        a = 0.6; // gold / autumn
        red = true;
      } else if (lum < inkLum) a = 1;
      else if (lum < softLum) a = 0.5;
      if (red) {
        d[i] = 142; d[i + 1] = 14; d[i + 2] = 14;
      } else {
        d[i] = 17; d[i + 1] = 17; d[i + 2] = 17;
      }
      d[i + 3] = a * 255;
      const ci = crow + (x >> 3);
      if (red && a >= 0.55) cellRed[ci]++;
      else if (a >= 0.99) cellInk[ci]++;
    }
  }
}

export function findBlobs(cellInk: Uint16Array, cellRed: Uint16Array, cw: number, ch: number, visited: Uint8Array, minCell = 26, minCells = 5, max = 6): Detection[] {
  // Two passes — red cells first, then ink cells — so a red koi next to a dark
  // one (or its shadow) gets its own box instead of one blob around both.
  // Blobs wider than ~45% of the frame are background (gravel, shadow), not fish.
  visited.fill(0);
  const dets: Detection[] = [];
  const stack: number[] = [];
  const isRed = (k: number) => cellRed[k] >= minCell && cellRed[k] >= cellInk[k];
  const isInk = (k: number) => cellInk[k] >= minCell && cellInk[k] > cellRed[k];
  for (const red of [true, false]) {
    const test = red ? isRed : isInk;
    for (let c = 0; c < cw * ch; c++) {
      if (visited[c] || !test(c)) continue;
      let x0 = cw, y0 = ch, x1 = -1, y1 = -1, n = 0;
      stack.push(c);
      visited[c] = 1;
      while (stack.length) {
        const k = stack.pop() as number;
        const kx = k % cw;
        const ky = (k - kx) / cw;
        n++;
        if (kx < x0) x0 = kx; if (kx > x1) x1 = kx; if (ky < y0) y0 = ky; if (ky > y1) y1 = ky;
        for (const m of [k - 1, k + 1, k - cw, k + cw]) {
          if (m < 0 || m >= cw * ch || visited[m]) continue;
          if (Math.abs((m % cw) - kx) > 1) continue;
          if (!test(m)) continue;
          visited[m] = 1;
          stack.push(m);
        }
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if (n >= minCells && bw <= cw * 0.45 && bh <= ch * 0.55) dets.push({ x: x0 * 8, y: y0 * 8, w: bw * 8, h: bh * 8, area: n, red });
    }
  }
  dets.sort((a, b) => b.area - a.area);
  return dets.slice(0, max);
}
