import { EmailAdapter, EmailMessage } from "./types";

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

class ZohoAdapter implements EmailAdapter {
  async send() {
    throw new Error("Zoho adapter is reserved for future integration and currently disabled.");
  }
}

class ConsoleAdapter implements EmailAdapter {
  async send(message: EmailMessage) {
    console.log("Email debug send", message);
  }
}

export function createEmailAdapter(input: {
  provider: "sendgrid" | "resend" | "mailgun" | "zoho";
  senderEmail: string;
  senderName: string;
}) {
  const sender = input.senderName ? `${input.senderName} <${input.senderEmail}>` : input.senderEmail;

  if (input.provider === "resend") {
    const key = process.env.RESEND_API_KEY;
    if (key) return new ResendAdapter(key, sender);
  }

  if (input.provider === "sendgrid") {
    const key = process.env.SENDGRID_API_KEY;
    if (key) return new SendGridAdapter(key, sender);
  }

  if (input.provider === "mailgun") {
    const key = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    if (key && domain) return new MailgunAdapter(key, domain, sender);
  }

  if (input.provider === "zoho") {
    return new ZohoAdapter();
  }

  return new ConsoleAdapter();
}
