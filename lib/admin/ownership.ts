export const adminPageOwnership: Record<string, string[]> = {
  "/admin": ["dashboard.website-stats", "dashboard.traffic-analytics", "dashboard.module-operations"],
  "/admin/system-inbox": ["dashboard.system-inbox", "dashboard.global-health-summary", "dashboard.recent-audit"],
  "/admin/systems-dashboard": ["dashboard.admin-systems", "dashboard.feature-health", "dashboard.module-coverage"],

  "/admin/cms/profile": ["cms.profile"],
  "/admin/cms/projects": ["cms.projects"],
  "/admin/cms/blog": ["cms.blog"],
  "/admin/cms/experience": ["cms.experience"],
  "/admin/cms/services": ["cms.services"],
  "/admin/cms/certificates": ["cms.certificates"],
  "/admin/cms/social": ["cms.social"],
  "/admin/cms/media": ["cms.media"],

  "/admin/creator": ["creator.workflow"],
  "/admin/linkedin-studio": ["linkedin.workflow"],
  "/admin/projects": ["projects.dashboard"],
  "/admin/projects/[projectId]": ["projects.board"],
  "/admin/projects/[projectId]/settings": ["projects.settings"],
  "/admin/resume-studio": ["resume.documents"],
  "/admin/resume-studio/[docId]": ["resume.editor"],
  "/admin/resume-studio/[docId]/ats": ["resume.ats"],
  "/admin/resume-studio/[docId]/export": ["resume.export"],
  "/admin/resume-studio/[docId]/print": ["resume.preview"],
  "/admin/resume-studio/templates": ["resume.templates"],
  "/admin/resume-studio/templates/[templateId]": ["resume.template-builder"],
  "/admin/resume-studio/templates/import": ["resume.template-import"],
  "/admin/job-tracker": ["jobs.tracker"],
  "/admin/job-tracker/[jobId]": ["jobs.detail"],
  "/admin/job-tracker/import": ["jobs.import"],
  "/admin/bookings": ["bookings.management"],
  "/admin/agent": ["agent.workspace"],

  "/admin/settings/reminders": ["settings.reminders"],
  "/admin/settings/access": ["settings.access"],
  "/admin/settings/integrations": ["settings.integrations"],
  "/admin/settings/visibility": ["settings.visibility"],
  "/admin/settings/health": ["settings.health"]
};

export const adminDashboardSnapshot = ["dashboard.website-stats", "dashboard.traffic-analytics", "dashboard.module-operations"];
