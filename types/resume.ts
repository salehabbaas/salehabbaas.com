export interface ExperienceEntry {
  company: string;
  role: string;
  period: string;
  startDate?: string;
  endDate?: string;
  summary: string;
  achievements: string[];
}

export interface ProjectEntry {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  url?: string;
}

export interface ServiceEntry {
  title: string;
  detail: string;
}

export interface CertificateEntry {
  title: string;
  issuer: string;
  year: string;
}
