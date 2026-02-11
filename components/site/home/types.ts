import type { BlogPostContent, CertificateContent, ExperienceContent, ProfileContent, ProjectContent, ServiceContent } from "@/types/cms";
import type { ContentVariant } from "@/types/creator";

export interface HeroStat {
  label: string;
  value: string;
}

export interface HomeHeroProps {
  profile: ProfileContent;
  keywords: string[];
  stats: HeroStat[];
}

export interface HomeTrustStripProps {
  stats: HeroStat[];
}

export interface HomeExperienceSnapshotProps {
  experiences: ExperienceContent[];
}

export interface HomeFeaturedProjectsProps {
  projects: ProjectContent[];
  enableCarousel?: boolean;
}

export interface HomeServicesProps {
  services: ServiceContent[];
}

export interface HomeCredentialsProps {
  certificates: CertificateContent[];
}

export interface HomeCreatorPreviewProps {
  creatorItems: ContentVariant[];
  knowledgeItems: BlogPostContent[];
}
