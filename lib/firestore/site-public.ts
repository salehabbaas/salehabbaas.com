import {
  getBlogPostBySlug,
  getBlogPosts,
  getCertificates,
  getExperiences,
  getProfileContent,
  getProjectBySlug,
  getProjects,
  getSeoDefaults,
  getServices,
  getSocialLinks
} from "@/lib/firestore/cms";
import {
  certificates as resumeCertificates,
  experiences as resumeExperiences,
  profileDefaults,
  projects as resumeProjects,
  seoDefaults as resumeSeoDefaults,
  services as resumeServices,
  socialLinks as resumeSocialLinks
} from "@/lib/data/resume";
import type {
  CertificateContent,
  ExperienceContent,
  ProjectContent,
  ServiceContent,
  SocialLinkContent
} from "@/types/cms";

function mapExperience(entry: (typeof resumeExperiences)[number], index: number): ExperienceContent {
  const startDate = entry.startDate || entry.period.split("-")[0]?.trim() || "";
  const endDate = entry.endDate || entry.period.split("-")[1]?.trim() || "";
  return {
    id: `experience-${index + 1}`,
    company: entry.company,
    role: entry.role,
    startDate,
    endDate,
    summary: entry.summary,
    achievements: entry.achievements,
    sortOrder: index
  };
}

function mapProject(entry: (typeof resumeProjects)[number], index: number): ProjectContent {
  return {
    id: `project-${index + 1}`,
    slug: entry.slug,
    title: entry.title,
    description: entry.description,
    longDescription: entry.description,
    tags: entry.tags,
    projectUrl: entry.url || "",
    status: "published",
    sortOrder: index
  };
}

function mapService(entry: (typeof resumeServices)[number], index: number): ServiceContent {
  return {
    id: `service-${index + 1}`,
    title: entry.title,
    detail: entry.detail,
    sortOrder: index
  };
}

function mapCertificate(entry: (typeof resumeCertificates)[number], index: number): CertificateContent {
  return {
    id: `certificate-${index + 1}`,
    title: entry.title,
    issuer: entry.issuer,
    year: entry.year,
    sortOrder: index
  };
}

function mapSocialLink(entry: (typeof resumeSocialLinks)[number], index: number): SocialLinkContent {
  return {
    id: `social-${index + 1}`,
    label: entry.label,
    url: entry.url,
    sortOrder: index
  };
}

export async function safeProfile() {
  try {
    const profile = await getProfileContent();
    return {
      ...profileDefaults,
      ...profile
    };
  } catch {
    return profileDefaults;
  }
}

export async function safeSeoDefaults() {
  try {
    const defaults = await getSeoDefaults();
    return {
      ...resumeSeoDefaults,
      ...defaults
    };
  } catch {
    return resumeSeoDefaults;
  }
}

export async function safeExperiences() {
  try {
    return await getExperiences();
  } catch {
    return resumeExperiences.map(mapExperience);
  }
}

export async function safeProjects(options?: { publishedOnly?: boolean }) {
  try {
    return await getProjects(options);
  } catch {
    const items = resumeProjects.map(mapProject);
    if (!options?.publishedOnly) return items;
    return items.filter((project) => project.status === "published");
  }
}

export async function safeProjectBySlug(slug: string) {
  try {
    return await getProjectBySlug(slug);
  } catch {
    const project = resumeProjects.find((item) => item.slug === slug);
    return project ? mapProject(project, 0) : null;
  }
}

export async function safeServices() {
  try {
    return await getServices();
  } catch {
    return resumeServices.map(mapService);
  }
}

export async function safeCertificates() {
  try {
    return await getCertificates();
  } catch {
    return resumeCertificates.map(mapCertificate);
  }
}

export async function safeSocialLinks() {
  try {
    return await getSocialLinks();
  } catch {
    return resumeSocialLinks.map(mapSocialLink);
  }
}

export async function safeBlogPosts(options?: { publishedOnly?: boolean }) {
  try {
    return await getBlogPosts(options);
  } catch {
    return [];
  }
}

export async function safeBlogPostBySlug(slug: string) {
  try {
    return await getBlogPostBySlug(slug);
  } catch {
    return null;
  }
}
