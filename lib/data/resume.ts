import { CertificateEntry, ExperienceEntry, ProjectEntry, ServiceEntry } from "@/types/resume";

export const aboutSummary =
  "I build scalable product systems across web, mobile, and cloud. My work combines full-stack engineering, Firebase architecture, and growth-minded product execution.";

export const experiences: ExperienceEntry[] = [
  {
    company: "Independent / Freelance",
    role: "Senior Full-Stack Engineer",
    period: "2022 - Present",
    summary: "Shipping production systems for startups and personal brands.",
    achievements: [
      "Built Firebase-first products with secure admin panels and SEO-first public experiences.",
      "Designed content-driven growth systems with analytics and automation loops.",
      "Led architecture decisions for scalable data models and cost-aware cloud operations."
    ]
  },
  {
    company: "Product Teams",
    role: "Frontend + Product Engineer",
    period: "2019 - 2022",
    summary: "Delivered conversion-focused interfaces and experimentation pipelines.",
    achievements: [
      "Implemented high-performance Next.js frontends with measurable SEO gains.",
      "Collaborated with design and marketing to unify brand and product narratives.",
      "Introduced analytics instrumentation to improve funnel visibility."
    ]
  }
];

export const projects: ProjectEntry[] = [
  {
    slug: "saleh-content-os",
    title: "Saleh Content OS",
    description: "A creator operating system for ideation, scheduling, and content performance tracking.",
    tags: ["creator", "firebase", "seo"]
  },
  {
    slug: "job-hunt-control-center",
    title: "Job Hunt Control Center",
    description: "Admin-only tracking and reporting for applications, interview pipelines, and outcomes.",
    tags: ["career", "dashboard", "automation"]
  },
  {
    slug: "personal-site-platform",
    title: "Personal Site Platform",
    description: "A conversion-ready personal website with structured content architecture and analytics.",
    tags: ["next.js", "growth", "branding"]
  }
];

export const services: ServiceEntry[] = [
  {
    title: "Full-Stack Product Build",
    detail: "End-to-end product architecture and implementation with production deployment workflows."
  },
  {
    title: "Firebase Architecture",
    detail: "Firestore schemas, secure rules, cloud functions, analytics, and cost optimization."
  },
  {
    title: "SEO + Growth Engineering",
    detail: "Content systems, technical SEO, metadata strategy, and event-based growth instrumentation."
  }
];

export const certificates: CertificateEntry[] = [
  {
    title: "Google Analytics Certification",
    issuer: "Google",
    year: "2024"
  },
  {
    title: "Professional Cloud Developer",
    issuer: "Google Cloud",
    year: "2023"
  },
  {
    title: "Meta Front-End Developer",
    issuer: "Meta",
    year: "2022"
  }
];

export const socialLinks = [
  { label: "LinkedIn", url: "https://linkedin.com/in/salehabbaas" },
  { label: "YouTube", url: "https://youtube.com/@salehabbaas" },
  { label: "Instagram", url: "https://instagram.com/salehabbaas" },
  { label: "TikTok", url: "https://tiktok.com/@salehabbaas" },
  { label: "X", url: "https://x.com/salehabbaas" }
];
