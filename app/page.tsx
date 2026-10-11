import type { Metadata } from "next";
import ClientBehaviors from "@/components/ClientBehaviors";
import Pyramid from "@/components/Pyramid";
import BentoData from "@/components/BentoData";
import { getPortfolioData } from "@/lib/data";
import { siteJsonLd } from "@/lib/site";
import Link from "next/link";
import { getAllPosts } from "@/lib/content";

// ISR: prerendered, then regenerated in the background at most hourly.
// Nothing here uses request-time APIs, so the page is served from the CDN
// and the live-stat fetches in lib/data.ts run once per hour, not per visitor.
export const revalidate = 3600;

// Netlify also serves the site on its *.netlify.app subdomain; the canonical
// keeps search engines pointed at the real domain.
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const data = await getPortfolioData();
  const posts = getAllPosts("blog").slice(0, 3);
  return (
    <>
      {/* schema.org Person + WebSite for search engines (see lib/site.ts). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd).replace(/</g, "\\u003c") }}
      />
      <div id="siteContent">

        {/* ======================================
            NAVIGATION
            ====================================== */}
        <nav>
          <a href="#" className="nav-logo"><Pyramid className="mark-nav" />matt.dev</a>
          <button
            className="nav-toggle"
            id="navToggle"
          >
            menu
          </button>
          <ul className="nav-links" id="navLinks">
            <li><a href="#about">About</a></li>
            <li><a href="#experience">Experience</a></li>
            <li><a href="#education">Education</a></li>
            <li><a href="#blog">Blog</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>

        {/* ======================================
            HERO
            ====================================== */}
        {/* Opening order (ClientBehaviors): the name alone, centred -> it cuts
            away -> the statement types -> "Got an idea?" and the generated
            "let's talk" together -> only then does the ambient backdrop start. */}
        <section className="hero" data-stage="name">
          <div className="container">
            <div className="section-num">01</div>
            <div className="hero-name">
              <h1 data-glitch="soft">Hi, I&apos;m <span className="underline-cyan">Matthew McDowall</span></h1>
            </div>
            <div className="hero-grid">
              <div className="hero-left">
                {/* Typed sequence: statement -> "Got an idea?" (ClientBehaviors) */}
                <div className="hero-seq" id="heroSeq">
                  <div className="hero-slide hero-slide-statement active">
                    <p className="statement-line" data-type data-type-speed="34">I build real AI products</p>
                    <p className="statement-line" data-type data-type-speed="34">that get shipped to production</p>
                    <p className="statement-line statement-red" data-type data-type-speed="40">not just demos</p>
                  </div>
                  <div className="hero-slide hero-slide-ask">
                    <p className="hero-ask" data-type data-type-speed="60" data-keep-cursor data-glitch>Got an idea?</p>
                  </div>
                </div>
              </div>
              <div className="hero-right">
                {/* "let's talk" is generated live: its code types out, then it comes to life (ClientBehaviors). */}
                <div className="cta-gen" id="ctaGen">
                  <pre className="cta-code frame" id="ctaCode" aria-hidden="true"></pre>
                  <div className="cta-wrap">
                    <div className="cta-lock frame" aria-hidden="true"></div>
                    <a href="#contact" className="btn btn-primary btn-xl cta-live" id="ctaLive">let&apos;s talk</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================
            ABOUT
            ====================================== */}
        {/* The HUD stands down while this is on screen (Ambient.tsx reads
            data-ambient="calm"): the About copy and the tech marquees are for
            reading, and floating blocks over them were distracting. */}
        <section id="about" data-ambient="calm">
          <div className="container">
            <div className="section-num">02</div>
            <div className="about-grid">
              {/* Left: the record */}
              <div className="reveal-left">
                <h2 className="section-title" data-type data-glitch>About</h2>
                <dl className="about-record">
                  <div>
                    <dt>who</dt>
                    <dd data-type>Matthew McDowall — applied AI engineer.</dd>
                  </div>
                  <div>
                    <dt>what</dt>
                    <dd data-type data-type-delay="700">Custom, domain-specific, end-to-end AI systems that ship to production. Not demos.</dd>
                  </div>
                  <div>
                    <dt>where</dt>
                    <dd data-type data-type-delay="1700">Currently Applied AI &amp; Automation Engineer Lead @ North Light AI</dd>
                  </div>
                  <div>
                    <dt>degree</dt>
                    <dd data-type data-type-delay="2600">B.S. in Data Analytics &amp; Data Science, University of New Hampshire, class of 2026.</dd>
                  </div>
                </dl>

                <div className="fun-facts">
                  <div className="fun-chip">Shipped a product to NASA</div>
                  <div className="fun-chip">Intern {"→"} engineering lead</div>
                  <div className="fun-chip">RAG &amp; agentic systems builder</div>
                </div>
              </div>

              {/* Right: feed window (the ambient footage renders inside it) */}
              <div className="reveal">
                <div className="viewfinder viewfinder-about" data-label="feed_01 — live" aria-hidden="true"></div>
              </div>
            </div>

            {/* Bento Grid — full width, outside the about-grid */}
            <div className="bento-grid" id="bento-grid">

              {/* Claude */}
              <div className="bento-card">
                <div className="bento-card-header">
                  <div className="bento-card-icon claude">
                    <svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/></svg>
                  </div>
                  <span className="bento-username">Claude Code</span>
                </div>
                <div className="bento-stats-row" style={{ gap: "20px" }}>
                  <div style={{ border: "1px solid var(--hair)", borderRadius: 0, padding: "8px 14px", flex: 1 }}>
                    <span className="bento-label">Tokens</span>
                    <span className="bento-stat" style={{ fontSize: "1.2rem" }} id="claude-tokens">--</span>
                  </div>
                  <div style={{ border: "1px solid var(--hair)", borderRadius: 0, padding: "8px 14px", flex: 1 }}>
                    <span className="bento-label">Days</span>
                    <span className="bento-stat" style={{ fontSize: "1.2rem" }} id="claude-days">--</span>
                  </div>
                </div>
                <div className="claude-heatmap" style={{ marginTop: "14px" }}>
                  <div id="claude-month-labels" style={{ display: "grid", marginBottom: "6px", fontFamily: "var(--font-mono)", fontSize: "0.55rem", color: "var(--red)", letterSpacing: "0.08em", padding: "0 2px" }}></div>
                  <div id="claude-heatmap-grid"></div>
                </div>
                <div style={{ marginTop: "10px" }}>
                  <span style={{ display: "inline-block", fontFamily: "var(--font-mono)", fontSize: "0.7rem", padding: "4px 12px", background: "var(--red)", color: "#fff", borderRadius: 0, letterSpacing: "0.05em" }}>#Claude</span>
                </div>
              </div>

              {/* GitHub */}
              <a href="https://github.com/matthewmcdowall" target="_blank" rel="noopener" className="bento-card" id="github-card">
                <div className="bento-card-header">
                  <div className="bento-card-icon github">
                    <svg viewBox="0 0 24 24" fill="white"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                  </div>
                  <span className="bento-username">@matthewmcdowall</span>
                </div>
                <div className="bento-stats-row" style={{ gap: "20px" }}>
                  <div style={{ border: "1px solid var(--hair)", borderRadius: 0, padding: "8px 14px", flex: 1 }}>
                    <span className="bento-label">Repos</span>
                    <span className="bento-stat" style={{ fontSize: "1.2rem" }} id="github-repos">{data.github?.publicRepos ?? "--"}</span>
                  </div>
                  <div style={{ border: "1px solid var(--hair)", borderRadius: 0, padding: "8px 14px", flex: 1 }}>
                    <span className="bento-label">Followers</span>
                    <span className="bento-stat" style={{ fontSize: "1.2rem" }} id="github-followers">{data.github?.followers ?? "--"}</span>
                  </div>
                </div>
                <div className="bento-contrib-graph">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://ghchart.rshah.org/8E0E0E/matthewmcdowall" alt="GitHub Contributions" />
                </div>
                <div style={{ marginTop: "10px" }}>
                  <span style={{ display: "inline-block", fontFamily: "var(--font-mono)", fontSize: "0.7rem", padding: "4px 12px", background: "var(--red)", color: "#fff", borderRadius: 0, letterSpacing: "0.05em" }}>#OpenSource</span>
                </div>
              </a>

            </div>

            {/* Tech I work with — the marquee, straight under the stats */}
            <div className="about-marquees">
              {/* Row 1: Languages & Frameworks */}
              <div className="marquee-wrap" style={{ marginBottom: "12px" }}>
                <div className="marquee-track">
                  <span className="marquee-chip">Python</span>
                  <span className="marquee-chip">TypeScript</span>
                  <span className="marquee-chip">JavaScript</span>
                  <span className="marquee-chip">SQL</span>
                  <span className="marquee-chip">PyTorch</span>
                  <span className="marquee-chip">Transformers</span>
                  <span className="marquee-chip">Hugging Face</span>
                  <span className="marquee-chip">LangChain</span>
                  <span className="marquee-chip">LangGraph</span>
                  <span className="marquee-chip">Pandas</span>
                  <span className="marquee-chip">Spark</span>
                  <span className="marquee-chip">FastAPI</span>
                  <span className="marquee-chip">React.js</span>
                  {/* Duplicate for seamless loop */}
                  <span className="marquee-chip">Python</span>
                  <span className="marquee-chip">TypeScript</span>
                  <span className="marquee-chip">JavaScript</span>
                  <span className="marquee-chip">SQL</span>
                  <span className="marquee-chip">PyTorch</span>
                  <span className="marquee-chip">Transformers</span>
                  <span className="marquee-chip">Hugging Face</span>
                  <span className="marquee-chip">LangChain</span>
                  <span className="marquee-chip">LangGraph</span>
                  <span className="marquee-chip">Pandas</span>
                  <span className="marquee-chip">Spark</span>
                  <span className="marquee-chip">FastAPI</span>
                  <span className="marquee-chip">React.js</span>
                </div>
              </div>

              {/* Row 2: LLM & RAG (reverse) */}
              <div className="marquee-wrap" style={{ marginBottom: "12px" }}>
                <div className="marquee-track marquee-reverse">
                  <span className="marquee-chip">Agentic Systems</span>
                  <span className="marquee-chip">Claude</span>
                  <span className="marquee-chip">Llama</span>
                  <span className="marquee-chip">Qwen</span>
                  <span className="marquee-chip">LoRA / QLoRA</span>
                  <span className="marquee-chip">Hybrid Vector + BM25</span>
                  <span className="marquee-chip">Semantic Chunking</span>
                  <span className="marquee-chip">RAG Pipelines</span>
                  <span className="marquee-chip">Ollama</span>
                  <span className="marquee-chip">ChromaDB</span>
                  <span className="marquee-chip">pgvector</span>
                  <span className="marquee-chip">Docling</span>
                  {/* Duplicate */}
                  <span className="marquee-chip">Agentic Systems</span>
                  <span className="marquee-chip">Claude</span>
                  <span className="marquee-chip">Llama</span>
                  <span className="marquee-chip">Qwen</span>
                  <span className="marquee-chip">LoRA / QLoRA</span>
                  <span className="marquee-chip">Hybrid Vector + BM25</span>
                  <span className="marquee-chip">Semantic Chunking</span>
                  <span className="marquee-chip">RAG Pipelines</span>
                  <span className="marquee-chip">Ollama</span>
                  <span className="marquee-chip">ChromaDB</span>
                  <span className="marquee-chip">pgvector</span>
                  <span className="marquee-chip">Docling</span>
                </div>
              </div>

              {/* Row 3: Infrastructure & Data */}
              <div className="marquee-wrap">
                <div className="marquee-track" style={{ animationDuration: "40s" }}>
                  <span className="marquee-chip">PostgreSQL</span>
                  <span className="marquee-chip">AWS Bedrock</span>
                  <span className="marquee-chip">AWS Lambda</span>
                  <span className="marquee-chip">Google Cloud</span>
                  <span className="marquee-chip">Git</span>
                  <span className="marquee-chip">CI/CD</span>
                  <span className="marquee-chip">REST APIs</span>
                  <span className="marquee-chip">NLP</span>
                  <span className="marquee-chip">Reinforcement Learning</span>
                  <span className="marquee-chip">Machine Learning</span>
                  <span className="marquee-chip">Information Retrieval</span>
                  {/* Duplicate */}
                  <span className="marquee-chip">PostgreSQL</span>
                  <span className="marquee-chip">AWS Bedrock</span>
                  <span className="marquee-chip">AWS Lambda</span>
                  <span className="marquee-chip">Google Cloud</span>
                  <span className="marquee-chip">Git</span>
                  <span className="marquee-chip">CI/CD</span>
                  <span className="marquee-chip">REST APIs</span>
                  <span className="marquee-chip">NLP</span>
                  <span className="marquee-chip">Reinforcement Learning</span>
                  <span className="marquee-chip">Machine Learning</span>
                  <span className="marquee-chip">Information Retrieval</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================
            EXPERIENCE
            ====================================== */}
        <section id="experience">
          <div className="container">
            <div className="section-num">03</div>
            <div className="corrupt-anchor" data-corrupt-anchor aria-hidden="true"></div>
            <div className="reveal">
              <h2 className="section-title" data-type data-glitch>Experience</h2>
            </div>

            <div className="timeline stagger">

              <div className="timeline-item card reveal">
                <div className="timeline-date">Dec 2024 — Present</div>
                <h3>Applied AI &amp; Automation Engineer Lead</h3>
                <div className="timeline-company">
                  North Light AI — Durham, NH <span className="badge">Current</span>
                </div>
                <p className="timeline-summary">Intern (Dec 2024) {"→"} part-time engineer (Sep 2025) {"→"} full-time engineering lead (May 2026), owning the design and production rollout of North Light AI&apos;s core products and managing interns.</p>
                <div className="timeline-products">
                  <div className="timeline-product">
                    <div className="product-label">product</div>
                    <h4>Prime Ready — NHADC</h4>
                    <p>Agentic LLM matchmaking platform that pairs small-to-medium suppliers with Prime contractors through natural-language search, cutting 6+ weeks of manual discovery to minutes. Concept to production in 2 months with a 4-person team; now reaching 200+ SMBs and a NASA deployment. Tuning the hybrid retrieval stack raised hit rate@5 from 74% to 92%.</p>
                    <div className="project-tags">
                      <span className="chip">Python</span>
                      <span className="chip">LangGraph</span>
                      <span className="chip">AWS Bedrock</span>
                      <span className="chip">pgvector</span>
                      <span className="chip">PostgreSQL</span>
                    </div>
                  </div>
                  <div className="timeline-product">
                    <div className="product-label">product</div>
                    <h4>Lesson Desk — North Light AI</h4>
                    <p>AI-powered teaching platform that automates lesson planning and content creation so educators get their time back. Leading development from architecture through production: rolled out to a small group of K-12 teachers, in partnership with the University of New Hampshire, with a rich in-browser editor and export to the formats teachers actually use.</p>
                    <div className="project-tags">
                      <span className="chip">Next.js</span>
                      <span className="chip">React</span>
                      <span className="chip">TypeScript</span>
                      <span className="chip">Firebase</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="timeline-item card reveal">
                <div className="timeline-date">Sep 2025 — May 2026</div>
                <h3>AI-Driven NMS Chatbot</h3>
                <div className="timeline-company">
                  SubCom
                </div>
                <ul>
                  <li>Locally hosted assistant for SubCom&apos;s subsea cable Network Management System, fully air-gapped with zero external API calls</li>
                  <li>Parses proprietary NMS documentation with Docling, embeds it into ChromaDB, and answers natural-language questions grounded in the source docs</li>
                  <li>94% retrieval accuracy (P@10, NDCG@5) at sub-second latency on VRAM-constrained VMs</li>
                </ul>
                <div className="project-tags">
                  <span className="chip">Qwen3</span>
                  <span className="chip">Ollama</span>
                  <span className="chip">Docling</span>
                  <span className="chip">ChromaDB</span>
                  <span className="chip">FastAPI</span>
                  <span className="chip">React + TypeScript</span>
                </div>
              </div>

              <div className="timeline-item card reveal">
                <div className="timeline-date">Jan 2026 — May 2026</div>
                <h3>Student Intern</h3>
                <div className="timeline-company">
                  NH Small Business Development Center (SBDC) — New Hampshire (Hybrid)
                </div>
                <ul>
                  <li>Built an LLM-powered co-advisor tool end to end under a Google-funded grant: a RAG pipeline over the advisor knowledge base returning grounded, context-aware answers, moving advisors from a 2:1 to a 1:1 advisor-to-client ratio</li>
                  <li>Worked directly with SBDC advisors across the country to identify client-support best practices that shaped the tool&apos;s design and feature prioritization</li>
                </ul>
              </div>

              <div className="timeline-item card reveal">
                <div className="timeline-date">May 2024 — Aug 2024</div>
                <h3>Data Analyst Intern</h3>
                <div className="timeline-company">
                  Cohasset Center for Student Coastal Research — Cohasset, MA
                </div>
                <ul>
                  <li>Engineered an automated data-processing pipeline for weekly coastal measurements using Python and scheduled cron jobs, cutting manual staff effort by ~10 hours/week</li>
                  <li>Designed data-validation protocols with ArcGIS and Python that improved measurement accuracy by 25% and streamlined data access for researchers and external stakeholders</li>
                </ul>
              </div>


            </div>
          </div>
        </section>

        {/* ======================================
            EDUCATION
            ====================================== */}
        <section id="education">
          <div className="container">
            <div className="section-num">04</div>
            <div className="reveal">
              <h2 className="section-title" data-type data-glitch>Education</h2>
            </div>

            <div className="education-grid stagger">

              <div className="card edu-card reveal">
                <h3>B.S. in Data Analytics &amp; Data Science</h3>
                <div className="school">University of New Hampshire — Durham, NH</div>
                <div className="year-badge">Graduated May 2026</div>
                <p>Relevant Coursework: Algorithms, Machine Learning, Linear Algebra, NLP, Reinforcement Learning, Information Retrieval, Probability &amp; Statistics, Game Theory</p>
              </div>

            </div>
          </div>
        </section>

        {/* ======================================
            BLOG — skeleton: real posts from content/blog, placeholders after
            ====================================== */}
        <section id="blog">
          <div className="container">
            <div className="section-num">05</div>
            <div className="reveal">
              <h2 className="section-title" data-type data-glitch>Blog</h2>
            </div>
            <div className="blog-grid stagger">
              {posts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="card blog-card reveal">
                  <span className="blog-date">
                    {new Date(post.frontmatter.date).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}
                  </span>
                  <h3>{post.frontmatter.title}</h3>
                  <p>{post.frontmatter.description}</p>
                  {post.frontmatter.tags && (
                    <div className="project-tags">
                      {post.frontmatter.tags.map((tag) => (
                        <span key={tag} className="chip">{tag}</span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
              {Array.from({ length: Math.max(0, 3 - posts.length) }).map((_, i) => (
                <div key={i} className="card blog-card blog-card-empty reveal" aria-hidden="true">
                  <span className="blog-date">soon_</span>
                  <div className="skel skel-title"></div>
                  <div className="skel"></div>
                  <div className="skel skel-short"></div>
                </div>
              ))}
            </div>
            <div className="reveal" style={{ marginTop: "28px" }}>
              <Link href="/blog" className="btn btn-ghost">all posts</Link>
            </div>
          </div>
        </section>

        {/* ======================================
            CONTACT
            ====================================== */}
        <section id="contact" className="contact-section">
          <div className="container">
            <div className="section-num">06</div>
            <div className="contact-inner reveal">
              <Pyramid className="mark-contact" />
              <h2 data-type data-glitch>Let&apos;s build something.</h2>
              <p className="subtitle">Open to full-time roles, collaborations, and interesting problems.</p>
              <a href="/contact" className="contact-email-btn">
                {"✉"} Say Hello
              </a>
              <div className="social-links" style={{ marginTop: "36px" }}>
                <a href="https://github.com/matthewmcdowall" target="_blank" rel="noopener noreferrer" className="social-link">
                  <span className="tooltip">See my code!</span>
                  <svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                </a>
                <a href="https://linkedin.com/in/matthewmcdowall" target="_blank" rel="noopener noreferrer" className="social-link">
                  <span className="tooltip">Let&apos;s connect!</span>
                  <svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="mailto:matt.mcdowall77@gmail.com" className="social-link">
                  <span className="tooltip">Say hello!</span>
                  <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="footer">
          <p>{"©"} 2026 Matthew McDowall — Built with care</p>
          <p className="footer-credit">koi footage: <a href="https://commons.wikimedia.org/wiki/File:Koi_pond_in_Otaguro_Park.webm" target="_blank" rel="noopener noreferrer">Koi pond in Otaguro Park</a> by Dandy1022, CC BY-SA 4.0 — trimmed, looped and posterized</p>
        </div>

      </div>{/* end #siteContent */}

      <BentoData
        claudeActivity={data.claude?.dailyActivity}
        claudeTokens={data.claude?.totalTokens}
        claudeDays={data.claude?.activeDays}
      />
      <ClientBehaviors />
    </>
  );
}
