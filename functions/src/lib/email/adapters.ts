import { EmailAdapter, EmailMessage } from "./types";
import nodemailer from "nodemailer";

class ResendAdapter implements EmailAdapter {
  constructor(private readonly apiKey: string, private readonly sender: string) {}

  async send(message: EmailMessage) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: this.sender,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text
      })
    });

    if (!response.ok) {
      throw new Error(`Resend send failed: ${await response.text()}`);
    }
  }
}

class SendGridAdapter implements EmailAdapter {
  constructor(private readonly apiKey: string, private readonly sender: string) {}

  async send(message: EmailMessage) {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: this.sender },
        subject: message.subject,
        content: [{ type: "text/html", value: message.html }]
      })
    });

    if (!response.ok) {
      throw new Error(`SendGrid send failed: ${await response.text()}`);
    }
  }
}

class MailgunAdapter implements EmailAdapter {
  constructor(private readonly apiKey: string, private readonly domain: string, private readonly sender: string) {}

  async send(message: EmailMessage) {
    const body = new URLSearchParams();
    body.append("from", this.sender);
    body.append("to", message.to);
    body.append("subject", message.subject);
    body.append("html", message.html);
    if (message.text) body.append("text", message.text);

    const response = await fetch(`https://api.mailgun.net/v3/${this.domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${this.apiKey}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    if (!response.ok) {
      throw new Error(`Mailgun send failed: ${await response.text()}`);
    }
  }
}

class GmailAdapter implements EmailAdapter {
  private readonly transporter;

  constructor(
    private readonly username: string,
    private readonly password: string,
    private readonly sender: string
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

  async send(message: EmailMessage) {
    await this.transporter.sendMail({
      from: this.sender,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text
    });
  }
}

class ZohoAdapter implements EmailAdapter {
  private readonly transporter;

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly secure: boolean,
    private readonly username: string,
    private readonly password: string,
    private readonly sender: string
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.secure,
      auth: {
        user: this.username,
        pass: this.password
      }
    });
  }

  async send(message: EmailMessage) {
    await this.transporter.sendMail({
      from: this.sender,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text
    });
  }
}

class ConsoleAdapter implements EmailAdapter {
  async send(message: EmailMessage) {
    console.log("Email debug send", message);
  }
}

export function createEmailAdapter(input: {
  provider: "sendgrid" | "resend" | "mailgun" | "zoho" | "gmail";
  senderEmail: string;
  senderName: string;
  secrets?: {
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
}) {
  const sender = input.senderName ? `${input.senderName} <${input.senderEmail}>` : input.senderEmail;

  if (input.provider === "resend") {
    const key = input.secrets?.resendApiKey || process.env.RESEND_API_KEY;
    if (key) return new ResendAdapter(key, sender);
  }

  if (input.provider === "sendgrid") {
    const key = input.secrets?.sendgridApiKey || process.env.SENDGRID_API_KEY;
    if (key) return new SendGridAdapter(key, sender);
  }

  if (input.provider === "mailgun") {
    const key = input.secrets?.mailgunApiKey || process.env.MAILGUN_API_KEY;
    const domain = input.secrets?.mailgunDomain || process.env.MAILGUN_DOMAIN;
    if (key && domain) return new MailgunAdapter(key, domain, sender);
  }

  if (input.provider === "gmail") {
    const password = input.secrets?.gmailAppPassword || process.env.GMAIL_APP_PASSWORD || "";
    if (input.senderEmail && password) return new GmailAdapter(input.senderEmail, password, sender);
  }

  if (input.provider === "zoho") {
    const host = input.secrets?.zohoSmtpHost || process.env.ZOHO_SMTP_HOST || "";
    const portRaw = input.secrets?.zohoSmtpPort || process.env.ZOHO_SMTP_PORT || "";
    const secureRaw = input.secrets?.zohoSmtpSecure || process.env.ZOHO_SMTP_SECURE || "";
    const username = input.secrets?.zohoSmtpUsername || process.env.ZOHO_SMTP_USERNAME || "";
    const password = input.secrets?.zohoSmtpPassword || process.env.ZOHO_SMTP_PASSWORD || "";
    const parsedPort = Number(portRaw || "465");
    const secure = ["1", "true", "yes", "on"].includes(String(secureRaw).trim().toLowerCase()) || parsedPort === 465;

    if (host && Number.isFinite(parsedPort) && parsedPort > 0 && username && password) {
      return new ZohoAdapter(host, parsedPort, secure, username, password, sender);
    }
  }

  return new ConsoleAdapter();
}
