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
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 300, fontSize: "1.8rem", marginBottom: "12px" }} data-type>Sent.</h2>
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
        <div style={{ color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{error}</div>
      )}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={status === "sending"}
        style={{ alignSelf: "flex-start", opacity: status === "sending" ? 0.6 : 1 }}
      >
        {status === "sending" ? "sending_" : "send"}
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
    fontFamily: "var(--font-display)",
    fontWeight: 300,
    fontSize: "0.95rem",
    padding: "12px 14px",
    border: "1px solid var(--hair)",
    background: "var(--card-bg)",
    color: "var(--text)",
    outline: "none",
    width: "100%",
  };
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.08em", color: "var(--red)" }}>
        {label}
        {required && <span className="tri" style={{ marginLeft: "0.5em" }} aria-hidden="true" />}
      </span>
      {type === "textarea" ? (
        <textarea name={name} required={required} rows={6} style={sharedStyle} />
      ) : (
        <input name={name} type={type} required={required} style={sharedStyle} />
      )}
    </label>
  );
}
