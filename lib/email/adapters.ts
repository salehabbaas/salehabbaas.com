import "server-only";

import nodemailer from "nodemailer";

export type EmailAttachment = {
  filename: string;
  contentType: string;
  contentBase64: string;
};

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  activity?: {
    module?: string;
    templateId?: string;
    trigger?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  };
};

export type EmailAdapter = {
  send(payload: EmailPayload): Promise<void>;
};

type ZohoSmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
};

class ResendAdapter implements EmailAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly senderEmail: string,
    private readonly senderName: string
  ) {}

  async send(payload: EmailPayload) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: this.senderName ? `${this.senderName} <${this.senderEmail}>` : this.senderEmail,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        attachments: (payload.attachments ?? []).map((attachment) => ({
          filename: attachment.filename,
          content: attachment.contentBase64
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Resend send failed: ${await response.text()}`);
    }
  }
}

class SendGridAdapter implements EmailAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly senderEmail: string,
    private readonly senderName: string
  ) {}

  async send(payload: EmailPayload) {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.to }] }],
        from: {
          email: this.senderEmail,
          name: this.senderName || undefined
        },
        subject: payload.subject,
        content: [{ type: "text/html", value: payload.html }],
        attachments: (payload.attachments ?? []).map((attachment) => ({
          content: attachment.contentBase64,
          filename: attachment.filename,
          type: attachment.contentType,
          disposition: "attachment"
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`SendGrid send failed: ${await response.text()}`);
    }
  }
}

class MailgunAdapter implements EmailAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly domain: string,
    private readonly senderEmail: string,
    private readonly senderName: string
  ) {}

  async send(payload: EmailPayload) {
    const form = new FormData();
    form.set("from", this.senderName ? `${this.senderName} <${this.senderEmail}>` : this.senderEmail);
    form.set("to", payload.to);
    form.set("subject", payload.subject);
    form.set("html", payload.html);
    if (payload.text) form.set("text", payload.text);

    // Mailgun Node multipart support is unreliable in edge/serverless environments;
    // include fallback messaging when attachments are requested.
    if ((payload.attachments ?? []).length) {
      form.set(
        "html",
        `${payload.html}<p><em>Attachment delivery fallback:</em> provider does not support attachments in this runtime.</p>`
      );
    }

    const response = await fetch(`https://api.mailgun.net/v3/${this.domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${this.apiKey}`).toString("base64")}`
      },
      body: form
    });

    if (!response.ok) {
      throw new Error(`Mailgun send failed: ${await response.text()}`);
    }
  }
}

class GmailSmtpAdapter implements EmailAdapter {
  private readonly transporter;

  constructor(
    private readonly username: string,
    private readonly password: string,
    private readonly senderEmail: string,
    private readonly senderName: string
  ) {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: this.username,
        pass: this.password
      }
    });
  }

  async send(payload: EmailPayload) {
    await this.transporter.sendMail({
      from: this.senderName ? `${this.senderName} <${this.senderEmail}>` : this.senderEmail,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments: (payload.attachments ?? []).map((attachment) => ({
        filename: attachment.filename,
        content: attachment.contentBase64,
        encoding: "base64",
        contentType: attachment.contentType
      }))
    });
  }
}

class ZohoSmtpAdapter implements EmailAdapter {
  private readonly transporter;

  constructor(
    private readonly config: ZohoSmtpConfig,
    private readonly senderEmail: string,
    private readonly senderName: string
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.username,
        pass: this.config.password
      }
    });
  }

  async send(payload: EmailPayload) {
    await this.transporter.sendMail({
      from: this.senderName ? `${this.senderName} <${this.senderEmail}>` : this.senderEmail,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments: (payload.attachments ?? []).map((attachment) => ({
        filename: attachment.filename,
        content: attachment.contentBase64,
        encoding: "base64",
        contentType: attachment.contentType
      }))
    });
  }
}

class ConsoleAdapter implements EmailAdapter {
  async send(payload: EmailPayload) {
    console.log("Email debug adapter", {
      to: payload.to,
      subject: payload.subject,
      attachments: payload.attachments?.map((item) => item.filename) ?? []
    });
  }
}

export function createEmailAdapter(input: {
  provider: "resend" | "sendgrid" | "mailgun" | "zoho" | "gmail";
  senderEmail: string;
  senderName: string;
  secrets: {
    resendApiKey?: string;
    sendgridApiKey?: string;
    mailgunApiKey?: string;
    mailgunDomain?: string;
    gmailAppPassword?: string;
    zohoSmtpHost?: string;
    zohoSmtpPort?: string;
    zohoSmtpSecure?: string;
    zohoSmtpUsername?: string;
    zohoSmtpPassword?: string;
  };
}): EmailAdapter {
  if (input.provider === "resend") {
    const key = input.secrets.resendApiKey || process.env.RESEND_API_KEY;
    if (key) return new ResendAdapter(key, input.senderEmail, input.senderName);
  }

  if (input.provider === "sendgrid") {
    const key = input.secrets.sendgridApiKey || process.env.SENDGRID_API_KEY;
    if (key) return new SendGridAdapter(key, input.senderEmail, input.senderName);
  }

  if (input.provider === "mailgun") {
    const key = input.secrets.mailgunApiKey || process.env.MAILGUN_API_KEY;
    const domain = input.secrets.mailgunDomain || process.env.MAILGUN_DOMAIN;
    if (key && domain) return new MailgunAdapter(key, domain, input.senderEmail, input.senderName);
  }

  if (input.provider === "gmail") {
    const password = input.secrets.gmailAppPassword || process.env.GMAIL_APP_PASSWORD || "";
    if (input.senderEmail && password) {
      return new GmailSmtpAdapter(input.senderEmail, password, input.senderEmail, input.senderName);
    }
  }

  if (input.provider === "zoho") {
    const host = input.secrets.zohoSmtpHost || process.env.ZOHO_SMTP_HOST || "";
    const portRaw = input.secrets.zohoSmtpPort || process.env.ZOHO_SMTP_PORT || "";
    const secureRaw = input.secrets.zohoSmtpSecure || process.env.ZOHO_SMTP_SECURE || "";
    const username = input.secrets.zohoSmtpUsername || process.env.ZOHO_SMTP_USERNAME || "";
    const password = input.secrets.zohoSmtpPassword || process.env.ZOHO_SMTP_PASSWORD || "";

    const parsedPort = Number(portRaw || "465");
    const secure = ["1", "true", "yes", "on"].includes(String(secureRaw).trim().toLowerCase()) || parsedPort === 465;

    if (host && Number.isFinite(parsedPort) && parsedPort > 0 && username && password) {
      return new ZohoSmtpAdapter(
        {
          host,
          port: parsedPort,
          secure,
          username,
          password
        },
        input.senderEmail,
        input.senderName
      );
    }
  }

  return new ConsoleAdapter();
}
