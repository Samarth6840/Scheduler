import { es } from "../config/elastic.js";
import type { EmailRow } from "../types/email.js";

export async function indexEmail(email: EmailRow): Promise<void> {
  await es.index({
    index: "emails",
    id: String(email.id),
    document: {
      id: email.id,
      subject: email.subject,
      body: email.body,
      recipient: email.recipient,
      sender: email.sender,
      status: email.status,
      scheduled_time: email.scheduled_time,
      sent_time: email.sent_time,
    },
  });
}

export interface EmailSearchHit {
  id: string;
  subject: string;
  body: string;
  recipient: string;
  sender: string;
  status: string;
  scheduled_time: string | null;
  sent_time: string | null;
}

export async function searchEmails(
  query: string,
  from: number,
  size: number,
): Promise<EmailSearchHit[]> {
  const result = await es.search<EmailSearchHit>({
    index: "emails",
    from,
    size,
    query: {
      multi_match: {
        query,
        fields: ["subject^2", "body", "recipient", "sender"],
      },
    },
    sort: [{ scheduled_time: { order: "desc" } }],
  });

  return result.hits.hits
    .map((hit) => hit._source)
    .filter((source): source is EmailSearchHit => source != null);
}