"use client";

import { useEffect } from "react";

// Imperative DOM behaviours (ported from the original static site): scroll
// reveal, active nav, mobile nav, draggable hero tags, plus the three pieces
// of the ICARUS-style design language that need script:
//   - the hero typed sequence, started on mount
//   - typewriter reveal for anything marked data-type
//   - the ambient footage, HUD trackers and glitches live in Ambient.tsx
export default function ClientBehaviors() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    // ==========================================
    // TYPEWRITER (elements with data-type)
    // ==========================================
    function typewrite(el: HTMLElement, onDone?: () => void) {
      if (el.dataset.typed) return onDone?.();
      el.dataset.typed = "1";
      const full = el.dataset.full ?? (el.textContent || "");
      if (reduceMotion || !full.trim()) return onDone?.();
      // Reserve the final height so the layout doesn't jump while typing.
      if (!el.style.minHeight) el.style.minHeight = el.offsetHeight + "px";
      el.textContent = "";
      const speed = parseInt(el.dataset.typeSpeed || "", 10) || (full.length > 80 ? 16 : 32);
      let i = 0;
      const step = () => {
        i++;
        el.textContent = full.slice(0, i);
        if (i < full.length) later(step, speed);
        else {
          // Finished lines drop their cursor unless asked to keep it.
          if (!("keepCursor" in el.dataset)) el.classList.add("typed-done");
          onDone?.();
        }
      };
      later(step, 140 + parseInt(el.dataset.typeDelay || "0", 10));
    }

    // ==========================================
    // HERO SEQUENCE: the name alone, centred -> statement -> "Got an idea?"
    // with the generated "let's talk" beside it -> hero:done, which is what
    // lets Ambient start the backdrop. Each beat holds, then glitch-cuts.
    // The stage lives on the hero's data-stage; the CSS keys off it.
    // ==========================================
    const NAME_HOLD = 2600; // the name's own fade-up and underline finish ~1.1s in
    const STATEMENT_HOLD = 2600;

    function heroDone() {
      const w = window as Window & { __heroDone?: boolean };
      if (w.__heroDone) return;
      w.__heroDone = true;
      window.dispatchEvent(new Event("hero:done"));
    }

    function runHeroSequence() {
      const hero = document.querySelector<HTMLElement>(".hero[data-stage]");
      const seq = document.getElementById("heroSeq");
      const name = hero?.querySelector<HTMLElement>(".hero-name h1");
      if (!hero || !seq || !name || reduceMotion) return heroDone();
      const slides = Array.from(seq.querySelectorAll<HTMLElement>(".hero-slide"));
      if (slides.length < 2) return heroDone();
      const stage = (s: "name" | "statement" | "ask" | "done") => { hero.dataset.stage = s; };
      const show = (i: number) => {
        slides.forEach((sl, k) => sl.classList.toggle("active", k === i));
        // Blank every line of the incoming slide up front (keeping its height),
        // so later lines don't sit there in full while the first one types.
        slides[i].querySelectorAll<HTMLElement>("[data-type]").forEach((el) => {
          if (el.dataset.full !== undefined) return;
          el.dataset.full = el.textContent || "";
          el.style.minHeight = el.offsetHeight + "px";
          el.textContent = "";
        });
      };
      const typeAll = (slide: HTMLElement, done: () => void) => {
        const els = Array.from(slide.querySelectorAll<HTMLElement>("[data-type]"));
        let i = 0;
        const next = () => {
          if (i >= els.length) return done();
          typewrite(els[i++], next);
        };
        next();
      };
      const cut = (from: HTMLElement, to: number, then: () => void) => {
        const t = from.querySelector<HTMLElement>("[data-type]") || from;
        t.dataset.gt = t.textContent || "";
        t.classList.add("glitching");
        later(() => {
          t.classList.remove("glitching");
          show(to);
          then();
        }, 320);
      };
      // "Got an idea?" typing and the CTA going live finish at different
      // times; the opening is over only when both have.
      let pending = 2;
      const settle = () => {
        if (--pending > 0) return;
        stage("done");
        heroDone();
      };
      const beginStatement = () => {
        stage("statement");
        show(0);
        armCta();
        typeAll(slides[0], () =>
          later(() =>
            cut(slides[0], 1, () => {
              stage("ask");
              runCtaGen(settle); // fires on the same tick as "Got an idea?"
              typeAll(slides[1], settle);
            }), STATEMENT_HOLD)
        );
      };
      stage("name");
      later(() => {
        name.dataset.gt = name.textContent || "";
        name.classList.add("glitching");
        later(() => {
          name.classList.remove("glitching");
          beginStatement();
        }, 320);
      }, NAME_HOLD);
    }

    // ==========================================
    // SCROLL REVEAL
    // ==========================================
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.classList.add("visible");
          if (el.hasAttribute("data-type")) typewrite(el);
          el.querySelectorAll<HTMLElement>("[data-type]").forEach((t) => typewrite(t));
          observer.unobserve(el);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );

    document
      .querySelectorAll(".reveal, .reveal-left")
      .forEach((el) => observer.observe(el));

    // ==========================================
    // ACTIVE NAV LINK
    // ==========================================
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".nav-links a");

    function handleScroll() {
      const scrollY = window.scrollY + 150;
      sections.forEach((section) => {
        const top = (section as HTMLElement).offsetTop;
        const height = (section as HTMLElement).offsetHeight;
        const id = section.getAttribute("id");
        if (scrollY >= top && scrollY < top + height) {
          navLinks.forEach((link) => {
            link.classList.remove("active");
            if (link.getAttribute("href") === `#${id}`)
              link.classList.add("active");
          });
        }
      });
    }

    window.addEventListener("scroll", handleScroll);

    // ==========================================
    // MOBILE NAV TOGGLE
    // ==========================================
    const navToggle = document.getElementById("navToggle");
    function toggleMobileNav() {
      document.getElementById("navLinks")?.classList.toggle("open");
    }
    navToggle?.addEventListener("click", toggleMobileNav);

    const mobileNavLinks = document.querySelectorAll(".nav-links a");
    function closeMobileNav() {
      document.querySelector(".nav-links")?.classList.remove("open");
    }
    mobileNavLinks.forEach((link) => {
      link.addEventListener("click", closeMobileNav);
    });

    if (reduceMotion) {
      document.documentElement.style.scrollBehavior = "auto";
    }

    // ==========================================
    // GENERATED CTA — the "let's talk" button's own code types out on the
    // page, then the button materialises where the code was.
    // ==========================================
    const CTA_CODE = [
      "// cta.tsx — generated",
      'const cta = document.createElement("a");',
      'cta.href = "#contact";',
      'cta.className = "btn btn-primary btn-xl";',
      'cta.textContent = "let\u2019s talk";',
      'cta.dataset.state = "live";',
      "hero.append(cta);",
    ].join("\n");

    function armCta() {
      const gen = document.getElementById("ctaGen");
      if (!gen || reduceMotion) return;
      gen.classList.add("generating");
    }

    function runCtaGen(onLive?: () => void) {
      const gen = document.getElementById("ctaGen");
      const code = document.getElementById("ctaCode");
      if (!gen || !code || reduceMotion) return onLive?.();
      gen.classList.add("generating");
      code.textContent = "";
      // Clock-driven, so the run takes the same ~2.2s whatever the frame rate:
      // each character has a fixed time offset (line breaks pause longer).
      const at: number[] = [];
      let acc = 60;
      for (let k = 0; k < CTA_CODE.length; k++) {
        at.push(acc);
        acc += CTA_CODE[k] === "\n" ? 80 : 8;
      }
      const t0 = performance.now();
      let shown = 0;
      const step = () => {
        const el = performance.now() - t0;
        let n = shown;
        while (n < CTA_CODE.length && at[n] <= el) n++;
        if (n !== shown) {
          shown = n;
          code.textContent = CTA_CODE.slice(0, shown);
        }
        if (shown < CTA_CODE.length) {
          later(step, 16);
          return;
        }
        // compiled: slice-glitch the source, then bring the button to life
        later(() => {
          code.dataset.gt = CTA_CODE;
          code.classList.add("glitching");
        }, 260);
        later(() => {
          code.classList.remove("glitching");
          gen.classList.remove("generating");
          gen.classList.add("live");
          onLive?.();
        }, 700);
      };
      later(step, 16);
    }

    // The hero sequence used to wait for an opening animation to hand over.
    // There is no opening any more — the page is the page — so it starts as
    // soon as the behaviours mount.
    later(runHeroSequence, 120);

    // Cleanup
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      timers.forEach((t) => window.clearTimeout(t));
      navToggle?.removeEventListener("click", toggleMobileNav);
      mobileNavLinks.forEach((link) => {
        link.removeEventListener("click", closeMobileNav);
      });
    };
  }, []);

  return null;
}
