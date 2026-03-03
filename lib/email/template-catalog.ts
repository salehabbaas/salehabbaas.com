import type {
  AdminEmailTemplates,
  EmailTemplateContent,
  EmailTemplateDefinition,
  EmailTemplateId
} from "@/types/site-settings";

const COMMON_TEMPLATE_PLACEHOLDERS = [
  "moduleName",
  "senderName",
  "senderEmail",
  "siteUrl",
  "logoUrl",
  "year",
  "primaryActionLabel",
  "primaryActionUrl"
] as const;

export const EMAIL_TEMPLATE_DEFINITIONS: EmailTemplateDefinition[] = [
  {
    id: "settingsTest",
    label: "Settings Test",
    description: "Sent from Admin Integrations to verify runtime email delivery.",
    placeholders: ["provider", "sentAt", ...COMMON_TEMPLATE_PLACEHOLDERS]
  },
  {
    id: "adminInvitation",
    label: "Admin Invitation",
    description: "Sent when inviting or re-sending access to SA Panel admins.",
    placeholders: [
      "recipientEmail",
      "invitedBy",
      "expiresAtIso",
      "setupLink",
      "loginLink",
      "modulesText",
      "projectsText",
      "modulesListHtml",
      "projectsListHtml",
      "invitationType",
      ...COMMON_TEMPLATE_PLACEHOLDERS
    ]
  },
  {
    id: "resumeExport",
    label: "Resume Export",
    description: "Sent when Resume Studio exports are delivered by email.",
    placeholders: ["documentTitle", ...COMMON_TEMPLATE_PLACEHOLDERS]
  },
  {
    id: "contactSubmission",
    label: "Contact Submission",
    description: "Owner notification for public contact form submissions.",
    placeholders: ["name", "email", "subject", "message", ...COMMON_TEMPLATE_PLACEHOLDERS]
  },
  {
    id: "bookingConfirmation",
    label: "Booking Confirmation",
    description: "Sent to the requester after a meeting booking is confirmed.",
    placeholders: ["name", "meetingType", "startAt", "timezone", "meetLink", ...COMMON_TEMPLATE_PLACEHOLDERS]
  },
  {
    id: "bookingOwnerNotification",
    label: "Booking Owner Alert",
    description: "Sent to the owner inbox when a new booking is confirmed.",
    placeholders: ["meetingType", "startAt", "timezone", "name", "email", "reason", "meetLink", ...COMMON_TEMPLATE_PLACEHOLDERS]
  },
  {
    id: "taskReminder24h",
    label: "Task Reminder 24h",
    description: "Reminder sent 24 hours before task due time.",
    placeholders: ["taskTitle", "dueLabel", "taskDescription", "taskUrl", ...COMMON_TEMPLATE_PLACEHOLDERS]
  },
  {
    id: "taskReminder1h",
    label: "Task Reminder 1h",
    description: "Reminder sent 1 hour before task due time.",
    placeholders: ["taskTitle", "dueLabel", "taskDescription", "taskUrl", ...COMMON_TEMPLATE_PLACEHOLDERS]
  },
  {
    id: "taskOverdueDigest",
    label: "Task Overdue Digest",
    description: "Daily digest for overdue tasks.",
    placeholders: ["taskCount", "overdueItemsText", "overdueItemsHtml", ...COMMON_TEMPLATE_PLACEHOLDERS]
  }
];

const DEFAULT_TEMPLATES: AdminEmailTemplates = {
  settingsTest: {
    subject: "Email Settings Test ({{provider}})",
    html: `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;">Email settings test passed</h2>
    <p style="margin:0 0 12px;">Your system can send emails using <strong>{{provider}}</strong>.</p>
    <p style="margin:0 0 4px;"><strong>Sender:</strong> {{senderName}} &lt;{{senderEmail}}&gt;</p>
    <p style="margin:0;"><strong>Sent at:</strong> {{sentAt}}</p>
  </div>
</div>`,
    text: "Email settings test passed.\nProvider: {{provider}}\nSender: {{senderName}} <{{senderEmail}}>\nSent at: {{sentAt}}"
  },
  adminInvitation: {
    subject: "SA Panel invitation {{invitationType}} for {{recipientEmail}}",
    html: `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;">Admin invitation {{invitationType}}</h2>
    <p style="margin:0 0 6px;"><strong>Recipient:</strong> {{recipientEmail}}</p>
    <p style="margin:0 0 6px;"><strong>Invited by:</strong> {{invitedBy}}</p>
    <p style="margin:0 0 12px;"><strong>Expires at:</strong> {{expiresAtIso}}</p>
    <p style="margin:0 0 6px;"><strong>Modules:</strong> {{modulesText}}</p>
    <p style="margin:0 0 12px;"><strong>Projects:</strong> {{projectsText}}</p>
    <p style="margin:0 0 6px;"><a href="{{setupLink}}">Set your password</a></p>
    <p style="margin:0;"><a href="{{loginLink}}">Open admin login</a></p>
    <p style="margin:14px 0 4px;"><strong>Module access (detailed)</strong></p>
    <ul style="margin:0 0 10px;padding-left:18px;">{{{modulesListHtml}}}</ul>
    <p style="margin:0 0 4px;"><strong>Project access (detailed)</strong></p>
    <ul style="margin:0;padding-left:18px;">{{{projectsListHtml}}}</ul>
  </div>
</div>`,
    text:
      "SA Panel invitation {{invitationType}}.\nRecipient: {{recipientEmail}}\nInvited by: {{invitedBy}}\nInvitation expires at: {{expiresAtIso}}\nSet password: {{setupLink}}\nAdmin login: {{loginLink}}\nModules: {{modulesText}}\nProjects: {{projectsText}}"
  },
  resumeExport: {
    subject: "Resume Export: {{documentTitle}}",
    html: `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;">Your resume export is ready</h2>
    <p style="margin:0;">Document: <strong>{{documentTitle}}</strong></p>
  </div>
</div>`,
    text: "Your resume export is attached.\nDocument: {{documentTitle}}"
  },
  contactSubmission: {
    subject: "New Contact Submission: {{subject}}",
    html: `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;">New contact submission</h2>
    <p style="margin:0 0 6px;"><strong>Name:</strong> {{name}}</p>
    <p style="margin:0 0 6px;"><strong>Email:</strong> {{email}}</p>
    <p style="margin:0 0 6px;"><strong>Subject:</strong> {{subject}}</p>
    <p style="margin:0 0 4px;"><strong>Message:</strong></p>
    <p style="margin:0;white-space:pre-wrap;">{{message}}</p>
  </div>
</div>`,
    text: "New contact submission\nName: {{name}}\nEmail: {{email}}\nSubject: {{subject}}\nMessage:\n{{message}}"
  },
  bookingConfirmation: {
    subject: "Your meeting with Saleh Abbaas is confirmed",
    html: `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;">Meeting confirmed</h2>
    <p style="margin:0 0 8px;">Hi {{name}}, your {{meetingType}} is confirmed.</p>
    <p style="margin:0 0 6px;"><strong>When:</strong> {{startAt}} ({{timezone}})</p>
    <p style="margin:0;"><strong>Meet link:</strong> {{meetLink}}</p>
  </div>
</div>`,
    text: "Hi {{name}}, your {{meetingType}} is confirmed.\nWhen: {{startAt}} ({{timezone}})\nMeet link: {{meetLink}}"
  },
  bookingOwnerNotification: {
    subject: "New Booking: {{name}}",
    html: `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;">New booking confirmed</h2>
    <p style="margin:0 0 6px;"><strong>Meeting:</strong> {{meetingType}}</p>
    <p style="margin:0 0 6px;"><strong>When:</strong> {{startAt}} ({{timezone}})</p>
    <p style="margin:0 0 6px;"><strong>Name:</strong> {{name}}</p>
    <p style="margin:0 0 6px;"><strong>Email:</strong> {{email}}</p>
    <p style="margin:0 0 6px;"><strong>Reason:</strong> {{reason}}</p>
    <p style="margin:0;"><strong>Meet link:</strong> {{meetLink}}</p>
  </div>
</div>`,
    text: "New booking confirmed\nMeeting: {{meetingType}}\nWhen: {{startAt}} ({{timezone}})\nName: {{name}}\nEmail: {{email}}\nReason: {{reason}}\nMeet link: {{meetLink}}"
  },
  taskReminder24h: {
    subject: "Task due in 24h: {{taskTitle}}",
    html: `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;">Task reminder (24h)</h2>
    <p style="margin:0 0 6px;"><strong>{{taskTitle}}</strong></p>
    <p style="margin:0 0 6px;"><strong>Due:</strong> {{dueLabel}}</p>
    <p style="margin:0 0 10px;white-space:pre-wrap;">{{taskDescription}}</p>
    <p style="margin:0;"><a href="{{taskUrl}}">Open task</a></p>
  </div>
</div>`,
    text: "{{taskTitle}}\nDue: {{dueLabel}}\n{{taskDescription}}\n{{taskUrl}}"
  },
  taskReminder1h: {
    subject: "Task due in 1h: {{taskTitle}}",
    html: `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;">Task reminder (1h)</h2>
    <p style="margin:0 0 6px;"><strong>{{taskTitle}}</strong></p>
    <p style="margin:0 0 6px;"><strong>Due:</strong> {{dueLabel}}</p>
    <p style="margin:0 0 10px;white-space:pre-wrap;">{{taskDescription}}</p>
    <p style="margin:0;"><a href="{{taskUrl}}">Open task</a></p>
  </div>
</div>`,
    text: "{{taskTitle}}\nDue: {{dueLabel}}\n{{taskDescription}}\n{{taskUrl}}"
  },
  taskOverdueDigest: {
    subject: "Daily overdue tasks ({{taskCount}})",
    html: `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;">Overdue task digest</h2>
    <p style="margin:0 0 10px;">You have <strong>{{taskCount}}</strong> overdue task(s).</p>
    <ul style="margin:0;padding-left:18px;">{{{overdueItemsHtml}}}</ul>
  </div>
</div>`,
    text: "Overdue tasks: {{taskCount}}\n{{overdueItemsText}}"
  }
};

type EmailTemplatePatch = Partial<Record<EmailTemplateId, Partial<EmailTemplateContent>>>;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function normalizeTemplate(input: unknown, fallback: EmailTemplateContent): EmailTemplateContent {
  if (!isObjectRecord(input)) return fallback;
  return {
    subject: normalizeString(input.subject, fallback.subject),
    html: normalizeString(input.html, fallback.html),
    text: normalizeString(input.text, fallback.text)
  };
}

export function getDefaultAdminEmailTemplates(): AdminEmailTemplates {
  return EMAIL_TEMPLATE_DEFINITIONS.reduce((acc, definition) => {
    const template = DEFAULT_TEMPLATES[definition.id];
    acc[definition.id] = {
      subject: template.subject,
      html: template.html,
      text: template.text
    };
    return acc;
  }, {} as AdminEmailTemplates);
}

export function normalizeAdminEmailTemplates(input: unknown): AdminEmailTemplates {
  const defaults = getDefaultAdminEmailTemplates();
  if (!isObjectRecord(input)) return defaults;

  const next = { ...defaults };
  for (const definition of EMAIL_TEMPLATE_DEFINITIONS) {
    next[definition.id] = normalizeTemplate(input[definition.id], defaults[definition.id]);
  }
  return next;
}

export function applyEmailTemplatePatch(existing: AdminEmailTemplates, patch: EmailTemplatePatch): AdminEmailTemplates {
  const next = { ...existing };

  for (const definition of EMAIL_TEMPLATE_DEFINITIONS) {
    const id = definition.id;
    const patchTemplate = patch[id];
    if (!patchTemplate) continue;

    next[id] = normalizeTemplate(
      {
        ...existing[id],
        ...patchTemplate
      },
      existing[id]
    );
  }

  return next;
}
