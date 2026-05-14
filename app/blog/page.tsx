import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Blog — Matthew McDowall",
  description: "Notes on AI engineering, RAG systems, and shipping ML to production.",
};

export default function BlogIndex() {
  const posts = getAllPosts("blog");

  return (
    <main className="container" style={{ paddingTop: "120px", paddingBottom: "100px", maxWidth: "760px" }}>
      <h1 className="section-title" style={{ marginBottom: "16px" }}>Blog</h1>
      <p style={{ color: "var(--muted)", marginBottom: "48px" }}>
        Notes on AI engineering, RAG, and shipping ML to production.
      </p>

      {posts.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No posts yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="card"
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--muted)" }}>
                  {new Date(post.frontmatter.date).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" })}
                </span>
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.4rem" }}>
                  {post.frontmatter.title}
                </h2>
                <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                  {post.frontmatter.description}
                </p>
                {post.frontmatter.tags && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                    {post.frontmatter.tags.map((tag) => (
                      <span key={tag} className="chip">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
