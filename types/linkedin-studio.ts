export type StudioVoiceStyle = {
  tone: string;
  length: string;
  dos: string[];
  donts: string[];
};

export type StudioCompany = {
  name: string;
  website?: string;
  notes?: string;
  priority?: number;
  rotationWeight?: number;
  lastUsedAt?: string;
};

export type StudioExperience = {
  roleTitle: string;
  company: string;
  industry?: string;
  startDate?: string;
  endDate?: string;
  bullets: string[];
  technologies: string[];
  lessonsLearned: string[];
};

export type StudioProfile = {
  displayName: string;
  headline: string;
  about: string;
  goals: string[];
  location?: string;
  voiceStyle: StudioVoiceStyle;
};

export type StudioTargeting = {
  companies: StudioCompany[];
  industries: string[];
  technologies: string[];
  pillars: string[];
};

export type StudioSettings = {
  cadenceDaysOfWeek: Array<"MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU">;
  reminderTimeLocal: string;
  timezone: string;
  webResearchEnabled: boolean;
  autoSelectCompany: boolean;
  autoSelectTopic: boolean;
  autoShareLinkedIn: boolean;
};

export type StudioConfig = {
  profile: StudioProfile;
  targeting: StudioTargeting;
  settings: StudioSettings;
  experience: StudioExperience[];
  createdAt?: string;
  updatedAt?: string;
};

export type StudioPostRecord = {
  id: string;
  status: "draft" | "scheduled" | "published";
  selectedCompany: string;
  selectedTopics: string[];
  selectedPillar?: string | null;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  finalText: string;
  hashtags: string[];
  mentions: string[];
  internalNotes: {
    rationale: string;
    whyFit?: string;
  };
};

export type StudioPostVersion = {
  id: string;
  versionNumber: number;
  text: string;
  feedbackApplied?: string;
  createdAt?: string;
};
