import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPosts, getPostBySlug } from "@/lib/content";

interface Props {
  params: Promise<{ slug: string }>;
}

// Only slugs returned by generateStaticParams exist; anything else is a 404
// at the edge and never reaches the filesystem lookup.
export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllPosts("blog").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug("blog", slug);
  if (!post) return {};
  return {
    title: `${post.frontmatter.title} — Matthew McDowall`,
    description: post.frontmatter.description,
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug("blog", slug);
  if (!post) notFound();

  return (
    <main className="container" style={{ paddingTop: "120px", paddingBottom: "100px", maxWidth: "720px" }}>
      <article>
        <header style={{ marginBottom: "40px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--muted)" }}>
            {new Date(post.frontmatter.date).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" })}
          </span>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(2rem, 4vw, 2.8rem)", lineHeight: 1.1, marginTop: "8px", marginBottom: "12px" }}>
            {post.frontmatter.title}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "1.05rem", lineHeight: 1.5 }}>
            {post.frontmatter.description}
          </p>
        </header>
        <div className="prose" style={{ fontSize: "1.02rem", lineHeight: 1.7 }}>
          <MDXRemote source={post.content} />
        </div>
      </article>
    </main>
  );
}
