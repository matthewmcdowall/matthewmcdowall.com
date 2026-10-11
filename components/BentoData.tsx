"use client";

import { useEffect } from "react";
import type { ClaudeDailyActivity } from "@/lib/data";

function formatTokens(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

interface Props {
  claudeActivity?: ClaudeDailyActivity[];
  claudeTokens?: number;
  claudeDays?: number;
  spotifyShowId?: string;
  spotifyLabel?: string;
}

export default function BentoData({
  claudeActivity,
  claudeTokens,
  claudeDays,
  spotifyShowId,
  spotifyLabel,
}: Props) {
  useEffect(() => {
    // ==========================================
    // CLAUDE HEATMAP
    // ==========================================
    if (claudeActivity && claudeActivity.length > 0) {
      const tokensEl = document.getElementById("claude-tokens");
      const daysEl = document.getElementById("claude-days");
      if (tokensEl && claudeTokens) tokensEl.textContent = formatTokens(claudeTokens);
      if (daysEl && claudeDays) daysEl.textContent = String(claudeDays);

      // Heatmap is coloured by tokens per day (what `/usage` reports). Rows
      // recorded before token tracking began have no tokenCount, so fall back
      // to message counts if there are no token rows at all.
      const msgMap: Record<string, number> = {};
      const tokenMap: Record<string, number> = {};
      claudeActivity.forEach((d) => {
        msgMap[d.date] = d.messageCount;
        tokenMap[d.date] = d.tokenCount ?? 0;
      });
      // Token tracking only began partway through the record (late Jul 2026).
      // Colouring the whole window by tokens left every earlier day blank even
      // though those days have message counts, so two thirds of the heatmap
      // read as "nothing happened". Each day is coloured by whichever metric it
      // has, scaled against that metric's own busiest day — the two are orders
      // of magnitude apart, so they cannot share one scale.

      const now = new Date();
      const dayOfWeek = (now.getDay() + 6) % 7;
      const endOfWeek = new Date(now);
      endOfWeek.setDate(endOfWeek.getDate() + (6 - dayOfWeek));
      const startDate = new Date(endOfWeek);
      startDate.setDate(startDate.getDate() - (23 * 7 - 1));

      const weeks = 23;

      // Scale relative to the busiest day in the visible window so the palette
      // is always fully used, whatever the absolute token volume.
      let tokenMax = 0;
      let msgMax = 0;
      for (let i = 0; i < weeks * 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const ds = d.toISOString().slice(0, 10);
        tokenMax = Math.max(tokenMax, tokenMap[ds] || 0);
        msgMax = Math.max(msgMax, msgMap[ds] || 0);
      }
      const shades = ["#EFECE6", "#F0D3D3", "#E0A3A3", "#C45A5A", "#A32424", "#6E0A0A"];
      const steps = [0.02, 0.08, 0.2, 0.45];
      function shadeFor(ratio: number): string {
        let level = 1;
        for (const step of steps) if (ratio >= step) level++;
        return shades[level];
      }
      function getColor(ds: string): string {
        const t = tokenMap[ds] || 0;
        if (t > 0 && tokenMax > 0) return shadeFor(t / tokenMax);
        const m = msgMap[ds] || 0;
        if (m > 0 && msgMax > 0) return shadeFor(m / msgMax);
        return shades[0];
      }

      const grid = document.getElementById("claude-heatmap-grid");
      if (grid) {
        grid.innerHTML = "";
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = `repeat(${weeks}, 1fr)`;
        grid.style.gridTemplateRows = "repeat(7, 1fr)";
        grid.style.gap = "2px";

        for (let row = 0; row < 7; row++) {
          for (let col = 0; col < weeks; col++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + col * 7 + row);
            const ds = d.toISOString().slice(0, 10);
            const tokens = tokenMap[ds] || 0;
            const msgs = msgMap[ds] || 0;
            const inRange = d <= now;

            const span = document.createElement("span");
            span.style.cssText = `width:100%;aspect-ratio:1;border-radius:0;background:${inRange ? getColor(ds) : "transparent"}`;
            if (inRange && (tokens > 0 || msgs > 0)) {
              span.title = tokens > 0
                ? `${formatTokens(tokens)} tokens · ${msgs} messages on ${ds}`
                : `${msgs} messages on ${ds}`;
            }
            grid.appendChild(span);
          }
        }

        // Month labels sit in the column the month actually starts in. They
        // used to be plain spans in a space-between flex row, so six labels
        // were spread evenly across the width regardless of where those months
        // fell in the grid, and they lined up with nothing. They were also
        // collected from row 0 only, so a month with no Monday in the window
        // was skipped entirely.
        const labelContainer = document.getElementById("claude-month-labels");
        if (labelContainer) {
          labelContainer.innerHTML = "";
          labelContainer.style.display = "grid";
          labelContainer.style.gridTemplateColumns = `repeat(${weeks}, 1fr)`;
          labelContainer.style.gap = "2px";
          // Label the column whose week contains the 1st of a month. That is
          // self-spacing (labels land ~4 columns apart) and it drops the
          // partial month the window opens on, which would otherwise sit one
          // column from the next label and be unreadable.
          for (let col = 0; col < weeks; col++) {
            for (let k = 0; k < 7; k++) {
              const d = new Date(startDate);
              d.setDate(d.getDate() + col * 7 + k);
              if (d > now || d.getDate() !== 1) continue;
              const span = document.createElement("span");
              span.textContent = d.toLocaleString("en", { month: "short" });
              span.style.gridColumn = String(col + 1);
              labelContainer.appendChild(span);
              break;
            }
          }
        }
      }
    }

    // ==========================================
    // SPOTIFY EMBED
    // ==========================================
    if (spotifyShowId) {
      const labelEl = document.getElementById("spotify-label");
      if (labelEl) labelEl.textContent = spotifyLabel || "Currently Listening";
      // Built with DOM APIs rather than an HTML string so nothing is ever
      // parsed as markup; the id is also whitelisted to Spotify's base62 form.
      const embedEl = document.getElementById("spotify-embed");
      if (embedEl && /^[A-Za-z0-9]{1,64}$/.test(spotifyShowId)) {
        const iframe = document.createElement("iframe");
        iframe.src = `https://open.spotify.com/embed/show/${spotifyShowId}?utm_source=generator&theme=0`;
        iframe.title = "Spotify podcast player";
        iframe.width = "100%";
        iframe.height = "152";
        iframe.loading = "lazy";
        iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        iframe.style.border = "0";
        iframe.style.borderRadius = "0";
        embedEl.replaceChildren(iframe);
      }
    }

  }, [claudeActivity, claudeTokens, claudeDays, spotifyShowId, spotifyLabel]);

  return null;
}
