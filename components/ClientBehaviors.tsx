"use client";

import { useEffect } from "react";

export default function ClientBehaviors() {
  useEffect(() => {
    // ==========================================
    // SCROLL REVEAL
    // ==========================================
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
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

    // ==========================================
    // MOBILE NAV CLOSE ON LINK CLICK
    // ==========================================
    const mobileNavLinks = document.querySelectorAll(".nav-links a");
    function closeMobileNav() {
      document.querySelector(".nav-links")?.classList.remove("open");
    }
    mobileNavLinks.forEach((link) => {
      link.addEventListener("click", closeMobileNav);
    });

    // ==========================================
    // SMOOTH SCROLL - RESPECT PREFERS-REDUCED-MOTION
    // ==========================================
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.style.scrollBehavior = "auto";
    }

    // ==========================================
    // DRAGGABLE TAGS
    // ==========================================
    document.querySelectorAll(".hero-tag").forEach((tag) => {
      const el = tag as HTMLElement;
      let isDragging = false;
      let startX: number,
        startY: number,
        origLeft: number,
        origTop: number;

      function onPointerDown(e: PointerEvent) {
        isDragging = true;
        el.classList.add("dragging");
        el.style.animation = "none";

        // Get current viewport position and switch to fixed positioning
        const rect = el.getBoundingClientRect();
        origLeft = rect.left;
        origTop = rect.top;
        startX = e.clientX;
        startY = e.clientY;

        el.style.position = "fixed";
        el.style.left = origLeft + "px";
        el.style.top = origTop + "px";
        el.style.right = "auto";
        el.style.transform = "none";
        el.style.margin = "0";

        el.setPointerCapture(e.pointerId);
      }

      function onPointerMove(e: PointerEvent) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        // Clamp to viewport edges
        const newLeft = Math.max(
          0,
          Math.min(window.innerWidth - el.offsetWidth, origLeft + dx)
        );
        const newTop = Math.max(
          0,
          Math.min(window.innerHeight - el.offsetHeight, origTop + dy)
        );
        el.style.left = newLeft + "px";
        el.style.top = newTop + "px";
      }

      function onPointerUp() {
        isDragging = false;
        el.classList.remove("dragging");
      }

      el.addEventListener("pointerdown", onPointerDown);
      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerup", onPointerUp);
    });

    // ==========================================
    // TERMINAL INTRO ANIMATION
    // ==========================================
    (function () {
      const TOTAL_DURATION = 3000;
      const overlay = document.getElementById("terminalOverlay");
      const siteContent = document.getElementById("siteContent");
      const progressBar = document.getElementById("terminalProgress");
      const cursor = document.getElementById("terminalCursor");
      const lines = document.querySelectorAll(".terminal-line");

      if (!overlay || !siteContent || !progressBar || !cursor) return;

      // Animate progress bar
      requestAnimationFrame(() => {
        progressBar.style.transitionDuration = TOTAL_DURATION + "ms";
        progressBar.style.width = "100%";
      });

      // Reveal each line at its data-delay time
      lines.forEach((line) => {
        const delay = parseInt(
          line.getAttribute("data-delay") || "0",
          10
        );
        setTimeout(() => line.classList.add("visible"), delay);
      });

      // Show cursor
      const cursorDelay = parseInt(
        cursor.getAttribute("data-delay") || "0",
        10
      );
      setTimeout(() => cursor.classList.add("visible"), cursorDelay);

      // After total duration, fade out overlay and reveal site
      setTimeout(() => {
        overlay.classList.add("fade-out");
        siteContent.classList.add("visible");

        // Remove overlay from DOM after transition
        setTimeout(() => {
          overlay.classList.add("hidden");
        }, 600);
      }, TOTAL_DURATION);
    })();

    // Cleanup
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      navToggle?.removeEventListener("click", toggleMobileNav);
      mobileNavLinks.forEach((link) => {
        link.removeEventListener("click", closeMobileNav);
      });
    };
  }, []);

  return null;
}
