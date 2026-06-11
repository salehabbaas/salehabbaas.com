"use client";

import Image from "next/image";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import {
  ArrowUp,
  ArrowUpRight,
  Briefcase,
  ChevronDown,
  Code2,
  Database,
  Github,
  Globe,
  GraduationCap,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Send,
  Server,
  Shield,
  Sparkles,
  Terminal,
  Youtube,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase/client";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";
import { cn } from "@/lib/utils";

type SocialLink = { label: string; url: string };
type PortfolioHomeProps = { socialLinks: SocialLink[] };

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
    accent: "from-cyan-500/20 via-sky-500/10 to-transparent",
  },
  {
    name: "AIPlace",
    tech: "Python · FastAPI · OpenCLIP · pgvector · Next.js",
    description: "Computer vision pipeline using OpenCLIP embeddings and pgvector cosine search. ~85ms p50 recognition latency from live camera frames.",
    accent: "from-blue-500/20 via-indigo-500/10 to-transparent",
  },
  {
    name: "Platr",
    tech: "TypeScript · Next.js · Flutter · Prisma · Stripe · Firebase",
    description: "Cross-platform food marketplace with JWT auth, Stripe payments, Firebase real-time sync, and Gemini AI recommendations.",
    accent: "from-emerald-500/20 via-teal-500/10 to-transparent",
  },
  {
    name: "DeepOncology",
    tech: "Python · PyTorch · TensorFlow",
    description: "V-Net architecture for 3D segmentation of PET/CT scans, tumour classification, and patient survival prediction.",
    accent: "from-orange-500/20 via-rose-500/10 to-transparent",
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

const EDUCATION = {
  degree: "B.S., Management Information Systems",
  school: "An Najah National University",
  period: "Sep 2014 to Dec 2018",
};

const ONLINE_SYSTEMS = [
  {
    name: "Artelo.ai",
    href: "https://artelo.ai",
    logo: "/artelo-ai-logo.png",
    eyebrow: "AR + AI tourism platform",
    description:
      "Augmented reality and AI discovery platform for landmarks and cultural destinations, with search, contextual guides, and natural-language tour assistance.",
    tags: ["AR Discovery", "AI Tour Guide", "Firebase AI Logic"],
  },
  {
    name: "ArteloQR",
    href: "https://artelo.ai/arteloqr",
    logo: "/arteloqr-logo.png",
    eyebrow: "Dynamic QR workspace",
    description:
      "Editable QR codes, digital business cards, mobile portfolio pages, and scan analytics with drafts, version history, and branded export workflows.",
    tags: ["Dynamic QR", "Digital Profiles", "Analytics"],
  },
];

const NAV_ITEMS = [
  { id: "hero", label: "Home" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "systems", label: "Systems" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
  { id: "contact", label: "Contact" },
];

function useTypewriter(texts: string[], speed = 60, pause = 2000) {
  const [display, setDisplay] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[textIndex];
    const timeout = deleting ? speed / 2 : speed;

    if (!deleting && charIndex === current.length) {
      const timer = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(timer);
    }

    if (deleting && charIndex === 0) {
      setDeleting(false);
      setTextIndex((previous) => (previous + 1) % texts.length);
      return;
    }

    const timer = setTimeout(() => {
      setCharIndex((previous) => previous + (deleting ? -1 : 1));
      setDisplay(current.slice(0, charIndex + (deleting ? -1 : 1)));
    }, timeout);

    return () => clearTimeout(timer);
  }, [charIndex, deleting, pause, speed, textIndex, texts]);

  return display;
}

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
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className={cn("relative mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28", className)}
    >
      {children}
    </motion.section>
  );
}

function FadeChild({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FloatingNav() {
  const [active, setActive] = useState("hero");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (!visibleEntries.length) return;
        const winner = visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        setActive(winner.target.id);
      },
      { rootMargin: "-25% 0px -45% 0px", threshold: [0.15, 0.35, 0.55] }
    );

    NAV_ITEMS.forEach(({ id }) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.nav
          initial={{ y: -70, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -70, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed left-1/2 top-4 z-50 hidden -translate-x-1/2 xl:block"
        >
          <div className="flex items-center gap-1 rounded-full border border-border/70 bg-card/80 px-2 py-1.5 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            {NAV_ITEMS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition",
                  active === id
                    ? "bg-foreground text-background"
                    : "text-foreground/60 hover:bg-primary/10 hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.nav>
      ) : null}
    </AnimatePresence>
  );
}

function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 32, mass: 0.2 });

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-[linear-gradient(90deg,hsl(var(--accent-strong)),hsl(var(--accent)),hsl(var(--primary)))]"
      style={{ scaleX }}
    />
  );
}

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          onClick={goToTop}
          initial={{ opacity: 0, y: 18, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.92 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="fixed bottom-6 right-5 z-[65] inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/25 bg-card/85 text-foreground shadow-[0_24px_60px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl hover:border-primary/40 hover:bg-primary/10 md:bottom-8 md:right-8"
          aria-label="Back to top"
        >
          <motion.span
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowUp className="h-5 w-5" />
          </motion.span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}

function GridBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.12),transparent_34%),radial-gradient(circle_at_85%_10%,hsl(var(--primary)/0.14),transparent_30%),radial-gradient(circle_at_50%_100%,hsl(var(--accent-strong)/0.08),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.18),transparent_30%),radial-gradient(circle_at_85%_10%,hsl(var(--primary)/0.18),transparent_28%),radial-gradient(circle_at_50%_100%,hsl(var(--accent-strong)/0.14),transparent_40%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--foreground)/0.04)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground)/0.04)_1px,transparent_1px)] bg-[size:70px_70px] dark:bg-[linear-gradient(hsl(var(--foreground)/0.05)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground)/0.05)_1px,transparent_1px)]" />
    </div>
  );
}

function getSocialIcon(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("youtube")) return Youtube;
  if (lower.includes("github")) return Github;
  if (lower.includes("linkedin")) return Linkedin;
  if (lower.includes("mail") || lower.includes("email")) return Mail;
  return Globe;
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[1.75rem] border border-border/70 bg-card/70 px-5 py-6 text-center shadow-[0_16px_50px_-35px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="bg-[linear-gradient(135deg,hsl(var(--accent-strong)),hsl(var(--primary)))] bg-clip-text font-display text-4xl font-bold text-transparent md:text-5xl">
        {value}
      </div>
      <div className="mt-2 text-sm text-foreground/65">{label}</div>
    </div>
  );
}

export function PortfolioHome({ socialLinks }: PortfolioHomeProps) {
  const typedText = useTypewriter(
    ["Software Engineer", "AI Systems Builder", "Healthcare Integration Specialist", "Cloud Architect", "Open Source Contributor"],
    70,
    2200
  );
  const [showAdminPanelLink, setShowAdminPanelLink] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0.18]);
  const heroScale = useTransform(scrollYProgress, [0, 0.72], [1, 0.96]);
  const heroY = useTransform(scrollYProgress, [0, 0.72], [0, 72]);
  const scrollCueOpacity = useTransform(scrollYProgress, [0, 0.18, 0.34], [0.95, 0.72, 0]);
  const scrollCueY = useTransform(scrollYProgress, [0, 0.34], [0, 18]);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      if (!user) {
        setShowAdminPanelLink(false);
        return;
      }

      try {
        const existingSession = await fetch("/api/admin/session", { method: "GET", cache: "no-store" });
        if (existingSession.ok) {
          if (active) setShowAdminPanelLink(true);
          return;
        }

        const idToken = await user.getIdToken();
        const repairedSession = await fetch("/api/admin/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        if (active) setShowAdminPanelLink(repairedSession.ok);
      } catch {
        if (active) setShowAdminPanelLink(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-transparent text-foreground">
      <GridBackground />
      <ScrollProgressBar />
      <FloatingNav />
      <BackToTopButton />

      <motion.div ref={heroRef} id="hero" style={{ opacity: heroOpacity, scale: heroScale, y: heroY }} className="relative z-10">
        <section className="relative flex min-h-[100dvh] items-center px-5 pb-24 pt-28 md:px-8 md:pb-28">
          <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,hsl(var(--accent)/0.18),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,hsl(var(--accent)/0.28),transparent_55%)]" />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-7 text-center lg:text-left">
              <FadeChild>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  Available for opportunities
                </div>
              </FadeChild>

              <FadeChild delay={0.06}>
                <div className="flex items-center justify-center gap-2 font-mono text-base text-primary/85 lg:justify-start md:text-lg">
                  <Terminal className="h-5 w-5" />
                  <span className="text-foreground/40">$</span>
                  <span>{typedText}</span>
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.65, repeat: Infinity, repeatType: "reverse" }}
                    className="inline-block h-5 w-[2px] bg-primary"
                  />
                </div>
              </FadeChild>

              <FadeChild delay={0.1}>
                <h1 className="text-balance font-display text-5xl font-bold tracking-tight text-foreground md:text-7xl lg:text-[5.4rem]">
                  Saleh Abbaas
                </h1>
              </FadeChild>

              <FadeChild delay={0.16}>
                <p className="mx-auto max-w-2xl text-base leading-8 text-foreground/68 lg:mx-0 md:text-lg">
                  Building production healthcare integrations, AI systems, and secure digital platforms with a focus on reliability,
                  interoperability, and measurable delivery.
                </p>
              </FadeChild>

              <FadeChild delay={0.22}>
                <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  <Button asChild size="lg" className="px-7">
                    <a href="#contact">
                      Get in touch
                      <Send className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="px-7">
                    <a href="#projects">
                      View projects
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </FadeChild>

              <FadeChild delay={0.28}>
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-foreground/58 lg:justify-start">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Ottawa, ON, Canada
                  </span>
                  <span>5+ years across healthcare, public health, and enterprise systems.</span>
                </div>
              </FadeChild>

              <FadeChild delay={0.34}>
                <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  {socialLinks.slice(0, 5).map((link) => {
                    const Icon = getSocialIcon(link.label);
                    return (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/75 text-foreground/55 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.3)] transition hover:border-primary/30 hover:bg-primary/10 hover:text-foreground"
                        aria-label={link.label}
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </div>
              </FadeChild>
            </div>

            <FadeChild delay={0.12} className="mx-auto w-full max-w-[30rem]">
              <div className="relative">
                <div className="absolute -inset-6 rounded-[3rem] bg-[radial-gradient(circle_at_top,hsl(var(--accent)/0.25),transparent_58%)] blur-3xl dark:bg-[radial-gradient(circle_at_top,hsl(var(--accent)/0.38),transparent_58%)]" />
                <div className="relative overflow-hidden rounded-[2.5rem] border border-border/70 bg-card/80 p-4 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.55)] backdrop-blur-xl">
                  <div className="relative aspect-[4/4.8] overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,hsl(var(--primary)/0.16),transparent_28%),linear-gradient(135deg,hsl(var(--accent)/0.1),hsl(var(--background)))]">
                    <Image
                      src="/SalehAbbaas.jpeg"
                      alt="Saleh Abbaas portrait"
                      fill
                      priority
                      sizes="(min-width: 1024px) 34rem, (min-width: 768px) 28rem, 84vw"
                      className="object-cover object-top"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/55 via-background/10 to-transparent" />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      "HL7/FHIR integrations",
                      "Clinical data platforms",
                      "AI-enabled product systems",
                      "Cloud-ready delivery",
                    ].map((item) => (
                      <div key={item} className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-foreground/72">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeChild>
          </div>

          <motion.div
            aria-hidden="true"
            style={{ opacity: scrollCueOpacity, y: scrollCueY }}
            className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center md:bottom-10"
          >
            <div className="flex flex-col items-center gap-2 rounded-full border border-border/60 bg-card/65 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-foreground/42 backdrop-blur-xl">
              <span>Scroll</span>
              <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            </div>
          </motion.div>
        </section>
      </motion.div>

      <Section id="stats" className="z-10 py-8 md:py-12">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <FadeChild><StatCard value="5+" label="Years Experience" /></FadeChild>
          <FadeChild delay={0.06}><StatCard value="3" label="Organizations" /></FadeChild>
          <FadeChild delay={0.12}><StatCard value="10+" label="Hospital Systems" /></FadeChild>
          <FadeChild delay={0.18}><StatCard value="3,000+" label="Platform Users" /></FadeChild>
        </div>
      </Section>

      <Section id="experience" className="z-10">
        <FadeChild>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Career</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Experience</h2>
          <p className="mt-3 max-w-2xl text-base text-foreground/58">
            5+ years building production systems across healthcare, public health, and enterprise environments.
          </p>
        </FadeChild>

        <div className="relative mt-14">
          <div className="absolute left-4 top-0 hidden h-full w-px bg-gradient-to-b from-primary/40 via-primary/10 to-transparent md:block" />
          <div className="space-y-8 md:space-y-10">
            {EXPERIENCES.map((experience, index) => (
              <FadeChild key={experience.company} delay={index * 0.08}>
                <div className="relative md:pl-16">
                  <div className="absolute left-[9px] top-8 hidden h-4 w-4 rounded-full border border-primary/30 bg-background shadow-[0_0_0_6px_hsl(var(--accent)/0.1)] md:block" />
                  <article className="rounded-[2rem] border border-border/70 bg-card/72 p-6 shadow-[0_22px_70px_-45px_rgba(15,23,42,0.35)] backdrop-blur">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-foreground md:text-2xl">{experience.role}</h3>
                        <p className="mt-1 text-base font-medium text-primary">{experience.company}</p>
                      </div>
                      <div className="text-left md:text-right">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-foreground/58">
                          <Briefcase className="h-3 w-3" />
                          {experience.period}
                        </span>
                        <p className="mt-2 inline-flex items-center gap-1 text-xs text-foreground/45">
                          <MapPin className="h-3 w-3" />
                          {experience.location}
                        </p>
                      </div>
                    </div>
                    <ul className="mt-5 space-y-3">
                      {experience.highlights.map((highlight) => (
                        <li key={highlight} className="flex gap-3 text-sm leading-relaxed text-foreground/62">
                          <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </div>
              </FadeChild>
            ))}
          </div>
        </div>
      </Section>

      <Section id="projects" className="z-10">
        <FadeChild>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Work</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Featured Projects</h2>
          <p className="mt-3 max-w-2xl text-base text-foreground/58">
            Open source and production systems spanning AI agents, computer vision, and full-stack platforms.
          </p>
        </FadeChild>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {PROJECTS.map((project, index) => (
            <FadeChild key={project.name} delay={index * 0.08}>
              <motion.article
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                className="group relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/72 p-6 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.35)] backdrop-blur"
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", project.accent)} />
                <div className="relative">
                  <div className="absolute right-0 top-0 rounded-full border border-border/60 bg-background/65 p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <ArrowUpRight className="h-4 w-4 text-foreground/60" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{project.name}</h3>
                  <p className="mt-1 font-mono text-xs text-foreground/42">{project.tech}</p>
                  <p className="mt-4 text-sm leading-relaxed text-foreground/64">{project.description}</p>
                </div>
              </motion.article>
            </FadeChild>
          ))}
        </div>
      </Section>

      <Section id="systems" className="z-10">
        <FadeChild>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Product Systems</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">What I Built Online Systems</h2>
          <p className="mt-3 max-w-2xl text-base text-foreground/58">
            Public products and digital systems built for interactive discovery, branded identity, and real-world usage.
          </p>
        </FadeChild>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {ONLINE_SYSTEMS.map((system, index) => (
            <FadeChild key={system.name} delay={index * 0.08}>
              <motion.a
                href={system.href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                className="group flex h-full flex-col rounded-[2rem] border border-border/70 bg-card/75 p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.38)] backdrop-blur"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-[1.5rem] border border-border/70 bg-background/75 p-4">
                    <Image src={system.logo} alt={`${system.name} logo`} width={150} height={54} className="h-10 w-auto object-contain" />
                  </div>
                  <div className="rounded-full border border-primary/20 bg-primary/10 p-2 text-primary transition group-hover:translate-x-1 group-hover:-translate-y-1">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-primary">{system.eyebrow}</p>
                <h3 className="mt-2 text-2xl font-bold text-foreground">{system.name}</h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-foreground/64">{system.description}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {system.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-foreground/58">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.a>
            </FadeChild>
          ))}
        </div>
      </Section>

      <Section id="skills" className="z-10">
        <FadeChild>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Expertise</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Technical Skills</h2>
        </FadeChild>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SKILL_CATEGORIES.map((category, index) => {
            const CategoryIcon = category.icon;

            return (
              <FadeChild key={category.title} delay={index * 0.06}>
                <article className="rounded-[2rem] border border-border/70 bg-card/72 p-6 shadow-[0_22px_70px_-45px_rgba(15,23,42,0.35)] backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
                      <CategoryIcon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">{category.title}</h3>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {category.items.map((item) => (
                      <span
                        key={item}
                        className="rounded-md border border-border/70 bg-background/70 px-2.5 py-1 text-xs text-foreground/58 transition-colors hover:border-primary/20 hover:text-foreground/78"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </article>
              </FadeChild>
            );
          })}
        </div>
      </Section>

      <Section id="certifications" className="z-10 pb-10 md:pb-14">
        <FadeChild>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Credentials</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Certifications</h2>
        </FadeChild>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CERTIFICATIONS.map((certification, index) => (
            <FadeChild key={certification.name} delay={index * 0.06}>
              <article className="flex items-start gap-4 rounded-[1.75rem] border border-border/70 bg-card/72 p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.32)] backdrop-blur">
                <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{certification.name}</h3>
                  <p className="mt-1 text-xs text-foreground/52">{certification.org}</p>
                  {certification.year ? <p className="mt-1 text-xs text-foreground/36">{certification.year}</p> : null}
                </div>
              </article>
            </FadeChild>
          ))}
        </div>
      </Section>

      <Section id="education" className="z-10 pt-0">
        <FadeChild>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Education</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Academic Foundation</h2>
        </FadeChild>

        <FadeChild delay={0.08}>
          <article className="mt-10 rounded-[2rem] border border-border/70 bg-card/75 p-7 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.34)] backdrop-blur md:p-8">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{EDUCATION.degree}</h3>
                <p className="mt-1 text-sm text-foreground/58">
                  {EDUCATION.school} — {EDUCATION.period}
                </p>
              </div>
            </div>
          </article>
        </FadeChild>
      </Section>

      <Section id="contact" className="z-10 pt-10">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-border/70 bg-card/75 p-8 shadow-[0_34px_90px_-48px_rgba(15,23,42,0.42)] backdrop-blur md:p-14">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-[90px]" />
          <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-accent/10 blur-[90px]" />

          <div className="relative z-10">
            <FadeChild>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Connect</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">
                Let&apos;s build something
                <br />
                <span className="bg-[linear-gradient(135deg,hsl(var(--accent-strong)),hsl(var(--primary)))] bg-clip-text text-transparent">
                  together.
                </span>
              </h2>
              <p className="mt-4 max-w-2xl text-base text-foreground/60">
                Available for software engineering roles, AI agent development, healthcare integration architecture, and consulting in Canada.
              </p>
            </FadeChild>

            <FadeChild delay={0.1}>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="mailto:salehabbaas97@gmail.com"
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:opacity-92"
                >
                  <Mail className="h-4 w-4" />
                  salehabbaas97@gmail.com
                </a>
                <a
                  href="tel:+14384513699"
                  className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/65 px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:bg-primary/10"
                >
                  <Phone className="h-4 w-4" />
                  (438) 451-3699
                </a>
              </div>
            </FadeChild>

            <FadeChild delay={0.16}>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {socialLinks.slice(0, 5).map((link) => {
                  const Icon = getSocialIcon(link.label);
                  return (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background/70 text-foreground/55 transition hover:border-primary/30 hover:bg-primary/10 hover:text-foreground"
                      aria-label={link.label}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </FadeChild>

            {showAdminPanelLink ? (
              <FadeChild delay={0.22}>
                <div className="mt-10 rounded-[1.75rem] border border-primary/20 bg-primary/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Admin Access</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                    <p className="max-w-xl text-sm leading-7 text-foreground/65">
                      Your admin session is active. Open the CMS directly from the public site.
                    </p>
                    <Button asChild variant="outline" className="border-primary/25 bg-background/70">
                      <Link href="/admin">
                        Open CMS
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </FadeChild>
            ) : null}
          </div>
        </div>
      </Section>

      <footer className="relative z-10 border-t border-border/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 md:px-8">
          <p className="text-xs text-foreground/40">© {new Date().getFullYear()} Saleh Abbaas. All rights reserved.</p>
          <p className="text-xs text-foreground/40">Software engineering, AI systems, and healthcare interoperability.</p>
        </div>
      </footer>
    </div>
  );
}
