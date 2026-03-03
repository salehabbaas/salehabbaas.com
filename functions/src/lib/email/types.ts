export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  activity?: {
    module?: string;
    templateId?: string;
    trigger?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface EmailAdapter {
  send(message: EmailMessage): Promise<void>;
}
