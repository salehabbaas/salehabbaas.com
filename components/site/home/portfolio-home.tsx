"use client";

import Image from "next/image";
import { motion, useScroll, useSpring, useTransform, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Briefcase,
  ChevronDown,
  Code2,
  Database,
  Github,
  Globe,
  GraduationCap,
  Heart,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Send,
  Server,
  Shield,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/lib/motion/useReducedMotion";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
type SocialLink = { label: string; url: string };
type PortfolioHomeProps = { socialLinks: SocialLink[] };

/* ─── Data from resume ─── */
const EXPERIENCES = [
  {
    period: "Dec 2024 — Sep 2025",
    role: "Software Engineer",
    company: "The Ottawa Hospital",
    location: "Ottawa, ON",
    highlights: [
      "Engineered HL7 v2 and FHIR R4 integration workflows in Rhapsody, routing high-volume clinical messages across 10+ hospital systems",
      "Reduced mean time to resolve interface incidents by ~40% via diagnostic runbooks and centralized log analysis",
      "Delivered Power BI dashboards for real-time visibility into message throughput, lab turnaround, and SLA compliance",
      "Designed PHIPA/HIPAA-compliant backend APIs and integration middleware for secure patient data access",
    ],
  },
  {
    period: "Jul 2023 — Nov 2024",
    role: "Software Engineer",
    company: "Arab Hospitals Group",
    location: "Ramallah",
    highlights: [
      "Architected RESTful and GraphQL APIs (Python | FastAPI | Node.js) — lab result accuracy to 98%, processing time down 60%",
      "Built real-time voice-to-prescription system using AWS Transcribe and Comprehend Medical",
      "Designed enterprise PACS system with DICOM ingestion, ORDS/REST APIs, and Oracle APEX frontend",
      "Integrated 8+ laboratory analyzers with HIS using HL7 | FHIR | ASTM protocols",
    ],
  },
  {
    period: "Dec 2020 — Jul 2023",
    role: "Software Engineer",
    company: "World Health Organization (WHO)",
    location: "Ramallah",
    highlights: [
      "Built and scaled a public health platform from scratch supporting 3,000+ users across 3+ countries",
      "Designed ETL pipelines consolidating data from Oracle | MySQL | SQL Server — report time: hours to minutes",
      "Containerised services with Docker and Kubernetes for horizontal scaling during peak loads",
      "Integrated Elasticsearch reducing p95 latency by 50%+ under production volumes",
    ],
  },
];

const PROJECTS = [
  {
    name: "Agentic Personal Assistant",
    tech: "LangChain · LangGraph · OpenAI · Pinecone · Docker",
    description: "Multi-agent RAG system with tool-calling, multi-step reasoning, and PDF ingestion pipeline. Live token/cost dashboard with LangSmith tracing.",
    color: "from-violet-500/20 to-purple-600/20",
    border: "border-violet-500/30",
  },
  {
    name: "AIPlace",
    tech: "Python · FastAPI · OpenCLIP · pgvector · Next.js",
    description: "Computer vision pipeline using OpenCLIP embeddings and pgvector cosine search. ~85ms p50 recognition latency from live camera frames.",
    color: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/30",
  },
  {
    name: "Platr",
    tech: "TypeScript · Next.js · Flutter · Prisma · Stripe · Firebase",
    description: "Cross-platform food marketplace with JWT auth, Stripe payments, Firebase real-time sync, and Gemini AI recommendations.",
    color: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30",
  },
  {
    name: "DeepOncology",
    tech: "Python · PyTorch · TensorFlow",
    description: "V-Net architecture for 3D segmentation of PET/CT scans, tumour classification, and patient survival prediction.",
    color: "from-rose-500/20 to-orange-500/20",
    border: "border-rose-500/30",
  },
];

const SKILL_CATEGORIES = [
  {
    icon: Code2,
    title: "Languages",
    items: ["Python", "TypeScript", "JavaScript", "Swift", "Dart", "SQL", "PHP", "Bash"],
  },
  {
    icon: Sparkles,
    title: "AI & Agents",
    items: ["LangChain", "LangGraph", "OpenAI API", "Pinecone (RAG)", "OpenCLIP", "PyTorch", "TensorFlow"],
  },
  {
    icon: Server,
    title: "Backend & APIs",
    items: ["FastAPI", "Django", "Node.js", "Express", "GraphQL", "gRPC", "Microservices"],
  },
  {
    icon: Globe,
    title: "Frontend & Mobile",
    items: ["Next.js", "React", "Tailwind CSS", "Swift/SwiftUI", "Flutter", "React Native"],
  },
  {
    icon: Database,
    title: "Data & Cloud",
    items: ["PostgreSQL", "MySQL", "Redis", "AWS", "Firebase", "Docker", "Kubernetes", "Terraform"],
  },
  {
    icon: Shield,
    title: "Healthcare & Security",
    items: ["HL7 v2/v3", "FHIR R4", "DICOM", "JWT/OAuth", "RBAC", "ISO 27001", "HIPAA/PHIPA"],
  },
];

const CERTIFICATIONS = [
  { name: "AWS Certified Cloud Practitioner", org: "Amazon Web Services", year: "2025" },
  { name: "AI Fundamentals", org: "IBM", year: "2024" },
  { name: "Data Science Certificate", org: "Birzeit University | IDRC Canada", year: "2022" },
  { name: "Certified Ethical Hacker (CEH)", org: "Cystack", year: "2022" },
  { name: "CCNA", org: "Experts Turnkey Solutions", year: "" },
  { name: "Oracle Database 12c Administrator", org: "Experts Turnkey Solutions", year: "" },
];

/* ─── Typewriter Hook ─── */
function useTypewriter(texts: string[], speed = 60, pause = 2000) {
  const [display, setDisplay] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[textIndex];
    const timeout = deleting ? speed / 2 : speed;

    if (!deleting && charIndex === current.length) {
      const t = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(t);
    }

    if (deleting && charIndex === 0) {
      setDeleting(false);
      setTextIndex((p) => (p + 1) % texts.length);
      return;
    }

    const t = setTimeout(() => {
      setCharIndex((p) => p + (deleting ? -1 : 1));
      setDisplay(current.slice(0, charIndex + (deleting ? -1 : 1)));
    }, timeout);

    return () => clearTimeout(t);
  }, [charIndex, deleting, pause, speed, textIndex, texts]);

  return display;
}

/* ─── Section wrapper with reveal ─── */
function Section({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      id={id}
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={cn("relative mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32", className)}
    >
      {children}
    </motion.section>
  );
}

/* ─── Staggered child ─── */
function FadeChild({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Floating navigation ─── */
const NAV_ITEMS = [
  { id: "hero", label: "Home" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "certifications", label: "Certs" },
  { id: "contact", label: "Contact" },
];

function FloatingNav() {
  const [active, setActive] = useState("hero");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const sorted = visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          setActive(sorted[0].target.id);
        }
      },
      { rootMargin: "-30% 0px -40% 0px", threshold: [0.1, 0.3, 0.5] }
    );

    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2"
        >
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/70 px-2 py-1.5 shadow-2xl backdrop-blur-xl">
            {NAV_ITEMS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium tracking-wide transition-all duration-300",
                  active === id
                    ? "bg-white text-black shadow-lg"
                    : "text-white/60 hover:text-white"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

/* ─── Scroll progress bar ─── */
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500"
      style={{ scaleX }}
    />
  );
}

/* ─── Animated background grid ─── */
function GridBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {/* Solid dark base to fully cover the old body background */}
      <div className="absolute inset-0 bg-[hsl(225,50%,4%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.06),transparent_50%)]" />
    </div>
  );
}

/* ─── Main Component ─── */
export function PortfolioHome({ socialLinks }: PortfolioHomeProps) {
  const typedText = useTypewriter(
    [
      "Software Engineer",
      "AI Systems Builder",
      "Healthcare Integration Specialist",
      "Cloud Architect",
      "Open Source Contributor",
    ],
    70,
    2200
  );

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.7], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.7], [0, 80]);

  return (
    <div className="relative min-h-screen bg-[hsl(225,50%,4%)] text-white">
      <GridBackground />
      <ScrollProgressBar />
      <FloatingNav />

      {/* ═══ HERO ═══ */}
      <motion.div ref={heroRef} id="hero" style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}>
        <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-5">
          {/* Decorative orbs */}
          <div className="absolute left-[10%] top-[20%] h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px]" />
          <div className="absolute bottom-[20%] right-[10%] h-96 w-96 rounded-full bg-violet-500/8 blur-[120px]" />

          <div className="relative z-10 flex flex-col items-center gap-8 text-center">
            {/* Profile image */}
            <FadeChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative"
              >
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 opacity-75 blur-sm" />
                <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-white/20 md:h-40 md:w-40">
                  <Image
                    src="/SalehAbbaasCricle.jpeg"
                    alt="Saleh Abbaas"
                    fill
                    priority
                    sizes="(min-width: 768px) 160px, 128px"
                    className="object-cover"
                  />
                </div>
              </motion.div>
            </FadeChild>

            {/* Status badge */}
            <FadeChild delay={0.1}>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-xs font-medium text-emerald-300">Available for opportunities</span>
              </div>
            </FadeChild>

            {/* Name */}
            <FadeChild delay={0.15}>
              <h1 className="bg-gradient-to-b from-white via-white to-white/60 bg-clip-text font-display text-5xl font-bold tracking-tight text-transparent md:text-7xl lg:text-8xl">
                Saleh Abbaas
              </h1>
            </FadeChild>

            {/* Typewriter */}
            <FadeChild delay={0.2}>
              <div className="flex items-center gap-2 font-mono text-lg text-cyan-300 md:text-xl">
                <Terminal className="h-5 w-5 text-cyan-400" />
                <span className="text-white/40">$</span>
                <span>{typedText}</span>
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                  className="inline-block h-5 w-[2px] bg-cyan-400"
                />
              </div>
            </FadeChild>

            {/* Location */}
            <FadeChild delay={0.25}>
              <div className="flex items-center gap-2 text-sm text-white/50">
                <MapPin className="h-4 w-4" />
                <span>Ottawa, ON, Canada</span>
              </div>
            </FadeChild>

            {/* CTA buttons */}
            <FadeChild delay={0.3}>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#contact"
                  className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  Get in touch
                  <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <a
                  href="#projects"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5"
                >
                  View projects
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </FadeChild>

            {/* Social links */}
            <FadeChild delay={0.35}>
              <div className="flex items-center gap-4">
                {socialLinks.slice(0, 5).map((link) => {
                  const Icon = getSocialIcon(link.label);
                  return (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-full border border-white/10 p-2.5 transition-all hover:border-white/30 hover:bg-white/5"
                      aria-label={link.label}
                    >
                      <Icon className="h-4 w-4 text-white/50 transition-colors group-hover:text-white" />
                    </a>
                  );
                })}
              </div>
            </FadeChild>

            {/* Scroll indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="flex flex-col items-center gap-2"
              >
                <span className="text-[10px] uppercase tracking-[0.25em] text-white/30">Scroll</span>
                <ChevronDown className="h-4 w-4 text-white/30" />
              </motion.div>
            </motion.div>
          </div>
        </section>
      </motion.div>

      {/* ═══ STATS BAR ═══ */}
      <Section id="stats" className="py-12 md:py-16">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { value: "5+", label: "Years Experience" },
            { value: "3", label: "Organizations" },
            { value: "10+", label: "Hospital Systems" },
            { value: "3,000+", label: "Platform Users" },
          ].map((stat, i) => (
            <FadeChild key={stat.label} delay={i * 0.1}>
              <div className="text-center">
                <div className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text font-display text-4xl font-bold text-transparent md:text-5xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-white/50">{stat.label}</div>
              </div>
            </FadeChild>
          ))}
        </div>
      </Section>

      {/* ═══ EXPERIENCE ═══ */}
      <Section id="experience">
        <FadeChild>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-cyan-400">Career</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Experience</h2>
          <p className="mt-3 max-w-2xl text-base text-white/50">
            5+ years building production systems across healthcare, public health, and enterprise environments.
          </p>
        </FadeChild>

        <div className="relative mt-16">
          {/* Timeline line */}
          <div className="absolute left-0 top-0 hidden h-full w-px bg-gradient-to-b from-cyan-500/50 via-blue-500/30 to-transparent md:left-8 md:block" />

          <div className="space-y-12">
            {EXPERIENCES.map((exp, i) => (
              <FadeChild key={exp.company} delay={i * 0.15}>
                <div className="group relative md:pl-20">
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1 hidden h-4 w-4 md:left-[25px] md:block">
                    <div className="absolute inset-0 rounded-full bg-cyan-400/30 transition-all group-hover:scale-150 group-hover:bg-cyan-400/50" />
                    <div className="absolute inset-[3px] rounded-full bg-cyan-400" />
                  </div>

                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04] md:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-white md:text-2xl">{exp.role}</h3>
                        <p className="mt-1 text-base font-medium text-cyan-300">{exp.company}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                          <Briefcase className="h-3 w-3" />
                          {exp.period}
                        </span>
                        <p className="mt-1 flex items-center justify-end gap-1 text-xs text-white/40">
                          <MapPin className="h-3 w-3" />
                          {exp.location}
                        </p>
                      </div>
                    </div>
                    <ul className="mt-5 space-y-3">
                      {exp.highlights.map((h, j) => (
                        <li key={j} className="flex gap-3 text-sm leading-relaxed text-white/60">
                          <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400/60" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </FadeChild>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══ PROJECTS ═══ */}
      <Section id="projects">
        <FadeChild>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">Work</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Featured Projects</h2>
          <p className="mt-3 max-w-2xl text-base text-white/50">
            Open source and production systems spanning AI agents, computer vision, and full-stack platforms.
          </p>
        </FadeChild>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {PROJECTS.map((project, i) => (
            <FadeChild key={project.name} delay={i * 0.1}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-6 transition-all duration-500 md:p-8",
                  project.border,
                  "bg-gradient-to-br",
                  project.color,
                  "hover:shadow-2xl"
                )}
              >
                <div className="absolute right-4 top-4 rounded-full border border-white/10 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <ArrowUpRight className="h-4 w-4 text-white/60" />
                </div>
                <h3 className="text-xl font-bold text-white">{project.name}</h3>
                <p className="mt-1 font-mono text-xs text-white/40">{project.tech}</p>
                <p className="mt-4 text-sm leading-relaxed text-white/60">{project.description}</p>
              </motion.div>
            </FadeChild>
          ))}
        </div>
      </Section>

      {/* ═══ SKILLS ═══ */}
      <Section id="skills">
        <FadeChild>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">Expertise</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Technical Skills</h2>
        </FadeChild>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SKILL_CATEGORIES.map((cat, i) => {
            const CatIcon = cat.icon;
            return (
              <FadeChild key={cat.title} delay={i * 0.08}>
                <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                      <CatIcon className="h-5 w-5 text-white/70" />
                    </div>
                    <h3 className="text-base font-semibold text-white">{cat.title}</h3>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {cat.items.map((item) => (
                      <span
                        key={item}
                        className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-xs text-white/50 transition-colors hover:border-white/20 hover:text-white/70"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </FadeChild>
            );
          })}
        </div>
      </Section>

      {/* ═══ CERTIFICATIONS ═══ */}
      <Section id="certifications">
        <FadeChild>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-amber-400">Credentials</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Certifications</h2>
        </FadeChild>

        <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CERTIFICATIONS.map((cert, i) => (
            <FadeChild key={cert.name} delay={i * 0.08}>
              <div className="group flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04]">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2">
                  <GraduationCap className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{cert.name}</h3>
                  <p className="mt-0.5 text-xs text-white/40">{cert.org}</p>
                  {cert.year && <p className="mt-0.5 text-xs text-white/30">{cert.year}</p>}
                </div>
              </div>
            </FadeChild>
          ))}
        </div>

        {/* Education */}
        <FadeChild delay={0.3}>
          <div className="mt-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2">
                <GraduationCap className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">B.S., Management Information Systems</h3>
                <p className="text-sm text-white/40">An Najah National University — Sep 2014 to Dec 2018</p>
              </div>
            </div>
          </div>
        </FadeChild>
      </Section>

      {/* ═══ CONTACT ═══ */}
      <Section id="contact">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-violet-500/10 p-8 md:p-14">
          {/* Decorative */}
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-500/10 blur-[80px]" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-violet-500/10 blur-[80px]" />

          <div className="relative z-10">
            <FadeChild>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-cyan-400">Connect</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">
                Let&apos;s build something
                <br />
                <span className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">together.</span>
              </h2>
              <p className="mt-4 max-w-xl text-base text-white/50">
                Available for software engineering roles, AI agent development, healthcare integration architecture, and consulting in Canada.
              </p>
            </FadeChild>

            <FadeChild delay={0.15}>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="mailto:salehabbaas97@gmail.com"
                  className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                >
                  <Mail className="h-4 w-4" />
                  salehabbaas97@gmail.com
                </a>
                <a
                  href="tel:+14384513699"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5"
                >
                  <Phone className="h-4 w-4" />
                  (438) 451-3699
                </a>
              </div>
            </FadeChild>

            <FadeChild delay={0.25}>
              <div className="mt-6 flex items-center gap-3">
                {socialLinks.slice(0, 5).map((link) => {
                  const Icon = getSocialIcon(link.label);
                  return (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-white/10 p-2.5 transition-all hover:border-white/30 hover:bg-white/5"
                      aria-label={link.label}
                    >
                      <Icon className="h-4 w-4 text-white/50 transition-colors hover:text-white" />
                    </a>
                  );
                })}
              </div>
            </FadeChild>
          </div>
        </div>
      </Section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 md:px-8">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} Saleh Abbaas. All rights reserved.
          </p>
          <p className="flex items-center gap-1 text-xs text-white/30">
            Built with <Heart className="h-3 w-3 text-rose-400" /> Next.js &amp; Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ─── Helpers ─── */
function getSocialIcon(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("github")) return Github;
  if (lower.includes("linkedin")) return Linkedin;
  if (lower.includes("mail") || lower.includes("email")) return Mail;
  return Globe;
}
