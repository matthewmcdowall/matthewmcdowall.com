import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact — Matthew McDowall",
  description: "Get in touch about AI engineering roles, projects, or collaborations.",
};

export default function ContactPage() {
  return (
    <main className="container" style={{ paddingTop: "120px", paddingBottom: "100px", maxWidth: "640px" }}>
      <h1 className="section-title" style={{ marginBottom: "16px" }}>Contact</h1>
      <p style={{ fontSize: "1rem", color: "var(--muted)", marginBottom: "40px", lineHeight: 1.6 }}>
        Want to chat about a role, project, or AI engineering problem? Send a message — I read every one.
      </p>
      <ContactForm />
    </main>
  );
}
