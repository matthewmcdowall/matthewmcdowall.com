"use client";

import { useEffect } from "react";
import { posterizeInto, findBlobs, type Detection } from "@/lib/posterize";

// Ambient layer, mounted once in the root layout.
//
// Footage: a short koi clip (public/video/koi.mp4, CC BY-SA, see the footer
// credit) is decoded into a small offscreen buffer every frame and posterized
// to the palette — paper, ink, oxblood — so it reads like a print. The same
// pass builds a coarse occupancy grid; connected blobs of ink/red become
// detections, and a small tracker follows them across frames, so the HUD
// boxes track real fish. If the video can't play (data saver, reduced
// motion, autoplay blocked) a generative koi-and-birds scene takes over.
//
// The processed scene is composited twice: faintly across the viewport on a
// canvas behind the page, sharply inside `.viewfinder` windows on a canvas
// above it. That top canvas is also the HUD: tracking boxes with coordinate
// labels and dashed trails, bracket locks on real page elements, connectors,
// a scanline, a readout, and a logarithmic golden spiral riding the primary
// track; `.viewfinder` windows scattered through the pages are peeks into the
// sharp footage. Every few seconds
// a corruption tears the print open in a jagged rip, sheared strips or pixel
// blocks and the raw full-colour footage shows through for a second; and
// a datamosh burst smears the frame, ghosts it red, solarizes the feed,
// stutters the primary target into stepped echoes, scrambles the HUD text
// and fires an ink scribble; [data-glitch] elements get slice glitches.
//
// Imperative canvas code on purpose, matching the rest of the client layer.

const INK = "#111111";
const RED = "#8E0E0E";
const PAPER = "#FBFBF9";
const MONO = '9px "DM Mono", Menlo, monospace';
const KOI_SEGS = 14;
const GLYPHS = "0123456789+-x_/";
// Blocks the HUD must never sit on top of at full strength: the things a
// visitor is actually reading. Containers rather than every inline node, so the
// per-frame rect maths stays cheap.
// The homepage has no <main> — its wrapper is #siteContent — so both roots are
// listed or the body copy goes unprotected.
const READ_TARGETS =
  ".card, .bento-card, .timeline-item, .blog-card, .contact-card, .skel, .hero-seq, " +
  "#siteContent p, #siteContent li, #siteContent h1, #siteContent h2, #siteContent h3, #siteContent h4, " +
  "main p, main li, main h1, main h2, main h3, main h4";
// How far an effect dims where it fully covers a block of content. It clears
// completely over whatever is in focus — see updateFocus(). The HUD is meant to
// live in the margins, not on the copy.
const CONTENT_FADE = 0.78;

const LOCK_TARGETS =
  ".chip, .fun-chip, .bento-stat, .btn, .timeline-date, .year-badge, .marquee-chip, .bento-username, .quote-attr, .nav-links a.active, .contact-email-btn, .social-link, .statement-line";
const LOCK_WORDS = ["construct", "fractal geometry", "relentless pursuit", "signal", "sacred geometry", "focus", "hold"];

type Vec = { x: number; y: number };

interface Koi {
  kind: "koi";
  x: number;
  y: number;
  a: number;
  v: number;
  turn: number;
  phase: number;
  size: number;
  segs: Vec[];
  red: boolean;
  spots: { i: number; o: number; r: number }[];
}

interface Bird {
  kind: "bird";
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
  red: boolean;
}

type Subject = Koi | Bird;

// A tracked thing on screen (viewport coordinates), from either the blob
// tracker (video) or the generative subjects.
interface Target {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hist: Vec[];
  born: number;
  seen: number;
  misses: number;
  red: boolean;
  subject?: Subject;
}

// A corruption: a tear in the posterized print through which the raw,
// full-colour footage shows. Three shapes; they flicker, mutate and may ride
// along with a tracked fish before snapping shut.
interface Corruption {
  kind: 0 | 1 | 2; // jagged rip | sheared strips | pixel blocks
  x: number;
  y: number;
  w: number;
  h: number;
  born: number;
  ttl: number;
  target: Target | null;
  verts: number[];
  strips: { dy: number; h: number; dx: number }[];
  blocks: boolean[];
  cols: number;
  rows: number;
  id: string;
}

interface Lock {
  el: HTMLElement;
  born: number;
  ttl: number;
  word: string;
}

interface Scribble {
  pts: Vec[];
  born: number;
}

interface VF {
  el: HTMLElement;
  r: DOMRect;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const angleDiff = (target: number, a: number) => Math.atan2(Math.sin(target - a), Math.cos(target - a));
const pad4 = (n: number) => String(Math.max(0, Math.round(n))).padStart(4, "0");

function scramble(s: string): string {
  let out = "";
  for (const c of s) out += c !== " " && Math.random() < 0.22 ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] : c;
  return out;
}

function koiRadius(size: number, t: number): number {
  const rmax = size * 0.075;
  return rmax * (t < 0.22 ? 0.6 + 0.4 * (t / 0.22) : 1 - 0.88 * ((t - 0.22) / 0.78));
}

export default function Ambient() {
  useEffect(() => {
    const bg0 = document.getElementById("ambient-bg") as HTMLCanvasElement | null;
    const hud0 = document.getElementById("ambient-hud") as HTMLCanvasElement | null;
    const video0 = document.getElementById("ambient-video") as HTMLVideoElement | null;
    if (!bg0 || !hud0 || !video0) return;
    const bg: HTMLCanvasElement = bg0;
    const hud: HTMLCanvasElement = hud0;
    const video: HTMLVideoElement = video0;
    const bctx0 = bg.getContext("2d");
    const hctx0 = hud.getContext("2d");
    // The backdrop is knocked down into this and blown straight back up, both
    // nearest-neighbour, so it reads as big flat pixels instead of fine grain.
    // The print is already posterized into flat regions, so point-sampling it
    // gives clean blocks rather than speckle.
    const tiny = document.createElement("canvas");
    const tctx0 = tiny.getContext("2d");
    const scene = document.createElement("canvas");
    const sctx0 = scene.getContext("2d");
    const proc = document.createElement("canvas");
    const pctx0 = proc.getContext("2d", { willReadFrequently: true });
    const raw = document.createElement("canvas");
    const rctx0 = raw.getContext("2d");
    if (!bctx0 || !hctx0 || !sctx0 || !pctx0 || !rctx0 || !tctx0) return;
    const bctx: CanvasRenderingContext2D = bctx0;
    const tctx: CanvasRenderingContext2D = tctx0;
    const hctx: CanvasRenderingContext2D = hctx0;
    const sctx: CanvasRenderingContext2D = sctx0;
    const pctx: CanvasRenderingContext2D = pctx0;
    const rctx: CanvasRenderingContext2D = rctx0;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

    let W = 0;
    let H = 0;
    let sdpr = 1;
    // Backdrop resolution. On a machine that cannot keep up we drop it to half
    // and let the browser scale the canvas back up: the backdrop sits at 14%
    // opacity behind the page, so this is invisible, and it removes the single
    // most expensive blit. One-way, so it cannot oscillate.
    let quality = 1;
    let slowFrames = 0;
    let mobile = false;
    let PW = 480;
    let PH = 270;
    let CW = 60;
    let CH = 34;
    let cellInk = new Uint16Array(CW * CH);
    let cellRed = new Uint16Array(CW * CH);
    let visited = new Uint8Array(CW * CH);
    let subjects: Subject[] = [];
    let vfs: VF[] = [];
    // Content blocks, in *document* space so the per-frame test is arithmetic
    // and never reads layout. Re-measured on resize and occasionally after
    // load, because .reveal elements shift as they animate in.
    let readRects: { el: HTMLElement; top: number; left: number; w: number; h: number; focus: number }[] = [];
    const pointer = { x: -1, y: -1, on: false };
    const targets: Target[] = [];
    const locks: Lock[] = [];
    const scribbles: Scribble[] = [];
    let idCounter = 0;
    let moshFrames = 0;
    let moshLen = 0;
    let nextMosh = performance.now() + rand(10000, 16000);
    let nextLock = 0;
    let nextGlitch = performance.now() + rand(7000, 12000);
    let fps = 60;
    let last = performance.now();
    let lastVideoTime = -1;
    let videoOk = false;
    // When the clip stops advancing — a dropped connection, a dev server
    // restarting under an open tab, an aggressive throttle — processVideo()
    // returns null forever, the scene is never marked dirty and the backdrop
    // freezes with no way back. Track the stall so we can nudge it, then fall
    // back to the generative scene, which always moves.
    let lastAdvance = performance.now();
    let raf = 0;
    let frameNo = 0;
    // Quiet mode: only the footage moves — no boxes, locks, bursts or glitches.
    // On while a [data-ambient="quiet"] element exists (the contact page) or
    // the footer is in the viewport. hudAlpha eases the effects in and out.
    let quiet = false;
    let hudAlpha = 1;
    const corruptions: Corruption[] = [];
    let nextCorrupt = performance.now() + rand(9000, 15000);
    let corruptCounter = 1; // 00 is the standing one above Experience
    const timers: number[] = [];
    const useVideo = !reduceMotion && !saveData;

    // ------------------------------------------------------------------
    // Setup
    // ------------------------------------------------------------------
    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      mobile = W < 768;
      // The print is upscaled from a 480x270 buffer: rendering the canvases at
      // more than 1x buys no detail and costs a full-screen blit every frame.
      sdpr = quality;
      const hdpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const targetsC: [HTMLCanvasElement, CanvasRenderingContext2D, number][] = [
        [scene, sctx, sdpr],
        [bg, bctx, sdpr],
        [hud, hctx, hdpr],
      ];
      for (const [c, ctx, d] of targetsC) {
        c.width = Math.round(W * d);
        c.height = Math.round(H * d);
        c.style.width = W + "px";
        c.style.height = H + "px";
        ctx.setTransform(d, 0, 0, d, 0, 0);
        // nearest-neighbour: cheaper than bilinear, and the blocky edges are the look
        ctx.imageSmoothingEnabled = false;
      }
      // backdrop block size in CSS px — this is the "pixelated" look
      const PXL = mobile ? 4 : 6;
      tiny.width = Math.max(1, Math.round(W / PXL));
      tiny.height = Math.max(1, Math.round(H / PXL));
      tctx.imageSmoothingEnabled = false;

      PW = mobile ? 320 : 480;
      PH = mobile ? 180 : 270;
      proc.width = PW;
      proc.height = PH;
      raw.width = PW;
      raw.height = PH;
      rctx.imageSmoothingEnabled = false;
      CW = PW >> 3;
      CH = Math.ceil(PH / 8);
      cellInk = new Uint16Array(CW * CH);
      cellRed = new Uint16Array(CW * CH);
      visited = new Uint8Array(CW * CH);
    }

    function spawn() {
      subjects = [];
      const nk = mobile ? 4 : 7;
      const nb = mobile ? 12 : 24;
      for (let i = 0; i < nk; i++) {
        const size = rand(85, 135);
        const a = rand(0, Math.PI * 2);
        const x = rand(60, W - 60);
        const y = rand(H * 0.3, H - 60);
        const spacing = size / KOI_SEGS;
        const segs: Vec[] = [];
        for (let j = 0; j < KOI_SEGS; j++) segs.push({ x: x - Math.cos(a) * j * spacing, y: y - Math.sin(a) * j * spacing });
        const spots: Koi["spots"] = [];
        const ns = 1 + Math.floor(rand(0, 3));
        for (let k = 0; k < ns; k++) spots.push({ i: 2 + Math.floor(rand(0, 8)), o: rand(-0.55, 0.55), r: size * rand(0.03, 0.055) });
        subjects.push({ kind: "koi", x, y, a, v: rand(0.45, 0.8), turn: 0, phase: rand(0, 6), size, segs, red: i === 2, spots });
      }
      for (let i = 0; i < nb; i++) {
        const a = rand(0, Math.PI * 2);
        const sp = rand(1, 1.4);
        subjects.push({ kind: "bird", x: rand(30, W - 30), y: rand(100, H * 0.5), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, phase: rand(0, 6), size: rand(5, 9), red: i % 6 === 0 });
      }
    }

    function collectViewfinders() {
      vfs = Array.from(document.querySelectorAll<HTMLElement>(".viewfinder")).map((el) => ({ el, r: el.getBoundingClientRect() }));
    }

    function collectReadRects() {
      const sy = window.scrollY;
      const prev = new Map(readRects.map((rr) => [rr.el, rr.focus] as const));
      readRects = Array.from(document.querySelectorAll<HTMLElement>(READ_TARGETS))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { el, top: r.top + sy, left: r.left, w: r.width, h: r.height, focus: prev.get(el) ?? 0 };
        })
        .filter((rr) => rr.w > 40 && rr.h > 10);
    }

    // A block is in focus while the pointer is on it, or while it sits in the
    // middle band of the screen — where a visitor reads. Eased, so effects
    // retreat and return smoothly rather than popping.
    function updateFocus(scrollY: number) {
      const band = H * 0.36;
      for (const rr of readRects) {
        const top = rr.top - scrollY;
        const bottom = top + rr.h;
        const hovered = pointer.on && pointer.x >= rr.left && pointer.x <= rr.left + rr.w && pointer.y >= top && pointer.y <= bottom;
        const d = Math.abs((top + bottom) / 2 - H / 2);
        const c = clamp(1 - d / band, 0, 1);
        const want = Math.max(hovered ? 1 : 0, c * c * (3 - 2 * c));
        rr.focus += (want - rr.focus) * 0.14;
      }
    }

    /**
     * How far an effect at this rect must fade because of what is under it.
     * `base` is the floor for merely overlapping content; locks pass 0 because
     * they are aimed at page elements on purpose and should only retreat when
     * that element is being read.
     */
    function fadeOver(x: number, y: number, w: number, h: number, base: number, scrollY: number): number {
      if (w <= 0 || h <= 0 || !readRects.length) return 1;
      const area = w * h;
      // Accumulated, not the worst single block: an effect straddling two
      // paragraphs is over content twice, and taking the minimum let it sit
      // there at 60% opacity. Nested blocks (a <p> inside a .card) double-count
      // on purpose — that is the densest reading surface on the page.
      let hit = 0;
      for (const rr of readRects) {
        const ox = Math.min(x + w, rr.left + rr.w) - Math.max(x, rr.left);
        if (ox <= 0) continue;
        const top = rr.top - scrollY;
        const oy = Math.min(y + h, top + rr.h) - Math.max(y, top);
        if (oy <= 0) continue;
        hit += ((ox * oy) / area) * (base + (1 - base) * rr.focus);
        if (hit >= 1) return 0;
      }
      return 1 - hit;
    }

    function vfVisible(vf: VF): boolean {
      const r = vf.r;
      if (r.width < 20 || r.bottom < 0 || r.top > H) return false;
      const wrap = vf.el.closest(".reveal, .reveal-left");
      return !wrap || wrap.classList.contains("visible");
    }

    function nearestVF(p: Vec): DOMRect | null {
      let best: DOMRect | null = null;
      let bd = Infinity;
      for (const vf of vfs) {
        if (!vfVisible(vf)) continue;
        const d = Math.hypot(vf.r.left + vf.r.width / 2 - p.x, vf.r.top + vf.r.height / 2 - p.y);
        if (d < bd) {
          bd = d;
          best = vf.r;
        }
      }
      return best;
    }

    // ------------------------------------------------------------------
    // Footage A: the koi clip, posterized + blob detection
    // ------------------------------------------------------------------
    function processVideo(): Detection[] | null {
      if (!videoOk || video.readyState < 2) return null;
      if (video.currentTime === lastVideoTime) return null; // no new frame: nothing to redo
      lastVideoTime = video.currentTime;
      rctx.drawImage(video, 0, 0, PW, PH); // the only video decode this frame
      pctx.drawImage(raw, 0, 0);
      const img = pctx.getImageData(0, 0, PW, PH);
      posterizeInto(img.data, PW, PH, cellInk, cellRed, CW);
      pctx.putImageData(img, 0, 0);
      return findBlobs(cellInk, cellRed, CW, CH, visited);
    }

    // Clipping a full-screen drawImage still pays for the whole blit. These draw
    // just the slice that lands in the destination rect.
    function drawCoverRect(ctx: CanvasRenderingContext2D, img: CanvasImageSource, iw: number, ih: number, dx: number, dy: number, dw: number, dh: number) {
      if (!iw || !ih || dw <= 0 || dh <= 0) return;
      const { scale, ox, oy } = coverTransform();
      const fw = PW * scale, fh = PH * scale;
      const sx = clamp(((dx - ox) / fw) * iw, 0, iw - 1);
      const sy = clamp(((dy - oy) / fh) * ih, 0, ih - 1);
      const sw = clamp((dw / fw) * iw, 1, iw - sx);
      const sh = clamp((dh / fh) * ih, 1, ih - sy);
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    function drawSceneRect(ctx: CanvasRenderingContext2D, dx: number, dy: number, dw: number, dh: number) {
      if (dw <= 0 || dh <= 0) return;
      ctx.drawImage(scene, dx * sdpr, dy * sdpr, dw * sdpr, dh * sdpr, dx, dy, dw, dh);
    }

    function coverTransform() {
      const scale = Math.max(W / PW, H / PH);
      return { scale, ox: (W - PW * scale) / 2, oy: (H - PH * scale) / 2 };
    }

    function updateTracks(dets: Detection[], now: number) {
      const { scale, ox, oy } = coverTransform();
      for (const t of targets) t.misses++;
      for (const dt of dets) {
        const cx = ox + (dt.x + dt.w / 2) * scale;
        const cy = oy + (dt.y + dt.h / 2) * scale;
        const w = dt.w * scale;
        const h = dt.h * scale;
        let best: Target | null = null;
        let bd = 90;
        for (const t of targets) {
          if (t.misses === 0) continue;
          const d = Math.hypot(t.x - cx, t.y - cy);
          if (d < bd) {
            bd = d;
            best = t;
          }
        }
        if (best) {
          best.x += (cx - best.x) * 0.24;
          best.y += (cy - best.y) * 0.24;
          best.w += (w - best.w) * 0.18;
          best.h += (h - best.h) * 0.18;
          best.seen++;
          best.misses = 0;
          best.red = dt.red;
        } else if (targets.length < 6) {
          targets.push({ id: `trk_${String(idCounter++ % 100).padStart(2, "0")}`, x: cx, y: cy, w, h, hist: [], born: now, seen: 1, misses: 0, red: dt.red });
        }
      }
      for (let i = targets.length - 1; i >= 0; i--) if (targets[i].misses > 25) targets.splice(i, 1);
    }

    // ------------------------------------------------------------------
    // Footage B: generative koi + birds (fallback)
    // ------------------------------------------------------------------
    function updateKoi(k: Koi, dt: number) {
      k.turn += (Math.random() - 0.5) * 0.012 * dt;
      k.turn *= 0.95;
      const home = nearestVF(k);
      if (home) {
        const cx = home.left + home.width / 2;
        const cy = home.top + home.height / 2;
        if (Math.hypot(cx - k.x, cy - k.y) > Math.min(home.width, home.height) * 0.28) k.turn += angleDiff(Math.atan2(cy - k.y, cx - k.x), k.a) * 0.014 * dt;
      }
      const m = 60;
      if (k.x < m || k.x > W - m || k.y < 90 || k.y > H - m) k.turn += angleDiff(Math.atan2(H / 2 - k.y, W / 2 - k.x), k.a) * 0.02 * dt;
      k.turn = clamp(k.turn, -0.05, 0.05);
      k.a += k.turn * dt;
      k.x += Math.cos(k.a) * k.v * dt;
      k.y += Math.sin(k.a) * k.v * dt;
      k.phase += 0.09 * dt * (k.v / 0.6);
      const spacing = k.size / KOI_SEGS;
      k.segs[0].x = k.x;
      k.segs[0].y = k.y;
      for (let j = 1; j < KOI_SEGS; j++) {
        const p = k.segs[j - 1];
        const q = k.segs[j];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        q.x = p.x + (dx / d) * spacing;
        q.y = p.y + (dy / d) * spacing;
      }
    }

    function updateBird(b: Bird, dt: number, birds: Bird[]) {
      let ax = 0, ay = 0, n = 0, avx = 0, avy = 0, cx = 0, cy = 0;
      for (const o of birds) {
        if (o === b) continue;
        const dx = o.x - b.x;
        const dy = o.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d > 60) continue;
        n++; avx += o.vx; avy += o.vy; cx += o.x; cy += o.y;
        if (d < 16 && d > 0) { ax -= (dx / d) * 0.08; ay -= (dy / d) * 0.08; }
      }
      if (n) {
        ax += (avx / n - b.vx) * 0.05 + (cx / n - b.x) * 0.0025;
        ay += (avy / n - b.vy) * 0.05 + (cy / n - b.y) * 0.0025;
      }
      const home = nearestVF(b);
      if (home) {
        const hx = home.left + home.width / 2;
        const hy = home.top + home.height / 2;
        if (Math.hypot(hx - b.x, hy - b.y) > home.width * 0.3) { ax += (hx - b.x) * 0.0016; ay += (hy - b.y) * 0.0016; }
      }
      if (b.y < 90) ay += 0.05;
      if (b.y > H * 0.62) ay -= 0.05;
      if (b.x < 30) ax += 0.05;
      if (b.x > W - 30) ax -= 0.05;
      b.vx += ax * dt;
      b.vy += ay * dt;
      const sp = Math.hypot(b.vx, b.vy) || 1;
      const tgt = clamp(sp, 0.9, 1.7);
      b.vx = (b.vx / sp) * tgt;
      b.vy = (b.vy / sp) * tgt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.phase += 0.28 * dt;
    }

    function stepGenerative(dt: number, now: number) {
      const birds = subjects.filter((s): s is Bird => s.kind === "bird");
      for (const s of subjects) {
        if (s.kind === "koi") updateKoi(s, dt);
        else updateBird(s, dt, birds);
      }
      // Mirror a few subjects as targets so the HUD has something to track.
      const maxT = mobile ? 2 : 3;
      for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        if (!t.subject || now - t.born > 9000) { targets.splice(i, 1); continue; }
        const s = t.subject;
        if (s.kind === "koi") {
          let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
          for (const p of s.segs) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
          t.x = (x0 + x1) / 2; t.y = (y0 + y1) / 2; t.w += (x1 - x0 + 18 - t.w) * 0.2; t.h += (y1 - y0 + 18 - t.h) * 0.2;
        } else {
          t.x = s.x; t.y = s.y; t.w = 26; t.h = 20;
        }
        t.seen++;
        t.misses = 0;
      }
      if (targets.length < maxT && frameNo % 90 === 0) {
        const tracked = new Set(targets.map((t) => t.subject));
        const free = subjects.filter((s) => !tracked.has(s));
        const inside = free.filter((s) => vfs.some((vf) => vfVisible(vf) && s.x > vf.r.left && s.x < vf.r.right && s.y > vf.r.top && s.y < vf.r.bottom));
        const pool = inside.length ? inside : free;
        if (pool.length) {
          const s = pool[Math.floor(Math.random() * pool.length)];
          targets.push({ id: `trk_${String(idCounter++ % 100).padStart(2, "0")}`, x: s.x, y: s.y, w: 40, h: 30, hist: [], born: now, seen: 0, misses: 0, red: s.red, subject: s });
        }
      }
    }

    function drawKoi(ctx: CanvasRenderingContext2D, k: Koi, color?: string) {
      const n = KOI_SEGS;
      const fill = color ?? (k.red ? RED : INK);
      const L: Vec[] = [], R: Vec[] = [];
      const C: { x: number; y: number; nx: number; ny: number; tx: number; ty: number }[] = [];
      for (let j = 0; j < n; j++) {
        const p = k.segs[j];
        const prev = k.segs[Math.max(0, j - 1)];
        const next = k.segs[Math.min(n - 1, j + 1)];
        let tx = prev.x - next.x, ty = prev.y - next.y;
        const d = Math.hypot(tx, ty) || 1;
        tx /= d; ty /= d;
        const nx = -ty, ny = tx;
        const t = j / (n - 1);
        const wig = Math.sin(k.phase - j * 0.5) * k.size * 0.035 * t;
        const cx = p.x + nx * wig, cy = p.y + ny * wig;
        const r = koiRadius(k.size, t);
        L.push({ x: cx + nx * r, y: cy + ny * r });
        R.push({ x: cx - nx * r, y: cy - ny * r });
        C.push({ x: cx, y: cy, nx, ny, tx, ty });
      }
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(L[0].x, L[0].y);
      for (let j = 1; j < n; j++) ctx.lineTo(L[j].x, L[j].y);
      for (let j = n - 1; j >= 0; j--) ctx.lineTo(R[j].x, R[j].y);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(C[0].x, C[0].y, koiRadius(k.size, 0) * 0.95, 0, Math.PI * 2);
      ctx.fill();
      const c = C[n - 1];
      const len = k.size * 0.17;
      const rt = koiRadius(k.size, 1);
      ctx.globalAlpha *= 0.6;
      ctx.beginPath();
      ctx.moveTo(c.x + c.nx * rt, c.y + c.ny * rt);
      ctx.lineTo(c.x - c.tx * len + c.nx * k.size * 0.08, c.y - c.ty * len + c.ny * k.size * 0.08);
      ctx.lineTo(c.x - c.tx * len * 0.45, c.y - c.ty * len * 0.45);
      ctx.lineTo(c.x - c.tx * len - c.nx * k.size * 0.08, c.y - c.ty * len - c.ny * k.size * 0.08);
      ctx.lineTo(c.x - c.nx * rt, c.y - c.ny * rt);
      ctx.closePath();
      ctx.fill();
      const f = C[3];
      const rf = koiRadius(k.size, 3 / (n - 1)) + k.size * 0.035;
      const ang = Math.atan2(f.ty, f.tx);
      for (const side of [1, -1]) {
        ctx.beginPath();
        ctx.ellipse(f.x + f.nx * rf * side, f.y + f.ny * rf * side, k.size * 0.075, k.size * 0.028, ang + 0.75 * side + Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha /= 0.6;
      if (!color && !k.red) {
        ctx.save();
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = RED;
        for (const s of k.spots) {
          const sc = C[s.i];
          const r = koiRadius(k.size, s.i / (n - 1));
          ctx.beginPath();
          ctx.arc(sc.x + sc.nx * s.o * r, sc.y + sc.ny * s.o * r, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    function drawBird(ctx: CanvasRenderingContext2D, b: Bird, color?: string) {
      const h = Math.atan2(b.vy, b.vx);
      const flap = Math.sin(b.phase);
      const len = b.size * (0.75 + 0.25 * flap);
      ctx.strokeStyle = color ?? (b.red ? RED : INK);
      ctx.lineWidth = 1.3;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (const side of [1, -1]) {
        const a = h + side * (Math.PI / 2 + 0.3);
        const mx = b.x + Math.cos(a) * len * 0.55 + Math.cos(h) * b.size * 0.15 * flap;
        const my = b.y + Math.sin(a) * len * 0.55 + Math.sin(h) * b.size * 0.15 * flap;
        ctx.moveTo(b.x, b.y);
        ctx.quadraticCurveTo(mx, my, b.x + Math.cos(a + side * 0.35) * len, b.y + Math.sin(a + side * 0.35) * len);
      }
      ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawGenerative(ctx: CanvasRenderingContext2D, color?: string, ox = 0) {
      ctx.save();
      ctx.translate(ox, 0);
      for (const s of subjects) {
        if (s.kind === "koi") drawKoi(ctx, s, color);
        else drawBird(ctx, s, color);
      }
      ctx.restore();
    }

    // ------------------------------------------------------------------
    // Scene assembly (+ datamosh)
    // ------------------------------------------------------------------
    function drawFootage(ctx: CanvasRenderingContext2D, red: boolean, ox: number) {
      if (videoOk) {
        const { scale, ox: cx, oy } = coverTransform();
        if (red) {
          // red ghost: the posterized frame tinted through source-atop
          ctx.save();
          ctx.translate(ox, 0);
          ctx.drawImage(proc, cx, oy, PW * scale, PH * scale);
          ctx.globalCompositeOperation = "source-atop";
          ctx.fillStyle = RED;
          ctx.fillRect(cx + ox, oy, PW * scale, PH * scale);
          ctx.restore();
        } else {
          ctx.drawImage(proc, cx + ox, oy, PW * scale, PH * scale);
        }
      } else {
        drawGenerative(ctx, red ? RED : undefined, ox);
      }
    }

    function renderScene() {
      const moshing = moshFrames > 0;
      if (moshing) {
        moshFrames--;
        sctx.globalCompositeOperation = "destination-out";
        sctx.fillStyle = "rgba(0,0,0,0.32)";
        sctx.fillRect(0, 0, W, H);
        sctx.globalCompositeOperation = "source-over";
        sctx.globalAlpha = 0.5;
        drawFootage(sctx, true, rand(-10, 10));
        sctx.globalAlpha = 1;
      } else {
        sctx.clearRect(0, 0, W, H);
      }
      drawFootage(sctx, false, 0);
      if (moshing) {
        const n = 3 + Math.floor(rand(0, 6));
        for (let i = 0; i < n; i++) {
          const sx = rand(0, W - 100), sy = rand(80, H - 40), w = rand(60, 320), h = rand(6, 60);
          sctx.drawImage(scene, sx * sdpr, sy * sdpr, w * sdpr, h * sdpr, sx + rand(-70, 70), sy + rand(-10, 10), w, h);
        }
      }
    }

    function scheduleMosh(now: number) {
      if (now < nextMosh) return;
      if (quiet) {
        nextMosh = now + 1500;
        return;
      }
      moshLen = 14 + Math.floor(rand(0, 10));
      moshFrames = moshLen;
      nextMosh = now + rand(14000, 24000);
      triggerGlitch(now, true);
      fireScribble(now);
      if (Math.random() < 0.5) spawnCorruption(now);
    }

    function compositeBackground() {
      bctx.clearRect(0, 0, W, H);
      tctx.clearRect(0, 0, tiny.width, tiny.height);
      tctx.drawImage(scene, 0, 0, tiny.width, tiny.height);
      bctx.globalAlpha = 0.34;
      bctx.drawImage(tiny, 0, 0, W, H);
      bctx.globalAlpha = 1;
      bctx.globalCompositeOperation = "destination-out";
      const g = bctx.createLinearGradient(0, 0, 0, 150);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      bctx.fillStyle = g;
      bctx.fillRect(0, 0, W, 150);
      bctx.globalCompositeOperation = "source-over";
    }

    // ------------------------------------------------------------------
    // Geometry
    // ------------------------------------------------------------------
    function fireScribble(now: number) {
      const anchor = targets.find((t) => t.seen >= 3) || null;
      const lk = locks[Math.floor(Math.random() * locks.length)];
      let x = rand(W * 0.2, W * 0.8), y = rand(H * 0.25, H * 0.75);
      if (anchor && Math.random() < 0.6) { x = anchor.x; y = anchor.y; }
      else if (lk) { const r = lk.el.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
      const pts: Vec[] = [];
      let vx = rand(-4, 4), vy = rand(-4, 4);
      for (let i = 0; i < 90; i++) {
        vx += rand(-3.5, 3.5); vy += rand(-3.5, 3.5);
        vx *= 0.93; vy *= 0.93;
        x += vx * 3; y += vy * 3;
        pts.push({ x, y });
      }
      scribbles.push({ pts, born: now });
    }

    // ------------------------------------------------------------------
    // Corruptions
    // ------------------------------------------------------------------
    function spawnCorruption(now: number, force?: { kind: 0 | 1 | 2; x: number; y: number }) {
      if (quiet || (corruptions.length >= 1 && !force)) return;
      const live = targets.filter((t) => t.seen >= 3);
      const target = !force && live.length && Math.random() < 0.5 ? live[Math.floor(Math.random() * live.length)] : null;
      const w = rand(90, mobile ? 200 : 280);
      const h = rand(56, mobile ? 150 : 210);
      const x = force ? force.x : target ? target.x : rand(60 + w / 2, W - 60 - w / 2);
      const y = force ? force.y : target ? target.y : rand(100 + h / 2, H - 60 - h / 2);
      const kind = force ? force.kind : (Math.floor(rand(0, 3)) as 0 | 1 | 2);
      const verts = Array.from({ length: 10 + Math.floor(rand(0, 5)) }, () => rand(0.45, 1));
      const strips: Corruption["strips"] = [];
      let dy = 0;
      while (dy < h) {
        const sh = rand(4, Math.max(6, h / 4));
        strips.push({ dy, h: sh, dx: rand(-18, 18) });
        dy += sh + rand(0, 8);
      }
      const cols = 3 + Math.floor(rand(0, 4));
      const rows = 2 + Math.floor(rand(0, 3));
      const blocks = Array.from({ length: cols * rows }, () => Math.random() < 0.6);
      corruptions.push({ kind, x, y, w, h, born: now, ttl: rand(700, 1900), target, verts, strips, blocks, cols, rows, id: String(corruptCounter++ % 100).padStart(2, "0") });
    }

    function corruptionPath(c: Corruption) {
      hctx.beginPath();
      const x0 = c.x - c.w / 2;
      const y0 = c.y - c.h / 2;
      if (c.kind === 0) {
        const n = c.verts.length;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          const px = c.x + Math.cos(a) * (c.w / 2) * c.verts[k];
          const py = c.y + Math.sin(a) * (c.h / 2) * c.verts[k];
          if (k) hctx.lineTo(px, py);
          else hctx.moveTo(px, py);
        }
        hctx.closePath();
      } else if (c.kind === 1) {
        for (const st of c.strips) hctx.rect(x0 + st.dx, y0 + st.dy, c.w, st.h);
      } else {
        const bw = c.w / c.cols;
        const bh = c.h / c.rows;
        c.blocks.forEach((on, k) => {
          if (on) hctx.rect(x0 + (k % c.cols) * bw, y0 + Math.floor(k / c.cols) * bh, bw + 0.5, bh + 0.5);
        });
      }
    }

    function drawCorruption(c: Corruption, now: number, scrollY: number, cover: { scale: number; ox: number; oy: number }, mutate: boolean) {
      if (mutate) {
        const k = Math.floor(Math.random() * c.verts.length);
        c.verts[k] = clamp(c.verts[k] + rand(-0.14, 0.14), 0.35, 1);
        if (c.strips.length) c.strips[Math.floor(Math.random() * c.strips.length)].dx = rand(-22, 22);
        const b = Math.floor(Math.random() * c.blocks.length);
        c.blocks[b] = !c.blocks[b];
      }
      // A tear opening over a paragraph is the loudest thing on the page, so
      // it dims over content and disappears over whatever is being read.
      const cf = fadeOver(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, CONTENT_FADE, scrollY);
      if (cf < 0.03) return;
      hctx.save();
      corruptionPath(c);
      hctx.clip();
      hctx.globalAlpha = cf;
      // the tear's own bounds, padded for strips that shear sideways
      const tx = clamp(c.x - c.w / 2 - 32, 0, W), ty = clamp(c.y - c.h / 2 - 12, 0, H);
      const tw = clamp(c.w + 64, 1, W - tx), th = clamp(c.h + 24, 1, H - ty);
      if (videoOk) {
        // the raw frame, full colour: the print failing and the world showing through
        drawCoverRect(hctx, raw, PW, PH, tx, ty, tw, th);
      } else {
        drawSceneRect(hctx, tx, ty, tw, th);
      }
      // a tear line across it
      hctx.globalAlpha = cf * 0.5;
      hctx.fillStyle = Math.random() < 0.5 ? RED : PAPER;
      hctx.fillRect(c.x - c.w, c.y - c.h / 2 + rand(0, c.h), c.w * 2, rand(1, 3));
      hctx.restore();
      hctx.globalAlpha = cf * 0.75;
      hctx.strokeStyle = RED;
      hctx.lineWidth = 1;
      corruptionPath(c);
      hctx.stroke();
      hctx.globalAlpha = cf;
      label(`err_${c.id}  x:${pad4(c.x)} y:${pad4(c.y + scrollY)}`, c.x - c.w / 2, c.y - c.h / 2 - 5, true, "left", true);
    }

    // A standing corruption that never settles, anchored above the Experience
    // heading ([data-corrupt-anchor]), flickering between block and strip forms.
    const corner: Corruption = {
      kind: 2, x: 0, y: 0, w: 150, h: 60, born: 0, ttl: Infinity, target: null,
      verts: Array.from({ length: 12 }, () => rand(0.5, 1)),
      strips: [], blocks: Array.from({ length: 18 }, () => Math.random() < 0.5), cols: 6, rows: 3, id: "00",
    };
    let cornerFlip = performance.now() + rand(2000, 4000);
    function reshuffleCorner(now: number) {
      corner.kind = corner.kind === 2 ? 1 : 2;
      corner.blocks = corner.blocks.map(() => Math.random() < 0.5);
      corner.strips = [];
      let dy = 0;
      while (dy < corner.h) {
        const sh = rand(4, 12);
        corner.strips.push({ dy, h: sh, dx: rand(-12, 12) });
        dy += sh + rand(0, 6);
      }
      cornerFlip = now + rand(2000, 4500);
    }

    function renderCorruptions(now: number, scrollY: number) {
      const cover = coverTransform();
      const navH = document.querySelector("nav") ? 56 : 0;
      for (let i = corruptions.length - 1; i >= 0; i--) {
        const c = corruptions[i];
        const age = now - c.born;
        if (age > c.ttl || quiet) {
          corruptions.splice(i, 1);
          continue;
        }
        if (c.target) {
          c.x += (c.target.x - c.x) * 0.3;
          c.y += (c.target.y - c.y) * 0.3;
        }
        if (Math.random() < 0.08) continue; // dropped frame: flicker
        const mutate = frameNo % 3 === 0;
        if (mutate && Math.random() < 0.15) {
          c.x += rand(-14, 14);
          c.y += rand(-8, 8);
        }
        drawCorruption(c, now, scrollY, cover, mutate);
      }
      // The standing corruption is anchored to the page, not the viewport: it
      // sits in the top-right of the Experience section, above the heading,
      // and scrolls with it.
      const host = document.querySelector<HTMLElement>("[data-corrupt-anchor]");
      if (!quiet && host) {
        const r = host.getBoundingClientRect();
        corner.w = mobile ? 110 : 150;
        corner.h = mobile ? 44 : 60;
        corner.x = r.right - corner.w / 2;
        corner.y = r.top + corner.h / 2;
        if (corner.y + corner.h / 2 > navH + 4 && corner.y - corner.h / 2 < H) {
          if (now >= cornerFlip) reshuffleCorner(now);
          if (Math.random() >= 0.06) drawCorruption(corner, now, scrollY, cover, frameNo % 4 === 0);
        }
      }
    }

    // ------------------------------------------------------------------
    // HUD
    // ------------------------------------------------------------------
    function corners(x: number, y: number, w: number, h: number, len: number, lw: number) {
      hctx.lineWidth = lw;
      hctx.beginPath();
      hctx.moveTo(x, y + len); hctx.lineTo(x, y); hctx.lineTo(x + len, y);
      hctx.moveTo(x + w - len, y); hctx.lineTo(x + w, y); hctx.lineTo(x + w, y + len);
      hctx.moveTo(x + w, y + h - len); hctx.lineTo(x + w, y + h); hctx.lineTo(x + w - len, y + h);
      hctx.moveTo(x + len, y + h); hctx.lineTo(x, y + h); hctx.lineTo(x, y + h - len);
      hctx.stroke();
    }

    // Small solid triangle: the mark's glyph, used as crosshair and prefix.
    function tri(x: number, y: number, r: number) {
      hctx.fillStyle = RED;
      hctx.beginPath();
      hctx.moveTo(x, y - r);
      hctx.lineTo(x + r * 0.95, y + r * 0.8);
      hctx.lineTo(x - r * 0.95, y + r * 0.8);
      hctx.closePath();
      hctx.fill();
    }

    function label(text: string, x: number, y: number, moshing: boolean, align: CanvasTextAlign = "left", marker = false) {
      const t = moshing ? scramble(text) : text;
      const yy = Math.max(68, y);
      hctx.font = MONO;
      hctx.textBaseline = "alphabetic";
      const w = hctx.measureText(t).width + (marker ? 10 : 0);
      const x0 = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
      hctx.fillStyle = "rgba(251,251,249,0.85)";
      hctx.fillRect(x0 - 2, yy - 9, w + 4, 11);
      if (marker) tri(x0 + 3.5, yy - 3.5, 3.2);
      hctx.fillStyle = RED;
      hctx.textAlign = "left";
      hctx.fillText(t, x0 + (marker ? 10 : 0), yy);
    }

    function pickLock(now: number) {
      if (locks.length >= (mobile ? 1 : 2)) return;
      const held = new Set(locks.map((l) => l.el));
      const cands = Array.from(document.querySelectorAll<HTMLElement>(LOCK_TARGETS)).filter((el) => {
        if (held.has(el)) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.top > 60 && r.bottom < H - 20;
      });
      if (!cands.length) return;
      const el = cands[Math.floor(Math.random() * cands.length)];
      const word = Math.random() < 0.5 ? LOCK_WORDS[Math.floor(Math.random() * LOCK_WORDS.length)] : `obj_${String(idCounter++ % 100).padStart(2, "0")}`;
      locks.push({ el, born: now, ttl: rand(3000, 6500), word });
    }

    function renderHUD(now: number, scrollY: number) {
      const moshing = moshFrames > 0;
      const solarize = moshing && moshFrames > moshLen - 3;
      const navH = document.querySelector("nav") ? 56 : 0;
      hctx.clearRect(0, 0, W, H);

      // Feed windows: a look into the real pond — the raw, full-colour frame
      // (the posterized print flashes through for two frames at a burst).
      for (const vf of vfs) {
        if (!vfVisible(vf)) continue;
        const r = vf.r;
        hctx.save();
        hctx.beginPath();
        hctx.rect(r.left + 1, r.top + 1, r.width - 2, r.height - 2);
        hctx.clip();
        if (videoOk && !solarize) {
          hctx.globalAlpha = 1;
          drawCoverRect(hctx, raw, PW, PH, r.left, r.top, r.width, r.height);
        } else if (solarize) {
          hctx.fillStyle = INK;
          hctx.fillRect(r.left, r.top, r.width, r.height);
          hctx.globalCompositeOperation = "destination-out";
          drawSceneRect(hctx, r.left, r.top, r.width, r.height);
          hctx.globalCompositeOperation = "source-over";
        } else {
          hctx.globalAlpha = 0.92;
          drawSceneRect(hctx, r.left, r.top, r.width, r.height);
        }
        hctx.restore();
        if (r.top < navH + 4) continue; // slid under the fixed nav: no labels
        label(vf.el.dataset.label || "feed", r.left + 10, r.top + 17, moshing);
        if (Math.floor(now / 700) % 2 === 0) {
          hctx.fillStyle = RED;
          hctx.fillRect(r.right - 16, r.top + 10, 6, 6);
        }
        label(`${Math.round(r.width)}x${Math.round(r.height)}  y:${pad4(r.top + scrollY)}`, r.right - 10, r.bottom - 8, moshing, "right");
      }

      renderCorruptions(now, scrollY);

      // Targets (everything from here fades with hudAlpha)
      if (hudAlpha < 0.01) return;
      const cap = mobile ? 140 : 220;
      // One box, the largest: it is the one actually sitting on a fish, and a
      // second box chasing a smaller blob just read as clutter.
      const live = targets.filter((t) => t.seen >= 8).sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 1);
      live.forEach((t, i) => {
        t.hist.push({ x: t.x, y: t.y });
        if (t.hist.length > 22) t.hist.shift();
        const age = now - t.born;
        const bw = Math.min(t.w, cap), bh = Math.min(t.h, cap);
        const bx = t.x - bw / 2, by = t.y - bh / 2;
        // a box drifting across a paragraph is the most distracting thing the
        // HUD does, so it dims over content and clears over what is being read
        const ha = hudAlpha * fadeOver(bx - 6, by - 16, bw + 12, bh + 22, CONTENT_FADE, scrollY);
        if (ha < 0.02) return;
        const alpha = Math.min(1, age / 250) * (t.misses > 12 ? 1 - (t.misses - 12) / 14 : 1);
        hctx.strokeStyle = RED;
        hctx.setLineDash([]);
        hctx.lineWidth = 1;
        hctx.globalAlpha = ha * alpha * 0.3;
        hctx.beginPath();
        t.hist.forEach((p, k) => (k ? hctx.lineTo(p.x, p.y) : hctx.moveTo(p.x, p.y)));
        hctx.stroke();
        hctx.globalAlpha = ha * alpha * 0.85;
        hctx.strokeRect(bx, by, bw, bh);
        corners(bx - 2, by - 2, bw + 4, bh + 4, 6, 1.5);
        tri(t.x, t.y, 3.5);
        label(`${t.id}${t.red ? " r" : ""}  x:${pad4(t.x)} y:${pad4(t.y + scrollY)}`, bx, by - 5, moshing);
        // stepped echoes of the primary target during a burst
        if (moshing && i === 0 && bw > 8 && bh > 8) {
          for (let k = 1; k <= 3; k++) {
            hctx.globalAlpha = ha * (0.55 - k * 0.15);
            hctx.drawImage(scene, bx * sdpr, by * sdpr, bw * sdpr, bh * sdpr, bx + k * (bw * 0.55), by, bw, bh);
          }
        }
        hctx.globalAlpha = hudAlpha * 1;
      });

      // Element locks
      for (let i = locks.length - 1; i >= 0; i--) {
        const l = locks[i];
        const r = l.el.getBoundingClientRect();
        const age = now - l.born;
        if (age > l.ttl || !r.width || r.bottom < 0 || r.top > H) { locks.splice(i, 1); continue; }
        const grow = age < 300 ? (1 - age / 300) * 14 : 0;
        // a lock is aimed at this element deliberately, so it only fades when
        // the element is the one being read
        const lf = fadeOver(r.left - 6, r.top - 12, r.width + 12, r.height + 18, 0, scrollY);
        if (lf < 0.02) continue;
        const alpha = Math.min(1, age / 200) * (l.ttl - age < 400 ? (l.ttl - age) / 400 : 1) * lf;
        hctx.globalAlpha = hudAlpha * alpha;
        hctx.strokeStyle = RED;
        corners(r.left - 4 - grow, r.top - 4 - grow, r.width + 8 + grow * 2, r.height + 8 + grow * 2, 7, 1.5);
        label(l.word, r.left - 4, r.top - 9 - grow, moshing, "left", true);
        hctx.globalAlpha = hudAlpha * 1;
      }

      // Ink scribbles
      for (let i = scribbles.length - 1; i >= 0; i--) {
        const s = scribbles[i];
        const age = now - s.born;
        if (age > 900) { scribbles.splice(i, 1); continue; }
        const n = Math.min(s.pts.length, Math.floor((age / 900) * s.pts.length * 2.2));
        const sf = fadeOver(s.pts[0].x - 40, s.pts[0].y - 40, 80, 80, 0, scrollY);
        hctx.globalAlpha = hudAlpha * sf * 0.85 * (1 - age / 900);
        hctx.strokeStyle = INK;
        hctx.lineWidth = 1.2;
        hctx.lineJoin = "round";
        hctx.beginPath();
        for (let k = 0; k < n; k++) {
          if (k) hctx.lineTo(s.pts[k].x, s.pts[k].y);
          else hctx.moveTo(s.pts[k].x, s.pts[k].y);
        }
        hctx.stroke();
        hctx.globalAlpha = hudAlpha * 1;
      }

      // Scanline
      const sy = ((now % 16000) / 16000) * H;
      hctx.fillStyle = RED;
      hctx.globalAlpha = hudAlpha * 0.14;
      hctx.fillRect(0, sy, W, 1);
      hctx.globalAlpha = hudAlpha * 0.5;
      hctx.fillRect(0, sy, 22, 1);
      hctx.globalAlpha = hudAlpha * 1;

      // Readout
      if (!mobile) {
        const time = new Date().toTimeString().slice(0, 8);
        hctx.globalAlpha = hudAlpha * 0.75;
        label(`${videoOk ? "feed" : "synth"}  trk:${live.length}  y:${pad4(scrollY)}  ${String(Math.round(fps)).padStart(2, "0")}fps  ${time}${moshing ? "  ▮" : ""}`, W - 16, H - 14, moshing, "right", true);
        hctx.globalAlpha = hudAlpha * 1;
      }
    }

    // ------------------------------------------------------------------
    // Text glitch on [data-glitch]
    // ------------------------------------------------------------------
    function triggerGlitch(now: number, force = false) {
      if (!force && now < nextGlitch) return;
      nextGlitch = now + rand(10000, 18000);
      const els = Array.from(document.querySelectorAll<HTMLElement>("[data-glitch]")).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.bottom > 0 && r.top < H && !el.classList.contains("glitching");
      });
      if (!els.length) return;
      const el = els[Math.floor(Math.random() * els.length)];
      if (el.dataset.glitch === "soft") {
        const steps = ["3px 0 var(--red)", "-3px 0 var(--red)", "2px 0 var(--red), -2px 0 var(--text)", "-1px 0 var(--red)", ""];
        steps.forEach((s, i) => timers.push(window.setTimeout(() => (el.style.textShadow = s), i * 70)));
        return;
      }
      el.dataset.gt = el.textContent || "";
      el.classList.add("glitching");
      timers.push(window.setTimeout(() => el.classList.remove("glitching"), 440));
    }

    // ------------------------------------------------------------------
    // Loop
    // ------------------------------------------------------------------
    function frame(now: number) {
      frameNo++;
      const frameMs = now - last;
      const dt = clamp(frameMs / 16.67, 0.2, 2);
      fps = fps * 0.95 + (1000 / Math.max(1, frameMs)) * 0.05;
      last = now;
      if (quality > 0.4 && frameNo > 30) {
        // a run of sub-24fps frames means this machine cannot afford the
        // full-resolution backdrop; step it down rather than grind
        slowFrames = frameMs > 42 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
        if (slowFrames > 40) {
          quality = quality === 1 ? 0.5 : 0.35;
          slowFrames = 0;
          resize();
          (window as Window & { __ambientQuality?: number }).__ambientQuality = quality;
        }
      }
      const scrollY = window.scrollY;
      for (const vf of vfs) vf.r = vf.el.getBoundingClientRect();
      // Content rects are in document space, so scrolling costs nothing. Only
      // re-measure occasionally, for .reveal blocks settling into place.
      if (frameNo % 90 === 0) collectReadRects();
      updateFocus(scrollY);

      if (useVideo && !videoOk && video.readyState >= 3 && !video.paused) videoOk = true;
      let sceneDirty = false;
      if (videoOk) {
        const dets = processVideo(); // null when the clip has not advanced
        if (dets) {
          sceneDirty = true;
          lastAdvance = now;
          if (dets.length) updateTracks(dets, now);
          else for (const t of targets) t.misses++;
        } else {
          const stalled = now - lastAdvance;
          // a paused clip is normal between decoded frames; a stall is not
          if (stalled > 1500 && stalled < 5000) {
            if (video.paused) video.play().catch(() => {});
          } else if (stalled >= 5000) {
            videoOk = false; // give up on the clip and let the drawn scene take over
            lastAdvance = now;
          }
        }
      } else {
        stepGenerative(dt, now);
        sceneDirty = true;
        // if the clip comes back, hand the backdrop to it again
        if (useVideo && video.readyState >= 3 && video.currentTime !== lastVideoTime) {
          videoOk = true;
          lastAdvance = now;
        }
      }
      for (let i = targets.length - 1; i >= 0; i--) if (targets[i].misses > 25) targets.splice(i, 1);

      if (frameNo % 6 === 0) {
        const footer = document.querySelector(".footer");
        // [data-ambient="quiet"] stands the HUD down for a whole page (contact);
        // [data-ambient="calm"] does it only while that section is on screen —
        // About runs from its heading through the tech marquees, and floating
        // blocks drifting over that much copy read as noise.
        const calm = Array.from(document.querySelectorAll('[data-ambient="calm"]')).some((el) => {
          const r = el.getBoundingClientRect();
          return Math.min(r.bottom, H) - Math.max(r.top, 0) > H * 0.18;
        });
        quiet = calm || !!document.querySelector('[data-ambient="quiet"]') || (!!footer && footer.getBoundingClientRect().top < H);
      }
      hudAlpha += ((quiet ? 0 : 1) - hudAlpha) * 0.18;
      if (quiet) moshFrames = 0;

      scheduleMosh(now);
      if (moshFrames > 0) sceneDirty = true; // a burst animates every frame
      if (sceneDirty) {
        renderScene();
        compositeBackground();
      }
      if (!quiet && now >= nextLock) { pickLock(now); nextLock = now + rand(4500, 8000); }
      if (!quiet && now >= nextCorrupt) { spawnCorruption(now); nextCorrupt = now + rand(12000, 20000); }
      renderHUD(now, scrollY);
      if (!quiet) triggerGlitch(now);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function staticFrame() {
      sctx.clearRect(0, 0, W, H);
      drawGenerative(sctx);
      compositeBackground();
      hctx.clearRect(0, 0, W, H);
      for (const vf of vfs) {
        const r = vf.r;
        if (r.width < 20) continue;
        hctx.save();
        hctx.beginPath();
        hctx.rect(r.left + 1, r.top + 1, r.width - 2, r.height - 2);
        hctx.clip();
        hctx.globalAlpha = 0.92;
        hctx.drawImage(scene, 0, 0, W, H);
        hctx.restore();
        label(vf.el.dataset.label || "feed", r.left + 10, r.top + 17, false);
      }
    }

    function onResize() {
      resize();
      spawn();
      collectViewfinders();
      collectReadRects();
      if (reduceMotion) staticFrame();
    }

    // Set once the backdrop has been allowed to run (see go() below).
    let live = false;

    function onVisibility() {
      if (reduceMotion || !live) return;
      if (document.hidden) { cancelAnimationFrame(raf); video.pause(); }
      else { start(); if (useVideo) video.play().catch(() => {}); }
    }

    function tryPlay() {
      video.play().then(() => { videoOk = video.readyState >= 2; }).catch(() => { videoOk = false; });
    }

    resize();
    spawn();
    collectViewfinders();
    collectReadRects();
    // dev hook: window.__corrupt(kind, x, y) forces a tear (used by the screenshot rig)
    (window as Window & { __corrupt?: (k: 0 | 1 | 2, x: number, y: number) => void }).__corrupt = (k, x, y) => spawnCorruption(performance.now(), { kind: k, x, y });
    // dev hook: window.__fadeAt(x, y, w, h) reports how far an effect at that
    // rect would fade for sitting on content (1 = untouched, 0 = gone)
    (window as Window & { __fadeAt?: (x: number, y: number, w: number, h: number) => number }).__fadeAt = (x, y, w, h) =>
      fadeOver(x, y, w, h, CONTENT_FADE, window.scrollY);
    timers.push(window.setTimeout(collectViewfinders, 500));
    timers.push(window.setTimeout(collectViewfinders, 2000));
    timers.push(window.setTimeout(collectReadRects, 600));
    timers.push(window.setTimeout(collectReadRects, 2200));
    const onPointerMove = (e: PointerEvent) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true; };
    const onPointerLeave = () => { pointer.on = false; };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    if (reduceMotion) {
      staticFrame();
      const onScroll = () => { for (const vf of vfs) vf.r = vf.el.getBoundingClientRect(); staticFrame(); };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", onScroll);
        document.removeEventListener("visibilitychange", onVisibility);
        timers.forEach((t) => window.clearTimeout(t));
      };
    }

    if (useVideo) {
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.playbackRate = 0.6;
      video.src = "/video/koi.mp4";
    }

    // Nothing moves behind the homepage hero until its opening has finished
    // (ClientBehaviors fires hero:done); the canvases then fade in. Pages
    // without the hero, and a return to it once done, start straight away.
    const root = document.documentElement;
    const w = window as Window & { __heroDone?: boolean };
    const go = () => {
      if (live) return;
      live = true;
      root.classList.remove("ambient-waiting");
      if (useVideo) {
        tryPlay();
        // Autoplay can be blocked until the first interaction; retry once then.
        window.addEventListener("pointerdown", tryPlay, { once: true });
        window.addEventListener("keydown", tryPlay, { once: true });
      }
      start();
    };
    if (document.querySelector(".hero[data-stage]") && !w.__heroDone) {
      root.classList.add("ambient-waiting");
      window.addEventListener("hero:done", go, { once: true });
    } else {
      go();
    }

    return () => {
      cancelAnimationFrame(raf);
      video.pause();
      window.removeEventListener("hero:done", go);
      root.classList.remove("ambient-waiting");
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("keydown", tryPlay);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <>
      <canvas id="ambient-bg" className="ambient-bg" aria-hidden="true" />
      <canvas id="ambient-hud" className="ambient-hud" aria-hidden="true" />
      <video id="ambient-video" className="ambient-video" preload="auto" muted playsInline loop aria-hidden="true" tabIndex={-1} />
    </>
  );
}
