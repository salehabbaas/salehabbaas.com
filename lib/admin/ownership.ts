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
  "/admin/job-tracker": ["jobs.tracker"],
  "/admin/bookings": ["bookings.management"],

  "/admin/settings/integrations": ["settings.integrations"],
  "/admin/settings/visibility": ["settings.visibility"],
  "/admin/settings/health": ["settings.health"]
};

export const adminDashboardSnapshot = ["dashboard.website-stats", "dashboard.traffic-analytics", "dashboard.module-operations"];
