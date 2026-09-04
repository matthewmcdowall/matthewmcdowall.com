import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { getEnv } from "@/lib/env";

// The only dynamic, unauthenticated, write-capable surface on the site.
// Defences, in order: same-origin check (blocks cross-site form abuse),
// body-size cap, per-IP rate limit, honeypot, strict schema, HTML escaping.

const MAX_BODY_BYTES = 16 * 1024;
const NO_LINE_BREAKS = /^[^\r\n]*$/;

const ContactSchema = z.object({
  name: z.string().trim().min(1).max(100).regex(NO_LINE_BREAKS),
  email: z.string().trim().email().max(320),
  message: z.string().trim().min(10).max(5000),
  honeypot: z.string().max(0).optional(),
});

// In-memory, per function instance. Resets on cold start and isn't shared
// across concurrent instances, so treat it as a brake, not a wall. Bounded so
// a flood of distinct IPs can't grow it without limit.
const rateLimitMap = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const MAX_TRACKED_IPS = 1_000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (rateLimitMap.size >= MAX_TRACKED_IPS) {
    for (const [key, hits] of rateLimitMap) {
      if (hits.every((t) => now - t >= WINDOW_MS)) rateLimitMap.delete(key);
    }
    if (rateLimitMap.size >= MAX_TRACKED_IPS) rateLimitMap.clear();
  }
  const hits = (rateLimitMap.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return true;
  hits.push(now);
  rateLimitMap.set(ip, hits);
  return false;
}

// Netlify sets x-nf-client-connection-ip from the TCP connection; prefer it
// over x-forwarded-for, whose first hop a client can forge.
function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-nf-client-connection-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "anon"
  );
}

// Browsers always send Origin on a POST. If it's present it must match the
// host we're being served on (works for prod, deploy previews, and localhost
// without a hardcoded list). Absent Origin = non-browser client; the rate
// limit and honeypot handle those.
function crossSite(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export async function POST(req: NextRequest) {
  if (crossSite(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Honeypot filled in: pretend success, send nothing.
  if (parsed.data.honeypot) {
    return NextResponse.json({ ok: true });
  }

  const { name, email, message } = parsed.data;
  const env = getEnv();
  if (!env.RESEND_API_KEY || !env.CONTACT_TO) {
    console.error("contact: RESEND_API_KEY / CONTACT_TO not configured");
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const resend = new Resend(env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: env.RESEND_FROM ?? "noreply@matthewmcdowall.com",
      to: env.CONTACT_TO,
      replyTo: email,
      subject: `[Portfolio] Message from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
    });
  } catch (err) {
    console.error("contact: Resend send failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Send failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
