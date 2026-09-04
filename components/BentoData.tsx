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
      const useTokens = claudeActivity.some((d) => (d.tokenCount ?? 0) > 0);
      const valueMap = useTokens ? tokenMap : msgMap;

      const now = new Date();
      const dayOfWeek = (now.getDay() + 6) % 7;
      const endOfWeek = new Date(now);
      endOfWeek.setDate(endOfWeek.getDate() + (6 - dayOfWeek));
      const startDate = new Date(endOfWeek);
      startDate.setDate(startDate.getDate() - (23 * 7 - 1));

      const weeks = 23;

      // Scale relative to the busiest day in the visible window so the palette
      // is always fully used, whatever the absolute token volume.
      let windowMax = 0;
      for (let i = 0; i < weeks * 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        windowMax = Math.max(windowMax, valueMap[d.toISOString().slice(0, 10)] || 0);
      }
      const shades = ["#E5E0D8", "#E8D5C4", "#D4A574", "#C08040", "#8B5E3C", "#5C3310"];
      const steps = [0.02, 0.08, 0.2, 0.45];
      function getColor(value: number): string {
        if (value <= 0 || windowMax <= 0) return shades[0];
        const ratio = value / windowMax;
        let level = 1;
        for (const step of steps) if (ratio >= step) level++;
        return shades[level];
      }

      const grid = document.getElementById("claude-heatmap-grid");
      if (grid) {
        grid.innerHTML = "";
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = `repeat(${weeks}, 1fr)`;
        grid.style.gridTemplateRows = "repeat(7, 1fr)";
        grid.style.gap = "2px";

        const months: Record<string, boolean> = {};
        for (let row = 0; row < 7; row++) {
          for (let col = 0; col < weeks; col++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + col * 7 + row);
            const ds = d.toISOString().slice(0, 10);
            const value = valueMap[ds] || 0;
            const inRange = d <= now;

            const span = document.createElement("span");
            span.style.cssText = `width:100%;aspect-ratio:1;border-radius:2px;background:${inRange ? getColor(value) : "transparent"}`;
            if (inRange && value > 0) {
              span.title = useTokens
                ? `${formatTokens(value)} tokens · ${msgMap[ds] || 0} messages on ${ds}`
                : `${value} messages on ${ds}`;
            }
            grid.appendChild(span);

            if (row === 0 && inRange) {
              const m = d.toLocaleString("en", { month: "short" });
              if (!months[m]) months[m] = true;
            }
          }
        }

        const labelContainer = document.getElementById("claude-month-labels");
        if (labelContainer) {
          labelContainer.innerHTML = "";
          Object.keys(months).forEach((m) => {
            const span = document.createElement("span");
            span.textContent = m;
            labelContainer.appendChild(span);
          });
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
        iframe.style.borderRadius = "8px";
        embedEl.replaceChildren(iframe);
      }
    }

  }, [claudeActivity, claudeTokens, claudeDays, spotifyShowId, spotifyLabel]);

  return null;
}
