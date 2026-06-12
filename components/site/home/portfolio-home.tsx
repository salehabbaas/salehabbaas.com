"use client";

import Image from "next/image";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import {
  ArrowUp,
  ArrowUpRight,
  Briefcase,
  CalendarDays,
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

const BOOK_MEETING_URL = "https://calendly.com/saleh-artelo/30min";

const EXPERIENCES = [
  {
    period: "Dec 2024 — Sep 2025",
    role: "Software Engineer",
    company: "The Ottawa Hospital",
    location: "Ottawa, ON",
    highlights: [
      "Engineered HL7 v2 and FHIR R4 integration workflows in Rhapsody, routing high-volume clinical messages across more than 10 enterprise clinical systems",
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
    color: "from-violet-500/18 to-fuchsia-500/14 dark:from-violet-500/20 dark:to-purple-600/20",
    border: "border-violet-500/25 dark:border-violet-500/30",
  },
  {
    name: "AIPlace",
    tech: "Python · FastAPI · OpenCLIP · pgvector · Next.js",
    description: "Computer vision pipeline using OpenCLIP embeddings and pgvector cosine search. ~85ms p50 recognition latency from live camera frames.",
    color: "from-blue-500/18 to-cyan-500/14 dark:from-blue-500/20 dark:to-cyan-500/20",
    border: "border-blue-500/25 dark:border-blue-500/30",
  },
  {
    name: "Platr",
    tech: "TypeScript · Next.js · Flutter · Prisma · Stripe · Firebase",
    description: "Cross-platform food marketplace with JWT auth, Stripe payments, Firebase real-time sync, and Gemini AI recommendations.",
    color: "from-emerald-500/18 to-teal-500/14 dark:from-emerald-500/20 dark:to-teal-500/20",
    border: "border-emerald-500/25 dark:border-emerald-500/30",
  },
  {
    name: "DeepOncology",
    tech: "Python · PyTorch · TensorFlow",
    description: "V-Net architecture for 3D segmentation of PET/CT scans, tumour classification, and patient survival prediction.",
    color: "from-rose-500/18 to-orange-500/14 dark:from-rose-500/20 dark:to-orange-500/20",
    border: "border-rose-500/25 dark:border-rose-500/30",
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

const STATS: Array<{ value: number; prefix?: string; suffix?: string; label: string }> = [
  { value: 5, suffix: "+", label: "Years Experience" },
  { value: 3, suffix: "", label: "Organizations" },
  { value: 10, suffix: "+", label: "Enterprise Systems" },
  { value: 3000, suffix: "+", label: "Platform Users" },
];

const NAV_ITEMS = [
  { id: "hero", label: "Home" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
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
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length) {
          const sorted = visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          setActive(sorted[0].target.id);
        }
      },
      { rootMargin: "-30% 0px -40% 0px", threshold: [0.1, 0.3, 0.5] }
    );

    NAV_ITEMS.forEach(({ id }) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.nav
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed left-1/2 top-4 z-50 hidden -translate-x-1/2 lg:block"
        >
          <div className="flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/80 px-2 py-1.5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-black/70">
            {NAV_ITEMS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium tracking-wide transition-all duration-300",
                  active === id
                    ? "bg-slate-950 text-white shadow-lg dark:bg-white dark:text-black"
                    : "text-slate-500 hover:text-slate-950 dark:text-white/60 dark:hover:text-white"
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
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500"
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

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          initial={{ opacity: 0, y: 14, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.94 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          className="fixed bottom-6 right-5 z-[65] inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-300/70 bg-white/80 text-slate-950 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-white/12 dark:bg-black/70 dark:text-white md:bottom-8 md:right-8"
          aria-label="Back to top"
        >
          <motion.span animate={{ y: [0, -2, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
            <ArrowUp className="h-5 w-5" />
          </motion.span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}

function CountUp({
  value,
  prefix = "",
  suffix = "",
  duration = 1.6,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setDisplayValue(value);
      return;
    }

    const totalSteps = Math.max(20, Math.round(duration * 30));
    const intervalMs = (duration * 1000) / totalSteps;
    let currentStep = 0;
    let delayTimer = 0;
    let intervalId = 0;

    const beginAnimation = () => {
      intervalId = window.setInterval(() => {
        currentStep += 1;
        const progress = Math.min(currentStep / totalSteps, 1);
        const eased = 1 - (1 - progress) ** 3;
        setDisplayValue(Math.round(value * eased));

        if (progress >= 1) {
          window.clearInterval(intervalId);
        }
      }, intervalMs);
    };

    delayTimer = window.setTimeout(beginAnimation, 250);

    return () => {
      window.clearTimeout(delayTimer);
      window.clearInterval(intervalId);
    };
  }, [duration, reduced, value]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

function HeroScrollCue() {
  return (
    <motion.button
      type="button"
      onClick={() => document.getElementById("stats")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      className="absolute bottom-5 left-1/2 z-20 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/88 text-slate-950 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.45)] backdrop-blur-xl transition dark:border-white/10 dark:bg-black/60 dark:text-white sm:bottom-7"
      aria-label="Scroll to numbers section"
    >
      <motion.span
        animate={{ y: [0, 4, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white dark:bg-white dark:text-black"
      >
        <span className="text-lg leading-none">↓</span>
      </motion.span>
    </motion.button>
  );
}

function GridBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute inset-0 bg-[hsl(210,40%,98%)] dark:bg-[hsl(225,50%,4%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:64px_64px] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.12),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.08),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.06),transparent_50%)]" />
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

export function PortfolioHome({ socialLinks }: PortfolioHomeProps) {
  const typedText = useTypewriter(
    ["Software Engineer", "AI Systems Builder", "Healthcare Integration Specialist", "Cloud Architect", "Open Source Contributor"],
    70,
    2200
  );
  const [showAdminPanelLink, setShowAdminPanelLink] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.7], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.7], [0, 80]);
  const scrollOpacity = useTransform(scrollYProgress, [0, 0.18, 0.3], [1, 0.8, 0]);

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
    <div className="relative min-h-screen bg-slate-50 text-slate-950 dark:bg-[hsl(225,50%,4%)] dark:text-white">
      <GridBackground />
      <ScrollProgressBar />
      <FloatingNav />
      <BackToTopButton />

      <motion.div ref={heroRef} id="hero" style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}>
        <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-5 pt-14">
          <div className="absolute left-[10%] top-[20%] h-72 w-72 rounded-full bg-cyan-500/12 blur-[100px] dark:bg-cyan-500/10" />
          <div className="absolute bottom-[20%] right-[10%] h-96 w-96 rounded-full bg-violet-500/10 blur-[120px] dark:bg-violet-500/8" />

          <div className="relative z-10 flex flex-col items-center gap-8 pb-24 text-center">
            <FadeChild>
              <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="relative">
                <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 opacity-70 blur-md" />
                <div className="relative h-44 w-44 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-100 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] dark:border-white/15 dark:bg-white/5 md:h-56 md:w-56">
                  <Image
                    src="/SalehAbbaas.jpeg"
                    alt="Saleh Abbaas"
                    fill
                    priority
                    sizes="(min-width: 768px) 224px, 176px"
                    className="object-cover object-top"
                  />
                </div>
              </motion.div>
            </FadeChild>

            <FadeChild delay={0.1}>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Available for opportunities</span>
              </div>
            </FadeChild>

            <FadeChild delay={0.15}>
              <h1 className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-500 bg-clip-text font-display text-5xl font-bold tracking-tight text-transparent dark:from-white dark:via-white dark:to-white/60 md:text-7xl lg:text-8xl">
                Saleh Abbaas
              </h1>
            </FadeChild>

            <FadeChild delay={0.2}>
              <div className="flex items-center gap-2 font-mono text-lg text-cyan-700 dark:text-cyan-300 md:text-xl">
                <Terminal className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
                <span className="text-slate-400 dark:text-white/40">$</span>
                <span>{typedText}</span>
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                  className="inline-block h-5 w-[2px] bg-cyan-500 dark:bg-cyan-400"
                />
              </div>
            </FadeChild>

            <FadeChild delay={0.25}>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-white/50">
                <MapPin className="h-4 w-4" />
                <span>Ottawa, ON, Canada</span>
              </div>
            </FadeChild>

            <FadeChild delay={0.3}>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#contact"
                  className="group inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-[0_0_30px_rgba(15,23,42,0.18)] dark:bg-white dark:text-black dark:hover:bg-white/90 dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  Get in touch
                  <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <a
                  href="#projects"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-900 transition-all hover:border-slate-400 hover:bg-white dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:border-white/40 dark:hover:bg-white/5"
                >
                  View projects
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <a
                  href={BOOK_MEETING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-6 py-3 text-sm font-semibold text-cyan-700 transition-all hover:bg-cyan-500/15 dark:text-cyan-200"
                >
                  Book a Meeting with Saleh
                  <CalendarDays className="h-4 w-4" />
                </a>
              </div>
            </FadeChild>

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
                      className="group rounded-full border border-slate-200 bg-white/75 p-2.5 transition-all hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/30 dark:hover:bg-white/5"
                      aria-label={link.label}
                    >
                      <Icon className="h-4 w-4 text-slate-500 transition-colors group-hover:text-slate-950 dark:text-white/50 dark:group-hover:text-white" />
                    </a>
                  );
                })}
              </div>
            </FadeChild>
          </div>
          <motion.div style={{ opacity: scrollOpacity }}>
            <HeroScrollCue />
          </motion.div>
        </section>
      </motion.div>

      <Section id="stats" className="pt-14 md:pt-18 pb-10 md:pb-14">
        <motion.div>
          <FadeChild>
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/75 p-6 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.03] md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-400">By The Numbers</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">A quick snapshot before the timeline</h2>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-slate-500 dark:text-white/55">
                Core delivery metrics from healthcare, public health, and enterprise software work. This section stays separate, but it leads directly into the full experience timeline.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {STATS.map((stat, index) => (
                <FadeChild key={stat.label} delay={index * 0.08}>
                  <div className="rounded-[1.6rem] border border-slate-200/75 bg-slate-50/85 p-5 text-center transition-transform duration-300 hover:-translate-y-1 dark:border-white/[0.08] dark:bg-white/[0.03]">
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text font-display text-3xl font-bold text-transparent dark:from-cyan-300 dark:to-blue-400 md:text-4xl">
                      <CountUp value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                    </div>
                    <div className="mt-2 text-sm text-slate-500 dark:text-white/50">{stat.label}</div>
                  </div>
                </FadeChild>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-6 hidden h-14 w-px bg-gradient-to-b from-cyan-500/60 via-blue-500/35 to-transparent md:block" />
          </FadeChild>
        </motion.div>
      </Section>

      <Section id="experience">
        <FadeChild>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-400">Career</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Experience</h2>
          <p className="mt-3 max-w-2xl text-base text-slate-500 dark:text-white/50">
            5+ years building production systems across healthcare, public health, and enterprise environments.
          </p>
        </FadeChild>

        <div className="relative mt-16">
          <div className="absolute left-0 top-0 hidden h-full w-px bg-gradient-to-b from-cyan-500/50 via-blue-500/30 to-transparent md:left-8 md:block" />

          <div className="space-y-12">
            {EXPERIENCES.map((experience, index) => (
              <FadeChild key={experience.company} delay={index * 0.15}>
                <div className="group relative md:pl-20">
                  <div className="absolute left-0 top-1 hidden h-4 w-4 md:left-[25px] md:block">
                    <div className="absolute inset-0 rounded-full bg-cyan-400/30 transition-all group-hover:scale-150 group-hover:bg-cyan-400/50" />
                    <div className="absolute inset-[3px] rounded-full bg-cyan-500 dark:bg-cyan-400" />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 backdrop-blur-sm transition-all duration-500 hover:border-slate-300 hover:bg-white md:p-8 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/[0.12] dark:hover:bg-white/[0.04]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-950 dark:text-white md:text-2xl">{experience.role}</h3>
                        <p className="mt-1 text-base font-medium text-cyan-600 dark:text-cyan-300">{experience.company}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                          <Briefcase className="h-3 w-3" />
                          {experience.period}
                        </span>
                        <p className="mt-1 flex items-center justify-end gap-1 text-xs text-slate-400 dark:text-white/40">
                          <MapPin className="h-3 w-3" />
                          {experience.location}
                        </p>
                      </div>
                    </div>
                    <ul className="mt-5 space-y-3">
                      {experience.highlights.map((highlight, itemIndex) => (
                        <li key={itemIndex} className="flex gap-3 text-sm leading-relaxed text-slate-600 dark:text-white/60">
                          <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-500/70 dark:text-cyan-400/60" />
                          <span>{highlight}</span>
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

      <Section id="projects">
        <FadeChild>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-600 dark:text-violet-400">Work</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Featured Projects</h2>
          <p className="mt-3 max-w-2xl text-base text-slate-500 dark:text-white/50">
            Open source and production systems spanning AI agents, computer vision, and full-stack platforms.
          </p>
        </FadeChild>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {PROJECTS.map((project, index) => (
            <FadeChild key={project.name} delay={index * 0.1}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 transition-all duration-500 hover:shadow-2xl md:p-8",
                  project.border,
                  project.color
                )}
              >
                <div className="absolute right-4 top-4 rounded-full border border-slate-200 p-2 opacity-0 transition-opacity group-hover:opacity-100 dark:border-white/10">
                  <ArrowUpRight className="h-4 w-4 text-slate-500 dark:text-white/60" />
                </div>
                <h3 className="text-xl font-bold text-slate-950 dark:text-white">{project.name}</h3>
                <p className="mt-1 font-mono text-xs text-slate-500 dark:text-white/40">{project.tech}</p>
                <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-white/60">{project.description}</p>
              </motion.div>
            </FadeChild>
          ))}
        </div>
      </Section>

      <Section id="skills">
        <FadeChild>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">Expertise</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Technical Skills</h2>
        </FadeChild>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SKILL_CATEGORIES.map((category, index) => {
            const CategoryIcon = category.icon;
            return (
              <FadeChild key={category.title} delay={index * 0.08}>
                <div className="group rounded-2xl border border-slate-200 bg-white/80 p-6 transition-all duration-500 hover:border-slate-300 hover:bg-white dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/[0.12] dark:hover:bg-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/5">
                      <CategoryIcon className="h-5 w-5 text-slate-700 dark:text-white/70" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-950 dark:text-white">{category.title}</h3>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {category.items.map((item) => (
                      <span
                        key={item}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-white/50 dark:hover:border-white/20 dark:hover:text-white/70"
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

      <Section id="certifications" className="pb-14">
        <FadeChild>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400">Credentials</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Certifications</h2>
        </FadeChild>

        <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CERTIFICATIONS.map((certification, index) => (
            <FadeChild key={certification.name} delay={index * 0.08}>
              <div className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5 transition-all duration-500 hover:border-slate-300 hover:bg-white dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/[0.12] dark:hover:bg-white/[0.04]">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2">
                  <GraduationCap className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{certification.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-white/40">{certification.org}</p>
                  {certification.year ? <p className="mt-0.5 text-xs text-slate-400 dark:text-white/30">{certification.year}</p> : null}
                </div>
              </div>
            </FadeChild>
          ))}
        </div>
      </Section>

      <Section id="education" className="pt-0">
        <FadeChild>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">Education</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Academic Foundation</h2>
        </FadeChild>

        <FadeChild delay={0.12}>
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white/80 p-6 dark:border-white/[0.06] dark:bg-white/[0.02] md:p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2">
                <GraduationCap className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-950 dark:text-white">{EDUCATION.degree}</h3>
                <p className="text-sm text-slate-500 dark:text-white/40">
                  {EDUCATION.school} — {EDUCATION.period}
                </p>
              </div>
            </div>
          </div>
        </FadeChild>
      </Section>

      <Section id="systems" className="pt-0">
        <FadeChild>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-fuchsia-600 dark:text-fuchsia-400">Product Systems</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">What I Built Online Systems</h2>
          <p className="mt-3 max-w-2xl text-base text-slate-500 dark:text-white/50">
            Live systems built for public use, interactive product experiences, and branded digital workflows.
          </p>
        </FadeChild>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {ONLINE_SYSTEMS.map((system, index) => (
            <FadeChild key={system.name} delay={index * 0.1}>
              <motion.a
                href={system.href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white/82 p-6 transition-all duration-500 hover:border-slate-300 hover:bg-white hover:shadow-2xl dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/[0.12] dark:hover:bg-white/[0.04] md:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <Image src={system.logo} alt={`${system.name} logo`} width={152} height={56} className="h-10 w-auto object-contain" />
                  </div>
                  <div className="rounded-full border border-slate-200 p-2 opacity-0 transition-opacity group-hover:opacity-100 dark:border-white/10">
                    <ArrowUpRight className="h-4 w-4 text-slate-500 dark:text-white/60" />
                  </div>
                </div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-fuchsia-600 dark:text-fuchsia-400">{system.eyebrow}</p>
                <h3 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{system.name}</h3>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600 dark:text-white/60">{system.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {system.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-white/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.a>
            </FadeChild>
          ))}
        </div>
      </Section>

      <Section id="contact">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-500/8 via-blue-500/5 to-violet-500/10 p-8 dark:border-white/[0.08] dark:from-cyan-500/10 dark:via-blue-500/5 dark:to-violet-500/10 md:p-14">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-500/10 blur-[80px]" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-violet-500/10 blur-[80px]" />

          <div className="relative z-10">
            <FadeChild>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-400">Connect</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white md:text-5xl">
                Let&apos;s build something
                <br />
                <span className="bg-gradient-to-r from-cyan-500 to-violet-500 bg-clip-text text-transparent dark:from-cyan-300 dark:to-violet-400">
                  together.
                </span>
              </h2>
              <p className="mt-4 max-w-xl text-base text-slate-600 dark:text-white/50">
                Available for software engineering roles, AI agent development, healthcare integration architecture, and consulting in Canada.
              </p>
            </FadeChild>

            <FadeChild delay={0.15}>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="mailto:salehabbaas97@gmail.com"
                  className="group inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-all hover:shadow-[0_0_30px_rgba(15,23,42,0.16)] dark:bg-white dark:text-black dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                >
                  <Mail className="h-4 w-4" />
                  salehabbaas97@gmail.com
                </a>
                <a
                  href="tel:+14384513699"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/75 px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:border-slate-400 hover:bg-white dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:border-white/40 dark:hover:bg-white/5"
                >
                  <Phone className="h-4 w-4" />
                  (438) 451-3699
                </a>
                <a
                  href={BOOK_MEETING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-6 py-3 text-sm font-semibold text-cyan-700 transition-all hover:bg-cyan-500/15 dark:text-cyan-200"
                >
                  <CalendarDays className="h-4 w-4" />
                  Book a Meeting with Saleh
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
                      className="rounded-full border border-slate-200 bg-white/75 p-2.5 transition-all hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/30 dark:hover:bg-white/5"
                      aria-label={link.label}
                    >
                      <Icon className="h-4 w-4 text-slate-500 transition-colors hover:text-slate-950 dark:text-white/50 dark:hover:text-white" />
                    </a>
                  );
                })}
              </div>
            </FadeChild>

            {showAdminPanelLink ? (
              <FadeChild delay={0.32}>
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/8 p-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-700 dark:text-cyan-300">Admin Access</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-white/60">
                      Your admin session is active. Open the CMS directly from the public site.
                    </p>
                  </div>
                  <Button asChild variant="outline" className="border-cyan-400/30 bg-white/70 dark:bg-white/5">
                    <Link href="/admin">
                      Open CMS
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </FadeChild>
            ) : null}
          </div>
        </div>
      </Section>

      <footer className="relative z-10 border-t border-slate-200 py-8 dark:border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 md:px-8">
          <p className="text-xs text-slate-500 dark:text-white/30">© {new Date().getFullYear()} Saleh Abbaas. All rights reserved.</p>
          <p className="text-xs text-slate-500 dark:text-white/30">Software engineering, AI systems, and healthcare interoperability.</p>
        </div>
      </footer>
    </div>
  );
}
