import { CertificateEntry, ExperienceEntry, ProjectEntry, ServiceEntry } from "@/types/resume";
import { ProfileContent, SeoDefaults } from "@/types/cms";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export const profileDefaults: ProfileContent = {
  name: "Saleh Abbaas",
  headline: BRAND_TAGLINE,
  bio: BRAND_DESCRIPTION,
  location: "Ottawa, Ontario",
  email: "salehabbaas97@gmail.com",
  resumeUrl: "/resume/Resume_SalehAbbaas_SoftwareEngineer.pdf",
  avatarUrl: "/SalehAbbaas.jpeg"
};

export const seoDefaults: SeoDefaults = {
  titleTemplate: BRAND_NAME,
  defaultDescription: BRAND_DESCRIPTION,
  defaultOgImage: ""
};

export const aboutSummary =
  "I build secure, standards-compliant healthcare integrations and clinical data platforms. My work spans HL7 and FHIR APIs, laboratory systems, and analytics pipelines that give clinical teams real-time visibility and accuracy in regulated environments.";

export const highlights = [
  "5+ years in software engineering with 4+ years in healthcare interoperability.",
  "Built HL7/FHIR integrations that improved laboratory data accuracy up to 98%.",
  "Delivered enterprise platforms supporting 3,000+ clinical and public health users.",
  "Fluent in Arabic, professional English, and basic French."
];

export const experiences: ExperienceEntry[] = [
  {
    company: "The Ottawa Hospital",
    role: "Programmer Analyst",
    period: "Nov 2024 - Aug 2025",
    startDate: "Nov 2024",
    endDate: "Aug 2025",
    summary: "Clinical integration engineering for hospital and laboratory systems.",
    achievements: [
      "Implemented and maintained HL7 and FHIR integrations via Rhapsody for high-volume clinical and lab data exchange.",
      "Designed laboratory result ingestion and routing workflows aligned to HIPAA/PHIPA requirements.",
      "Resolved incidents through ServiceNow to improve system stability and continuity.",
      "Built Power BI dashboards to monitor interface performance, message volumes, and lab workflows."
    ]
  },
  {
    company: "Arab Hospitals Group",
    role: "Senior Software Engineer",
    period: "Jul 2023 - Oct 2024",
    startDate: "Jul 2023",
    endDate: "Oct 2024",
    summary: "LIS/HIS integrations, clinical automation, and secure API development.",
    achievements: [
      "Integrated laboratory analyzers, devices, and HIS platforms using HL7, FHIR, and ASTM standards.",
      "Built RESTful services to automate lab result processing and improve accuracy by up to 98%.",
      "Defined integration patterns, authentication models, and security controls for healthcare compliance.",
      "Partnered with clinical and IT stakeholders to deliver maintainable interoperability solutions."
    ]
  },
  {
    company: "World Health Organization (WHO)",
    role: "Information Technology Programmer",
    period: "Nov 2020 - Jun 2023",
    startDate: "Nov 2020",
    endDate: "Jun 2023",
    summary: "Public health data platforms, analytics, and secure infrastructure.",
    achievements: [
      "Designed and supported data platforms for large-scale public health and laboratory collection.",
      "Implemented database integrations and backend services for 3,000+ users.",
      "Delivered analytics and reporting with Power BI to support evidence-based decisions."
    ]
  }
];

export const projects: ProjectEntry[] = [
  {
    slug: "clinical-interoperability-platform",
    title: "Clinical Interoperability Platform",
    description: "HL7/FHIR integration pipelines connecting lab systems, EHRs, and clinical workflows with secure, standards-compliant exchange.",
    tags: ["hl7", "fhir", "rhapsody", "healthcare"]
  },
  {
    slug: "laboratory-automation-services",
    title: "Laboratory Automation Services",
    description: "LIS/HIS integration services that automate analyzer ingestion and improve result accuracy and throughput.",
    tags: ["lis", "his", "api", "automation"]
  },
  {
    slug: "public-health-data-platform",
    title: "Public Health Data Platform",
    description: "Secure data collection and analytics platform supporting 3,000+ public health users with actionable reporting.",
    tags: ["data-platform", "analytics", "postgresql", "power-bi"]
  },
  {
    slug: "interface-analytics-dashboard",
    title: "Interface Analytics Dashboard",
    description: "Operational dashboards tracking interface performance, message volumes, and data quality in real time.",
    tags: ["power-bi", "observability", "healthcare"]
  }
];

export const services: ServiceEntry[] = [
  {
    title: "Healthcare Interoperability",
    detail: "HL7/FHIR integration design, implementation, testing, and compliance for clinical systems."
  },
  {
    title: "Integration & API Engineering",
    detail: "Secure RESTful APIs, integration patterns, and data pipelines for regulated environments."
  },
  {
    title: "Data Platforms & Analytics",
    detail: "Database integrations, reporting pipelines, and Power BI dashboards for operational insight."
  },
  {
    title: "Cloud & DevOps Foundations",
    detail: "Infrastructure planning, automation, and reliability practices across Linux, Docker, and Kubernetes."
  }
];

export const certificates: CertificateEntry[] = [
  {
    title: "AWS Certified Cloud Practitioner",
    issuer: "Amazon Web Services",
    year: "2025"
  },
  {
    title: "IBM Data Science Professional Certificate",
    issuer: "IBM",
    year: "2024"
  },
  {
    title: "Public Health Data Analytics",
    issuer: "Birzeit University & IDRC Canada",
    year: "2022"
  },
  {
    title: "Healthcare Integration Training",
    issuer: "Experts Turnkey Solutions",
    year: ""
  }
];

export const socialLinks = [
  { label: "LinkedIn", url: "https://www.linkedin.com/in/salehabbaas" },
  { label: "YouTube", url: "https://youtube.com/@salehabbaas" },
  { label: "Instagram", url: "https://instagram.com/salehabbaas" },
  { label: "TikTok", url: "https://tiktok.com/@salehabbaas" },
  { label: "X", url: "https://x.com/salehabbaas" }
];

export const keywords = [
  "Software Engineer",
  "Healthcare Interoperability",
  "HL7",
  "FHIR",
  "Rhapsody",
  "Mirth",
  "Epic EHR",
  "HIPAA",
  "PHIPA",
  "DICOM",
  "PACS",
  "Power BI",
  "Clinical Data",
  "Integration Engineering",
  "Data Platforms"
];
