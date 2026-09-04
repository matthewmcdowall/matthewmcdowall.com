import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type ContentType = "blog" | "projects";

export interface PostFrontmatter {
  title: string;
  description: string;
  date: string;
  tags?: string[];
  cover?: string;
  draft?: boolean;
}

export interface Post {
  slug: string;
  frontmatter: PostFrontmatter;
  content: string;
}

function contentDir(type: ContentType): string {
  return path.join(process.cwd(), "content", type);
}

export function getAllPosts(type: ContentType): Post[] {
  const dir = contentDir(type);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));
  const posts = files.map((file) => {
    const slug = file.replace(/\.(md|mdx)$/, "");
    return getPostBySlug(type, slug);
  });
  return posts
    .filter((p): p is Post => p !== null && !p.frontmatter.draft)
    .sort((a, b) => (a.frontmatter.date < b.frontmatter.date ? 1 : -1));
}

// Slugs come from the URL. Whitelisting the charset (no dots, no slashes)
// means the path below can never leave the content directory.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export function getPostBySlug(type: ContentType, slug: string): Post | null {
  if (!SLUG_PATTERN.test(slug)) return null;
  const dir = contentDir(type);
  const mdPath = path.join(dir, `${slug}.md`);
  const mdxPath = path.join(dir, `${slug}.mdx`);
  const file = fs.existsSync(mdxPath) ? mdxPath : fs.existsSync(mdPath) ? mdPath : null;
  if (!file) return null;

  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = matter(raw);
  return {
    slug,
    frontmatter: data as PostFrontmatter,
    content,
  };
}
