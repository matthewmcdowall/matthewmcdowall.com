"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);
    const body = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      message: String(data.get("message") ?? ""),
      honeypot: String(data.get("company") ?? ""),
    };
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }
      setStatus("sent");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to send");
    }
  }

  if (status === "sent") {
    return (
      <div className="card" style={{ textAlign: "center", padding: "48px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, marginBottom: "12px" }}>Sent.</h2>
        <p style={{ color: "var(--muted)" }}>I&apos;ll reply within a few days.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <Field label="Name" name="name" type="text" required />
      <Field label="Email" name="email" type="email" required />
      <Field label="Message" name="message" type="textarea" required />
      {/* honeypot — hidden from humans, bots fill it */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
        aria-hidden="true"
      />
      {error && (
        <div style={{ color: "#C03030", fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>{error}</div>
      )}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={status === "sending"}
        style={{ alignSelf: "flex-start", opacity: status === "sending" ? 0.6 : 1 }}
      >
        {status === "sending" ? "Sending..." : "Send →"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  required,
}: {
  label: string;
  name: string;
  type: "text" | "email" | "textarea";
  required?: boolean;
}) {
  const sharedStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "0.92rem",
    padding: "12px 16px",
    border: "3px solid var(--border)",
    background: "var(--card-bg)",
    boxShadow: "5px 5px 0 var(--shadow)",
    color: "var(--text)",
    outline: "none",
    width: "100%",
  };
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", fontWeight: 500 }}>
        {label}
        {required && <span style={{ color: "var(--cyan)" }}> *</span>}
      </span>
      {type === "textarea" ? (
        <textarea name={name} required={required} rows={6} style={sharedStyle} />
      ) : (
        <input name={name} type={type} required={required} style={sharedStyle} />
      )}
    </label>
  );
}
