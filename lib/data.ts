import fs from "fs";
import path from "path";

// ==========================================
// Types
// ==========================================

export interface GitHubData {
  username: string;
  publicRepos: number;
  followers: number;
  following: number;
  profileUrl: string;
  contribChartUrl: string;
}

export interface HuggingFaceData {
  username: string;
  numModels: number;
  numDatasets: number;
  numSpaces: number;
  numFollowers: number;
  numFollowing: number;
  profileUrl: string;
}

export interface StravaActivity {
  name: string;
  type: string;
  distance: number;
  movingTime: number;
  date: string;
  elevation: number;
}

export interface StravaData {
  username: string;
  athleteId: string;
  profileUrl: string;
  recentActivities: StravaActivity[];
}

export interface ClaudeDailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

export interface ClaudeData {
  totalMessages: number;
  activeDays: number;
  dailyActivity: ClaudeDailyActivity[];
  totalTokens: number;
}

export interface SpotifyData {
  showId: string;
  label: string;
}

export interface PortfolioData {
  github: GitHubData | null;
  huggingface: HuggingFaceData | null;
  strava: StravaData | null;
  claude: ClaudeData | null;
  spotify: SpotifyData;
}

// ==========================================
// GitHub — public API, no auth needed
// ==========================================

async function fetchGitHub(): Promise<GitHubData | null> {
  try {
    const res = await fetch("https://api.github.com/users/matthewmcdowall", {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "portfolio/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      username: "matthewmcdowall",
      publicRepos: data.public_repos ?? 0,
      followers: data.followers ?? 0,
      following: data.following ?? 0,
      profileUrl: "https://github.com/matthewmcdowall",
      contribChartUrl: "https://ghchart.rshah.org/matthewmcdowall",
    };
  } catch {
    return null;
  }
}

// ==========================================
// HuggingFace — public API, no auth needed
// ==========================================

async function fetchHuggingFace(): Promise<HuggingFaceData | null> {
  try {
    const res = await fetch(
      "https://huggingface.co/api/users/MatthewMcDowall/overview",
      { next: { revalidate: 3600 }, headers: { "User-Agent": "portfolio/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      username: "MatthewMcDowall",
      numModels: data.numModels ?? 0,
      numDatasets: data.numDatasets ?? 0,
      numSpaces: data.numSpaces ?? 0,
      numFollowers: data.numFollowers ?? 0,
      numFollowing: data.numFollowing ?? 0,
      profileUrl: "https://huggingface.co/MatthewMcDowall",
    };
  } catch {
    return null;
  }
}

// ==========================================
// Strava — OAuth refresh token flow
// ==========================================

async function fetchStrava(): Promise<StravaData | null> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  try {
    // Exchange refresh token for access token
    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });
    if (!tokenRes.ok) return null;
    const tokens = await tokenRes.json();

    // Fetch recent activities
    const actRes = await fetch(
      "https://www.strava.com/api/v3/athlete/activities?per_page=5",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        next: { revalidate: 3600 },
      }
    );
    if (!actRes.ok) return null;
    const activities = await actRes.json();

    return {
      username: "matthew mcdowall",
      athleteId: "93790524",
      profileUrl: "https://www.strava.com/athletes/93790524",
      recentActivities: activities.map(
        (a: { name: string; type: string; distance: number; moving_time: number; start_date_local: string; total_elevation_gain: number }) => ({
          name: a.name ?? "",
          type: a.type ?? "Run",
          distance: a.distance ?? 0,
          movingTime: a.moving_time ?? 0,
          date: (a.start_date_local ?? "").slice(0, 10),
          elevation: a.total_elevation_gain ?? 0,
        })
      ),
    };
  } catch {
    return null;
  }
}

// ==========================================
// Claude — read from local data.json
// (updated by sync-claude-stats.py + git push)
// ==========================================

function readClaudeStats(): ClaudeData | null {
  try {
    const dataPath = path.join(process.cwd(), "public", "data.json");
    const raw = fs.readFileSync(dataPath, "utf-8");
    const data = JSON.parse(raw);
    return data.claude ?? null;
  } catch {
    return null;
  }
}

// ==========================================
// Main fetcher — called from page.tsx
// ==========================================

export async function getPortfolioData(): Promise<PortfolioData> {
  const [github, huggingface, strava] = await Promise.all([
    fetchGitHub(),
    fetchHuggingFace(),
    fetchStrava(),
  ]);

  const claude = readClaudeStats();

  // Fallback: if live fetches fail, try data.json for GitHub/HF/Strava too
  let fallbackGitHub = github;
  let fallbackHF = huggingface;
  let fallbackStrava = strava;

  if (!github || !huggingface || !strava) {
    try {
      const dataPath = path.join(process.cwd(), "public", "data.json");
      const raw = fs.readFileSync(dataPath, "utf-8");
      const data = JSON.parse(raw);
      if (!github && data.github) fallbackGitHub = data.github;
      if (!huggingface && data.huggingface) fallbackHF = data.huggingface;
      if (!strava && data.strava) fallbackStrava = data.strava;
    } catch {
      // no fallback
    }
  }

  return {
    github: fallbackGitHub,
    huggingface: fallbackHF,
    strava: fallbackStrava,
    claude,
    spotify: { showId: "1F1rBp40lgfZfIP5lLZVaK", label: "Currently Listening" },
  };
}
