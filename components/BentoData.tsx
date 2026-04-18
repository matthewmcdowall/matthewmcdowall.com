"use client";

import { useEffect } from "react";
import type { ClaudeDailyActivity, StravaActivity } from "@/lib/data";

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
  stravaActivities?: StravaActivity[];
  stravaUsername?: string;
}

export default function BentoData({
  claudeActivity,
  claudeTokens,
  claudeDays,
  spotifyShowId,
  spotifyLabel,
  stravaActivities,
  stravaUsername,
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

      const countMap: Record<string, number> = {};
      claudeActivity.forEach((d) => { countMap[d.date] = d.messageCount; });

      const now = new Date();
      const dayOfWeek = (now.getDay() + 6) % 7;
      const endOfWeek = new Date(now);
      endOfWeek.setDate(endOfWeek.getDate() + (6 - dayOfWeek));
      const startDate = new Date(endOfWeek);
      startDate.setDate(startDate.getDate() - (23 * 7 - 1));

      const weeks = 23;
      const colors: [number, string][] = [
        [0, "#E5E0D8"], [1, "#E8D5C4"], [6, "#D4A574"],
        [21, "#C08040"], [101, "#8B5E3C"], [301, "#5C3310"],
      ];
      function getColor(count: number): string {
        for (let i = colors.length - 1; i >= 0; i--) {
          if (count >= colors[i][0]) return colors[i][1];
        }
        return "#E5E0D8";
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
            const count = countMap[ds] || 0;
            const inRange = d <= now;

            const span = document.createElement("span");
            span.style.cssText = `width:100%;aspect-ratio:1;border-radius:2px;background:${inRange ? getColor(count) : "transparent"}`;
            if (inRange && count > 0) span.title = `${count} messages on ${ds}`;
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
      const embedEl = document.getElementById("spotify-embed");
      if (embedEl) {
        embedEl.innerHTML = `<iframe style="border-radius:8px" src="https://open.spotify.com/embed/show/${spotifyShowId}?utm_source=generator&theme=0" width="100%" height="152" frameBorder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
      }
    }

    // ==========================================
    // STRAVA ACTIVITIES
    // ==========================================
    if (stravaActivities && stravaActivities.length > 0) {
      const usernameEl = document.getElementById("strava-username");
      if (usernameEl) usernameEl.textContent = stravaUsername || "";

      const freqEl = document.getElementById("strava-frequency");
      if (freqEl) {
        freqEl.textContent = String(stravaActivities.length);
        const label = freqEl.nextElementSibling;
        if (label) label.textContent = "Recent Runs";
      }

      const locEl = document.getElementById("strava-location");
      if (locEl) locEl.textContent = `Runner · ${stravaActivities[0].type || "Run"}`;

      const card = document.getElementById("strava-card");
      if (card) {
        const barsDiv = card.querySelector('[data-strava-bars]') as HTMLElement | null;
        const daysDiv = card.querySelector('[data-strava-days]') as HTMLElement | null;
        if (barsDiv && daysDiv) {
          let html = "";
          stravaActivities.forEach((a) => {
            const km = (a.distance / 1000).toFixed(1);
            const mins = Math.round(a.movingTime / 60);
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #F0EBE3;">`;
            html += `<div style="display:flex;flex-direction:column;">`;
            html += `<span style="font-family:var(--font-display);font-weight:600;font-size:0.82rem;">${a.name}</span>`;
            html += `<span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--muted);">${a.date}</span>`;
            html += `</div>`;
            html += `<div style="display:flex;gap:12px;font-family:var(--font-mono);font-size:0.72rem;">`;
            html += `<span style="color:#FC4C02;font-weight:600;">${km} km</span>`;
            html += `<span style="color:var(--muted);">${mins} min</span>`;
            html += `</div>`;
            html += `</div>`;
          });
          barsDiv.outerHTML = html;
          daysDiv.remove();
        }
      }
    }
  }, [claudeActivity, claudeTokens, claudeDays, spotifyShowId, spotifyLabel, stravaActivities, stravaUsername]);

  return null;
}
