import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Award, Globe, GraduationCap, Languages, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";

import { HomeIntroShell } from "@/components/site/home/home-intro-shell";
import { HomeSectionsShowcase } from "@/components/site/home/home-sections-showcase";
import { SiteFooterClient } from "@/components/site/site-footer-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { keywords as resumeKeywords } from "@/lib/data/resume";
import { safeExperiences, safeProfile, safeSocialLinks } from "@/lib/firestore/site-public";
import { buildPageMetadata, pageSchema } from "@/lib/seo/metadata";

export const revalidate = 300;

const HOME_DESCRIPTION =
  "Saleh Abbaas (Saleh Abbas) is an Ottawa-based software engineer specializing in AI agents, healthcare interoperability (HL7/FHIR), cybersecurity, and AI news content creation.";
const HOME_KEYWORDS = [
  "Saleh Abbaas",
  "Saleh Abbas",
  "Saleh Ottawa",
  "Saleh Abbaas Ottawa",
  "Saleh Abbaas software engineer",
  "Applied AI engineer Canada",
  "Healthcare interoperability HL7 FHIR DICOM",
  "Ottawa healthcare software engineer",
  "AI news content creator",
  "Cloud healthcare systems",
  ...resumeKeywords
];

const homeMetadata = buildPageMetadata({
  title: "Home",
  description: HOME_DESCRIPTION,
  path: "/",
  keywords: HOME_KEYWORDS
});

export const metadata: Metadata = homeMetadata;

export default async function HomePage() {
  const [profile, experiences, socialLinks] = await Promise.all([safeProfile(), safeExperiences(), safeSocialLinks()]);

  const companies = [...new Set(experiences.map((entry) => entry.company).filter(Boolean))].slice(0, 4);
  const slideSocialLinks = socialLinks.map((link) => ({ label: link.label, url: link.url }));

  const webPageJsonLd = pageSchema({
    title: "Home",
    description: HOME_DESCRIPTION,
    path: "/",
    keywords: HOME_KEYWORDS
  });

  return (
    <>
      <HomeSectionsShowcase>
        <HomeIntroShell profileLocation={profile?.location} companies={companies} socialLinks={slideSocialLinks} />
        <MissionSection />
        <ExperienceSection />
        <SkillsAndCertsSection />
        <ServicesSection />
        <ContactSection socialLinks={socialLinks} />
        <HomeFooterSection socialLinks={socialLinks} />
      </HomeSectionsShowcase>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </>
  );
}

function MissionSection() {
  const pillars = [
    {
      label: "Mission",
      value: "AI-driven cloud systems with real impact",
      detail: "Build systems that improve decisions, collaboration, and operational outcomes in healthcare and enterprise settings.",
      icon: Sparkles
    },
    {
      label: "Focus",
      value: "Healthcare + Public-Sector Technology",
      detail: "Interoperability, analytics, and secure delivery in clinically and operationally complex environments.",
      icon: Stethoscope
    },
    {
      label: "Approach",
      value: "Clarity, Reliability, and Scale",
      detail: "Start from people and constraints, then design production-ready systems that teams can trust.",
      icon: ShieldCheck
    }
  ];

  return (
    <section className="container space-y-6">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.22em] text-primary">Mission</p>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Building systems that matter</h2>
        <p className="max-w-4xl text-sm text-foreground/75 md:text-base">
          I connect technology, data, and people to turn complexity into reliable software. My work combines applied AI, healthcare integration,
          cloud engineering, and pragmatic delivery.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {pillars.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-border/70 bg-card/85 shadow-elev1 backdrop-blur">
              <CardContent className="space-y-3 p-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-card/80">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{item.label}</p>
                <p className="text-xl font-semibold text-foreground">{item.value}</p>
                <p className="text-sm text-foreground/70">{item.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function ExperienceSection() {
  const timeline = [
    {
      period: "Dec 2024 - Sep 2025",
      company: "The Ottawa Hospital",
      role: "Programmer Analyst",
      points: [
        "Designed and maintained Rhapsody/Epic integrations using HL7 standards.",
        "Improved incident and change operations with ServiceNow workflows.",
        "Built Power BI dashboards for integration health and KPIs."
      ]
    },
    {
      period: "Jul 2024 - Dec 2024",
      company: "Arab Hospitals Group",
      role: "Senior Software Engineer",
      points: [
        "Led AI-enabled cloud healthcare system delivery.",
        "Implemented HL7/FHIR/DICOM APIs for HIS and external platforms.",
        "Advanced clinical workflow reliability and interoperability."
      ]
    },
    {
      period: "Jul 2023 - Jun 2024",
      company: "Arab Hospitals Group",
      role: "Software Engineer",
      points: [
        "Delivered production backend APIs for HIS integrations.",
        "Built AI speech-to-text for clinical note transcription.",
        "Enhanced PACS accessibility and cross-facility collaboration."
      ]
    },
    {
      period: "Jul 2022 - Dec 2023",
      company: "World Health Organization",
      role: "Information Technology Programmer",
      points: [
        "Built digital health data collection systems for reporting quality.",
        "Integrated health platforms and databases for unified analytics.",
        "Resolved DHIS2 issues and delivered Power BI decision dashboards."
      ]
    }
  ];

  return (
    <section className="container space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Experience</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Career timeline and delivery record</h2>
          <p className="text-sm text-foreground/70">From support operations to senior healthcare engineering and AI-driven system delivery.</p>
        </div>
        <Button asChild variant="outline" className="border-border/80 bg-card/75 text-foreground hover:bg-card/80">
          <Link href="/experience">
            View full experience
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {timeline.map((item) => (
          <Card key={`${item.company}-${item.role}-${item.period}`} className="border-border/70 bg-card/80 shadow-elev1 backdrop-blur">
            <CardContent className="space-y-3 p-5">
              <Badge variant="secondary" className="border-border/70 bg-card/80 text-foreground">
                {item.period}
              </Badge>
              <h3 className="text-xl font-semibold text-foreground">{item.role}</h3>
              <p className="text-sm font-medium text-primary">{item.company}</p>
              <ul className="space-y-2 text-sm text-foreground/75">
                {item.points.map((point) => (
                  <li key={point}>- {point}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function SkillsAndCertsSection() {
  const skills = [
    "Computer Information Systems",
    "IT Development",
    "Cybersecurity",
    "HL7 / FHIR / DICOM",
    "Rhapsody Integration Engine",
    "Epic Health System",
    "Power BI",
    "Cloud-Based Architectures",
    "DHIS2",
    "ServiceNow"
  ];

  const certifications = [
    "DHIS2 Events Fundamentals",
    "Health-Tech and AI",
    "DHIS2_101: DHIS Fundamentals",
    "Applied Multidisciplinary Learning Journey in Data Science - Python"
  ];

  return (
    <section className="container space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Capabilities</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Skills, languages, certifications, education</h2>
          <p className="text-sm text-foreground/70">A blend of engineering depth, interoperability expertise, and practical AI delivery.</p>
        </div>
        <Button asChild variant="ghost" className="text-foreground hover:bg-card/80">
          <Link href="/certificates">
            View certificates
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 bg-card/85 shadow-elev1 backdrop-blur lg:col-span-2">
          <CardContent className="space-y-4 p-5">
            <div className="inline-flex items-center gap-2 text-foreground">
              <WrenchIcon />
              <h3 className="text-xl font-semibold">Top Skills</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="outline" className="border-border/80 text-foreground/80">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85 shadow-elev1 backdrop-blur">
          <CardContent className="space-y-4 p-5">
            <div className="inline-flex items-center gap-2 text-foreground">
              <Languages className="h-5 w-5" />
              <h3 className="text-xl font-semibold">Languages</h3>
            </div>
            <ul className="space-y-2 text-sm text-foreground/75">
              <li>English (Professional Working)</li>
              <li>Arabic (Native/Bilingual)</li>
              <li>French (Elementary)</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85 shadow-elev1 backdrop-blur lg:col-span-2">
          <CardContent className="space-y-4 p-5">
            <div className="inline-flex items-center gap-2 text-foreground">
              <Award className="h-5 w-5" />
              <h3 className="text-xl font-semibold">Certifications</h3>
            </div>
            <ul className="space-y-2 text-sm text-foreground/75">
              {certifications.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85 shadow-elev1 backdrop-blur">
          <CardContent className="space-y-4 p-5">
            <div className="inline-flex items-center gap-2 text-foreground">
              <GraduationCap className="h-5 w-5" />
              <h3 className="text-xl font-semibold">Education</h3>
            </div>
            <p className="text-sm text-foreground/75">Bachelor&apos;s degree, Management Information Systems</p>
            <p className="text-sm text-primary">An Najah National University (2014 - 2018)</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function ServicesSection() {
  const services = [
    {
      title: "AI Agent Engineering",
      detail: "Design, build, and deploy practical AI agents for workflow automation, decision support, and team productivity."
    },
    {
      title: "Healthcare Systems Integration",
      detail: "HL7/FHIR/DICOM interoperability, HIS/EHR integration, and secure clinical data exchange architecture."
    },
    {
      title: "Cloud Software Engineering",
      detail: "End-to-end product engineering from architecture to deployment with reliability, observability, and security."
    }
  ];

  return (
    <section className="container space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Services</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Services available in Canada</h2>
          <p className="text-sm text-foreground/70">Partner with Saleh Abbaas for AI, healthcare systems, and software engineering execution.</p>
        </div>
        <Button asChild variant="outline" className="border-border/80 bg-card/75 text-foreground hover:bg-card/80">
          <Link href="/services">Explore services</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {services.map((service) => (
          <Card key={service.title} className="border-border/70 bg-card/85 shadow-elev1 backdrop-blur">
            <CardContent className="space-y-3 p-5">
              <h3 className="text-xl font-semibold text-foreground">{service.title}</h3>
              <p className="text-sm text-foreground/75">{service.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function ContactSection({
  socialLinks
}: {
  socialLinks: Array<{
    label: string;
    url: string;
  }>;
}) {
  const topLinks = socialLinks.slice(0, 5);

  return (
    <section className="container">
      <div className="rounded-3xl border border-primary/30 bg-primary/15 px-6 py-10 shadow-elev2 backdrop-blur md:px-10 md:py-12">
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.22em] text-primary">Connect</p>
            <h3 className="text-3xl font-semibold tracking-tight text-foreground">Build with Saleh Abbaas</h3>
            <p className="text-sm text-foreground/75">
              Available for AI agent development, healthcare integration architecture, and full software delivery in Canada.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {topLinks.map((link) => (
                <Badge key={`${link.label}-${link.url}`} variant="outline" className="border-border/80 text-foreground/85">
                  {link.label}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Button asChild size="lg">
              <Link href="/book-meeting">
                Book a meeting
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-border/80 bg-card/75 text-foreground hover:bg-card/80">
              <Link href="/contact">Send a message</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="text-foreground hover:bg-card/80">
              <Link href="/about">
                <Globe className="mr-2 h-4 w-4" />
                About Saleh
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeFooterSection({
  socialLinks
}: {
  socialLinks: Array<{
    id: string;
    label: string;
    url: string;
  }>;
}) {
  return (
    <section className="w-full px-4 md:px-8 lg:px-10">
      <SiteFooterClient
        embedded
        socialLinks={socialLinks.map((link) => ({
          label: link.label,
          url: link.url
        }))}
      />
    </section>
  );
}

function WrenchIcon() {
  return <Sparkles className="h-5 w-5" />;
}
