import ClientBehaviors from "@/components/ClientBehaviors";
import BentoData from "@/components/BentoData";
import { getPortfolioData } from "@/lib/data";

// ISR: prerendered, then regenerated in the background at most hourly.
// Nothing here uses request-time APIs, so the page is served from the CDN
// and the live-stat fetches in lib/data.ts run once per hour, not per visitor.
export const revalidate = 3600;

export default async function Home() {
  const data = await getPortfolioData();
  return (
    <>
      {/* ======================================
          TERMINAL INTRO
          ====================================== */}
      <div className="terminal-overlay" id="terminalOverlay">
        <div className="terminal-wrapper">
          <div className="terminal-header-text">
            <div className="terminal-session-label">Terminal Session</div>
            <div className="terminal-name">Matthew McDowall</div>
            <div className="terminal-role-label">AI &amp; Data Science Workspace</div>
          </div>

          <div className="terminal-chrome">
            <div className="terminal-dots">
              <span></span><span></span><span></span>
            </div>
            <div className="terminal-title">
              <svg viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              Terminal
            </div>
          </div>

          <div className="terminal-body" id="terminalBody">
            <div className="terminal-line" data-delay="200">
              <span className="prompt">{"❯"}</span>
              <span className="t-cmd">matt@unh ~ % init_portfolio</span>
            </div>
            <div className="terminal-line" data-delay="500">
              <span className="pipe">{"│"}</span>
              <span className="t-info">loading RAG pipelines and LangChain modules...</span>
            </div>
            <div className="terminal-line" data-delay="900">
              <span className="pipe">{"│"}</span>
              <span className="t-success">connected to vector store [pgvector OK]</span>
            </div>
            <div className="terminal-line" data-delay="1300">
              <span className="pipe">{"│"}</span>
              <span className="t-info">authenticating with AWS Bedrock...</span>
            </div>
            <div className="terminal-line" data-delay="1700">
              <span className="pipe">{"│"}</span>
              <span className="t-success">session ready. [all systems nominal]</span>
            </div>
            <div className="terminal-line" data-delay="2100">
              <span className="pipe">{"│"}</span>
              <span className="t-highlight">launching matt.dev environment_v1.0...</span>
            </div>

            <div className="terminal-cursor-line" id="terminalCursor" data-delay="2400">
              <span className="prompt">{"❯"}</span>
              <span className="terminal-cursor"></span>
            </div>

            <div className="terminal-progress">
              <div className="terminal-progress-bar" id="terminalProgress"></div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================
          SITE CONTENT (hidden until terminal finishes)
          ====================================== */}
      <div className="site-content" id="siteContent">

        {/* ======================================
            NAVIGATION
            ====================================== */}
        <nav>
          <a href="#" className="nav-logo">matt.dev</a>
          <button
            className="nav-toggle"
            id="navToggle"
          >
            menu
          </button>
          <ul className="nav-links" id="navLinks">
            <li><a href="#about">About</a></li>
            <li><a href="#skills">Skills</a></li>
            <li><a href="#projects">Projects</a></li>
            <li><a href="#experience">Experience</a></li>
            <li><a href="#education">Education</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>

        {/* ======================================
            HERO
            ====================================== */}
        <section className="hero">
          <div className="container">
            <div className="section-num">01</div>
            <div className="hero-grid">
              <div className="hero-left">
                <h1>Hi, I&apos;m <span className="underline-cyan">Matthew McDowall</span></h1>
                <p className="hero-bio">I build end-to-end AI systems that ship to production — not just demos. From RAG pipelines and LLM tooling to data infrastructure, I turn ideas into real products. <strong>Got an idea?</strong></p>
                <div className="hero-cta">
                  <a href="#contact" className="btn btn-primary">Let&apos;s Talk</a>
                  <a href="#projects" className="btn btn-ghost">See My Work {"↓"}</a>
                </div>
              </div>
              <div className="hero-tags">
                <div className="hero-tag">#RAGSystems</div>
                <div className="hero-tag">#LLMs</div>
                <div className="hero-tag">#LangChain</div>
                <div className="hero-tag">#Python</div>
                <div className="hero-tag">#DataScience</div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================
            ABOUT
            ====================================== */}
        <section id="about">
          <div className="container">
            <div className="section-num">02</div>
            <div className="about-grid">
              {/* Left: Photo */}
              <div className="reveal-left">
                <div className="about-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/photo-cropped.jpg" alt="Matthew McDowall" />
                </div>
              </div>

              {/* Right: Text */}
              <div className="reveal">
                <h2 className="section-title">About</h2>
                <div className="about-text">
                  <p>I&apos;m Matthew McDowall — a Senior at the University of New Hampshire who builds custom, domain-specific, end-to-end AI applications. Not demos. Full systems that go from working with clients and concepts to production.</p>
                  <p>Currently interning at North Light AI where I architected a supplier-matching system adopted by 50+ SMBs and NASA. I&apos;m deep into applied AI and LLMs — and making them useful in the real world.</p>
                </div>

                <div className="fun-facts">
                  <div className="fun-chip">Shipped a product to NASA</div>
                  <div className="fun-chip">RAG system builder</div>
                  <div className="fun-chip">RL research lab member</div>
                </div>
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
                  <div style={{ border: "1.5px solid #E5E0D8", borderRadius: "6px", padding: "8px 14px", flex: 1 }}>
                    <span className="bento-label">Tokens</span>
                    <span className="bento-stat" style={{ fontSize: "1.2rem" }} id="claude-tokens">--</span>
                  </div>
                  <div style={{ border: "1.5px solid #E5E0D8", borderRadius: "6px", padding: "8px 14px", flex: 1 }}>
                    <span className="bento-label">Days</span>
                    <span className="bento-stat" style={{ fontSize: "1.2rem" }} id="claude-days">--</span>
                  </div>
                </div>
                <div className="claude-heatmap" style={{ marginTop: "14px" }}>
                  <div id="claude-month-labels" style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontFamily: "var(--font-mono)", fontSize: "0.55rem", color: "var(--muted)", padding: "0 2px" }}></div>
                  <div id="claude-heatmap-grid"></div>
                </div>
                <div style={{ marginTop: "10px" }}>
                  <span style={{ display: "inline-block", fontFamily: "var(--font-mono)", fontSize: "0.7rem", padding: "4px 12px", background: "#D4956B", color: "white", borderRadius: "12px" }}>#Claude</span>
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
                  <div style={{ border: "1.5px solid #E5E0D8", borderRadius: "6px", padding: "8px 14px", flex: 1 }}>
                    <span className="bento-label">Repos</span>
                    <span className="bento-stat" style={{ fontSize: "1.2rem" }} id="github-repos">{data.github?.publicRepos ?? "--"}</span>
                  </div>
                  <div style={{ border: "1.5px solid #E5E0D8", borderRadius: "6px", padding: "8px 14px", flex: 1 }}>
                    <span className="bento-label">Followers</span>
                    <span className="bento-stat" style={{ fontSize: "1.2rem" }} id="github-followers">{data.github?.followers ?? "--"}</span>
                  </div>
                </div>
                <div className="bento-contrib-graph">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://ghchart.rshah.org/matthewmcdowall" alt="GitHub Contributions" />
                </div>
                <div style={{ marginTop: "10px" }}>
                  <span style={{ display: "inline-block", fontFamily: "var(--font-mono)", fontSize: "0.7rem", padding: "4px 12px", background: "#1A1A1A", color: "white", borderRadius: "12px" }}>#OpenSource</span>
                </div>
              </a>

              {/* Spotify */}
              <div className="bento-card">
                <div className="bento-card-header">
                  <div className="bento-card-icon spotify">
                    <svg viewBox="0 0 24 24" fill="white"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                  </div>
                  <span className="bento-username" id="spotify-label">Currently Listening</span>
                </div>
                <div className="bento-spotify-embed" id="spotify-embed"></div>
              </div>

              {/* Hugging Face */}
              <a href="https://huggingface.co/MatthewMcDowall" target="_blank" rel="noopener" className="bento-card" id="hf-card">
                <div className="bento-card-header">
                  <div className="bento-card-icon huggingface">
                    <span style={{ fontSize: "22px", lineHeight: 1 }}>{"🤗"}</span>
                  </div>
                  <span className="bento-username">@MatthewMcDowall</span>
                </div>
                <div className="bento-stats-row" style={{ gap: "20px" }}>
                  <div style={{ border: "1.5px solid #E5E0D8", borderRadius: "6px", padding: "8px 14px", flex: 1 }}>
                    <span className="bento-label">Following</span>
                    <span className="bento-stat" style={{ fontSize: "1.2rem" }} id="hf-following">{data.huggingface?.numFollowing ?? "--"}</span>
                  </div>
                </div>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--muted)", marginTop: "12px", flex: 1 }}>Exploring models, datasets &amp; spaces</p>
                <div style={{ marginTop: "10px" }}>
                  <span style={{ display: "inline-block", fontFamily: "var(--font-mono)", fontSize: "0.7rem", padding: "4px 12px", background: "#FFD21E", color: "#1A1A1A", borderRadius: "12px" }}>#HuggingFace</span>
                </div>
              </a>

            </div>
          </div>
        </section>

        {/* ======================================
            SKILLS (Marquee)
            ====================================== */}
        <section id="skills" className="skills-section">
          <div className="container">
            <div className="reveal">
              <h2 className="section-title">Tech I Work With</h2>
            </div>
          </div>

          {/* Row 1: Languages & Frameworks */}
          <div className="marquee-wrap" style={{ marginBottom: "12px" }}>
            <div className="marquee-track">
              <span className="marquee-chip">Python</span>
              <span className="marquee-chip">R</span>
              <span className="marquee-chip">SQL</span>
              <span className="marquee-chip">TypeScript</span>
              <span className="marquee-chip">PyTorch</span>
              <span className="marquee-chip">Transformers</span>
              <span className="marquee-chip">Hugging Face</span>
              <span className="marquee-chip">LangChain</span>
              <span className="marquee-chip">LangGraph</span>
              <span className="marquee-chip">Pandas</span>
              <span className="marquee-chip">Spark</span>
              <span className="marquee-chip">FastAPI</span>
              <span className="marquee-chip">React.js</span>
              <span className="marquee-chip">Streamlit</span>
              {/* Duplicate for seamless loop */}
              <span className="marquee-chip">Python</span>
              <span className="marquee-chip">R</span>
              <span className="marquee-chip">SQL</span>
              <span className="marquee-chip">TypeScript</span>
              <span className="marquee-chip">PyTorch</span>
              <span className="marquee-chip">Transformers</span>
              <span className="marquee-chip">Hugging Face</span>
              <span className="marquee-chip">LangChain</span>
              <span className="marquee-chip">LangGraph</span>
              <span className="marquee-chip">Pandas</span>
              <span className="marquee-chip">Spark</span>
              <span className="marquee-chip">FastAPI</span>
              <span className="marquee-chip">React.js</span>
              <span className="marquee-chip">Streamlit</span>
            </div>
          </div>

          {/* Row 2: LLM & RAG (reverse) */}
          <div className="marquee-wrap" style={{ marginBottom: "12px" }}>
            <div className="marquee-track marquee-reverse">
              <span className="marquee-chip">Llama</span>
              <span className="marquee-chip">Qwen</span>
              <span className="marquee-chip">Claude</span>
              <span className="marquee-chip">LoRA / QLoRA</span>
              <span className="marquee-chip">Hybrid Vector + BM25</span>
              <span className="marquee-chip">Semantic Chunking</span>
              <span className="marquee-chip">RAG Pipelines</span>
              <span className="marquee-chip">Ollama</span>
              <span className="marquee-chip">ChromaDB</span>
              <span className="marquee-chip">pgvector</span>
              <span className="marquee-chip">Docling</span>
              {/* Duplicate */}
              <span className="marquee-chip">Llama</span>
              <span className="marquee-chip">Qwen</span>
              <span className="marquee-chip">Claude</span>
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
              <span className="marquee-chip">Git</span>
              <span className="marquee-chip">CI/CD</span>
              <span className="marquee-chip">ArcGIS</span>
              <span className="marquee-chip">NLP</span>
              <span className="marquee-chip">Reinforcement Learning</span>
              <span className="marquee-chip">Machine Learning</span>
              <span className="marquee-chip">Information Retrieval</span>
              {/* Duplicate */}
              <span className="marquee-chip">PostgreSQL</span>
              <span className="marquee-chip">AWS Bedrock</span>
              <span className="marquee-chip">AWS Lambda</span>
              <span className="marquee-chip">Git</span>
              <span className="marquee-chip">CI/CD</span>
              <span className="marquee-chip">ArcGIS</span>
              <span className="marquee-chip">NLP</span>
              <span className="marquee-chip">Reinforcement Learning</span>
              <span className="marquee-chip">Machine Learning</span>
              <span className="marquee-chip">Information Retrieval</span>
            </div>
          </div>
        </section>

        {/* ======================================
            PROJECTS
            ====================================== */}
        <section id="projects">
          <div className="container">
            <div className="section-num">03</div>
            <div className="reveal">
              <h2 className="section-title">Things I&apos;ve Built</h2>
            </div>

            <div className="projects-grid stagger">

              {/* Featured: Prime Ready */}
              <div className="project-featured reveal">
                <div className="card project-card">
                  <div className="project-visual" id="primeReadyVisual" style={{ overflow: "hidden", padding: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/prime-ready.jpg"
                      alt="Prime Ready Launch"
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
                    />
                  </div>
                  <div>
                    <h3>Prime Ready — NHADC</h3>
                    <p>Hybrid RAG-based matchmaking system that pairs small-to-medium suppliers with Prime contractors, replacing 5-6 weeks of manual discovery with near-instant query responses. Adopted initially by 50+ SMBs and NASA.</p>
                    <div className="project-tags" style={{ marginTop: "14px" }}>
                      <span className="chip">Python</span>
                      <span className="chip">LangChain</span>
                      <span className="chip">AWS Bedrock</span>
                      <span className="chip">pgvector</span>
                      <span className="chip">PostgreSQL</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project 2: NMS RAG Chatbot */}
              <div className="reveal">
                <div className="card project-card">
                  <h3>AI-Driven NMS Chatbot — SubCom</h3>
                  <p>Locally-integrated chatbot for SubCom&apos;s subsea cable Network Management System. Parses proprietary NMS documentation, embeds it into a vector database, and exposes natural-language querying through a full backend + frontend stack — fully air-gapped with zero external API calls.</p>
                  <div className="project-tags">
                    <span className="chip">Qwen3</span>
                    <span className="chip">Ollama</span>
                    <span className="chip">Docling</span>
                    <span className="chip">ChromaDB</span>
                    <span className="chip">FastAPI</span>
                    <span className="chip">React</span>
                  </div>
                </div>
              </div>

              {/* Project 3: Coastal Data Pipeline */}
              <div className="reveal">
                <div className="card project-card">
                  <h3>Coastal Research Pipeline — CCSCR</h3>
                  <p>Automated data-processing pipeline built for the Cohasset Center for Student Coastal Research. Handles weekly coastal measurements using Python and CronJob scheduling, reducing manual staff effort by ~10 hours/week and improving measurement accuracy by 25%.</p>
                  <div className="project-tags">
                    <span className="chip">Python</span>
                    <span className="chip">CronJob</span>
                    <span className="chip">ArcGIS</span>
                    <span className="chip">Data Validation</span>
                  </div>
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
            <div className="section-num">04</div>
            <div className="reveal">
              <h2 className="section-title">Experience</h2>
            </div>

            <div className="timeline stagger">

              <div className="timeline-item card reveal">
                <div className="timeline-date">Dec 2024 — Present</div>
                <h3>Applied AI &amp; Automation Intern</h3>
                <div className="timeline-company">
                  North Light AI — Durham, NH <span className="badge">Current</span>
                </div>
                <ul>
                  <li>Architected and deployed a Hybrid RAG matchmaking system (Prime Ready) replacing 5-6 weeks of manual discovery with instant query responses</li>
                  <li>Co-led end-to-end development from concept to production in 2 months with a 4-person team — adopted by 50+ SMBs and NASA</li>
                  <li>Built data ingestion pipelines for supplier profiles, iterating on retrieval quality through embedding model evaluation, chunk-size tuning, and hybrid vector search scoring</li>
                </ul>
              </div>

              <div className="timeline-item card reveal">
                <div className="timeline-date">May 2024 — Aug 2024</div>
                <h3>Data Science Analyst Intern</h3>
                <div className="timeline-company">
                  Cohasset Center for Student Coastal Research — Cohasset, MA
                </div>
                <ul>
                  <li>Engineered an automated data-processing pipeline for weekly coastal measurements using Python and CronJob scheduling, saving ~10 hours/week</li>
                  <li>Designed data validation protocols delivering a 25% improvement in measurement accuracy</li>
                </ul>
              </div>

              <div className="timeline-item card reveal">
                <div className="timeline-date">Winter 2024 — Present</div>
                <h3>Member, Reinforcement Learning Research Lab</h3>
                <div className="timeline-company">
                  University of New Hampshire
                </div>
                <ul>
                  <li>Participate in weekly seminar involving peer review and presentation of current RL research literature</li>
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
            <div className="section-num">05</div>
            <div className="reveal">
              <h2 className="section-title">Education</h2>
            </div>

            <div className="education-grid stagger">

              <div className="card edu-card reveal">
                <h3>B.S. in Data Analytics &amp; Data Science</h3>
                <div className="school">University of New Hampshire — Durham, NH</div>
                <div className="year-badge">Aug 2022 — May 2026</div>
                <p>Relevant Coursework: Algorithms, Machine Learning, Linear Algebra, NLP, Reinforcement Learning, Information Retrieval, Probability &amp; Statistics, Game Theory</p>
              </div>

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
              <h2>Let&apos;s build something.</h2>
              <p className="subtitle">Open to internships, collaborations, and interesting problems.</p>
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
        </div>

      </div>{/* end .site-content */}

      <BentoData
        claudeActivity={data.claude?.dailyActivity}
        claudeTokens={data.claude?.totalTokens}
        claudeDays={data.claude?.activeDays}
        spotifyShowId={data.spotify.showId}
        spotifyLabel={data.spotify.label}
      />
      <ClientBehaviors />
    </>
  );
}
