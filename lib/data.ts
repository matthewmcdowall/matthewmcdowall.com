import snapshot from "@/public/data.json";

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

export interface ClaudeDailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
  /** Total tokens (input + output + cache) that day. Absent on rows recorded before tracking began. */
  tokenCount?: number;
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
  claude: ClaudeData | null;
  spotify: SpotifyData;
}

// ==========================================
// Committed snapshot (public/data.json)
// Bundled at build time; the daily sync job commits a fresh one, and the
// resulting deploy is how the Claude numbers reach the site. It also serves
// as the fallback for the live fetches below.
// ==========================================

interface Snapshot {
  lastUpdated?: string;
  claude?: ClaudeData | null;
  github?: GitHubData | null;
  huggingface?: HuggingFaceData | null;
}

const SNAPSHOT = snapshot as unknown as Snapshot;

const REVALIDATE_SECONDS = 3600;

function asCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

// ==========================================
// GitHub — public API, no auth needed
// ==========================================

async function fetchGitHub(): Promise<GitHubData | null> {
  try {
    const res = await fetch("https://api.github.com/users/matthewmcdowall", {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { "User-Agent": "portfolio/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      username: "matthewmcdowall",
      publicRepos: asCount(data.public_repos),
      followers: asCount(data.followers),
      following: asCount(data.following),
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
      { next: { revalidate: REVALIDATE_SECONDS }, headers: { "User-Agent": "portfolio/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      username: "MatthewMcDowall",
      numModels: asCount(data.numModels),
      numDatasets: asCount(data.numDatasets),
      numSpaces: asCount(data.numSpaces),
      numFollowers: asCount(data.numFollowers),
      numFollowing: asCount(data.numFollowing),
      profileUrl: "https://huggingface.co/MatthewMcDowall",
    };
  } catch {
    return null;
  }
}

// ==========================================
// Main fetcher — called from page.tsx
// ==========================================

export async function getPortfolioData(): Promise<PortfolioData> {
  const [github, huggingface] = await Promise.all([fetchGitHub(), fetchHuggingFace()]);

  return {
    github: github ?? SNAPSHOT.github ?? null,
    huggingface: huggingface ?? SNAPSHOT.huggingface ?? null,
    claude: SNAPSHOT.claude ?? null,
    spotify: { showId: "1F1rBp40lgfZfIP5lLZVaK", label: "Currently Listening" },
  };
}
