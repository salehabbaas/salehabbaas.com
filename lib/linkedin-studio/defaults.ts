import type { StudioConfig } from "@/types/linkedin-studio";

export const defaultStudioConfig: StudioConfig = {
  profile: {
    displayName: "Saleh Abbaas",
    headline: "",
    about: "",
    goals: [],
    location: "",
    voiceStyle: {
      tone: "Practical, warm, concise",
      length: "Medium",
      dos: [],
      donts: []
    }
  },
  targeting: {
    companies: [],
    industries: [],
    technologies: [],
    pillars: []
  },
  settings: {
    cadenceDaysOfWeek: ["TU", "TH"],
    reminderTimeLocal: "09:00",
    timezone: "America/Toronto",
    webResearchEnabled: true,
    autoSelectCompany: true,
    autoSelectTopic: true,
    autoShareLinkedIn: false
  },
  experience: []
};
