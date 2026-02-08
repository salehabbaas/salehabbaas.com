export type AnalyticsEventName =
  | "page_view"
  | "view_creator_item"
  | "click_external_post"
  | "download_resume"
  | "contact_submit"
  | "book_meeting"
  | "social_click"
  | "subscribe_newsletter";

export interface AnalyticsEventRecord {
  id: string;
  name: AnalyticsEventName;
  path?: string;
  slug?: string;
  platform?: string;
  createdAt?: string;
}
