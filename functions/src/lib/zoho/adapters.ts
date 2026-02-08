export interface ZohoCrmAdapter {
  upsertLead(input: { name: string; email: string; source: string; notes?: string }): Promise<void>;
}

export interface ZohoMailAdapter {
  sendMail(input: { to: string; subject: string; html: string }): Promise<void>;
}

export interface ZohoCalendarAdapter {
  createEvent(input: { title: string; startAt: string; endAt: string; attendees: string[] }): Promise<{ eventId: string }>;
}

export class DisabledZohoAdapter implements ZohoCrmAdapter, ZohoMailAdapter, ZohoCalendarAdapter {
  async upsertLead() {
    throw new Error("Zoho CRM adapter is disabled.");
  }

  async sendMail() {
    throw new Error("Zoho Mail adapter is disabled.");
  }

  async createEvent(): Promise<{ eventId: string }> {
    throw new Error("Zoho Calendar adapter is disabled.");
  }
}
