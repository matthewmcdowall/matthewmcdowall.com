// Site-wide identity used by metadata (app/layout.tsx), the homepage JSON-LD,
// robots.ts and sitemap.ts. Pure constants — nothing here may touch request
// APIs, or the ISR homepage would silently become per-request.

export const SITE_URL = "https://matthewmcdowall.com";
export const SITE_NAME = "Matthew McDowall";

// <title> and meta description are written for search snippets and recruiter
// boolean searches: name first, then the phrases people actually query
// ("AI Engineer", "Machine Learning Engineer", LLM, RAG, agentic, Python,
// LangGraph, PyTorch, AWS, the degree, the school). Google only uses a meta
// description as the snippet when it contains the query terms, which is why
// the name has to be in it.
export const SITE_TITLE = "Matthew McDowall — Applied AI Engineer | LLMs, RAG, Agentic AI";
export const SITE_DESCRIPTION =
  "Matthew McDowall — applied AI & machine learning engineer building production LLM, RAG, and agentic AI systems in Python (LangGraph, PyTorch, AWS). Lead engineer at North Light AI. B.S. Data Analytics & Data Science, University of New Hampshire ’26.";

export const PROFILE_IMAGE = { url: "/photo-cropped.jpg", width: 1536, height: 1350, alt: "Matthew McDowall" };

export const SOCIAL = {
  github: "https://github.com/matthewmcdowall",
  linkedin: "https://linkedin.com/in/matthewmcdowall",
  huggingface: "https://huggingface.co/MatthewMcDowall",
};

// schema.org Person + WebSite. Person feeds entity understanding for name
// searches (job title, employer, school, skills); WebSite lets Google show
// "Matthew McDowall" as the site name above the result instead of the domain.
export const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: SITE_NAME,
      url: SITE_URL,
      image: `${SITE_URL}${PROFILE_IMAGE.url}`,
      jobTitle: "Applied AI & Automation Engineer Lead",
      description: SITE_DESCRIPTION,
      worksFor: { "@type": "Organization", name: "North Light AI" },
      alumniOf: {
        "@type": "CollegeOrUniversity",
        name: "University of New Hampshire",
        sameAs: "https://www.unh.edu",
      },
      hasCredential: {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "degree",
        educationalLevel: "Bachelor's degree",
        name: "B.S. in Data Analytics & Data Science",
      },
      sameAs: [SOCIAL.github, SOCIAL.linkedin, SOCIAL.huggingface],
      knowsAbout: [
        "Applied AI",
        "Machine Learning",
        "Large Language Models (LLMs)",
        "Retrieval-Augmented Generation (RAG)",
        "Agentic AI systems",
        "Natural Language Processing (NLP)",
        "Information Retrieval",
        "Reinforcement Learning",
        "Python",
        "TypeScript",
        "SQL",
        "PyTorch",
        "Hugging Face Transformers",
        "LangChain",
        "LangGraph",
        "LoRA / QLoRA fine-tuning",
        "Vector search (pgvector, ChromaDB)",
        "FastAPI",
        "PostgreSQL",
        "AWS (Bedrock, Lambda)",
        "Google Cloud",
        "Apache Spark",
        "Pandas",
        "React",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      author: { "@id": `${SITE_URL}/#person` },
    },
  ],
};
