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

export async function safeProfile() {
  try {
    return await getProfileContent();
  } catch {
    return {
      name: "Saleh Abbaas",
      headline: "Software Engineer",
      bio: "",
      location: "",
      email: "",
      resumeUrl: "",
      avatarUrl: ""
    };
  }
}

export async function safeSeoDefaults() {
  try {
    return await getSeoDefaults();
  } catch {
    return {
      titleTemplate: "Saleh Abbaas | Software Engineer",
      defaultDescription: "Saleh Abbaas is a software engineer.",
      defaultOgImage: ""
    };
  }
}

export async function safeExperiences() {
  try {
    return await getExperiences();
  } catch {
    return [];
  }
}

export async function safeProjects(options?: { publishedOnly?: boolean }) {
  try {
    return await getProjects(options);
  } catch {
    return [];
  }
}

export async function safeProjectBySlug(slug: string) {
  try {
    return await getProjectBySlug(slug);
  } catch {
    return null;
  }
}

export async function safeServices() {
  try {
    return await getServices();
  } catch {
    return [];
  }
}

export async function safeCertificates() {
  try {
    return await getCertificates();
  } catch {
    return [];
  }
}

export async function safeSocialLinks() {
  try {
    return await getSocialLinks();
  } catch {
    return [];
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
