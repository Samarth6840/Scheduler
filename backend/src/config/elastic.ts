import { Client } from "@elastic/elasticsearch";
import { env } from "./env.js";

export const es = new Client({ node: env.esUrl });

export function initES(): void {
  es.indices
    .exists({ index: "emails" })
    .then((exists) => {
      if (!exists) {
        return es.indices.create({
          index: "emails",
          mappings: {
            properties: {
              id: { type: "long" },
              subject: { type: "text" },
              body: { type: "text" },
              recipient: { type: "keyword" },
              sender: { type: "keyword" },
              status: { type: "keyword" },
              scheduled_time: { type: "date" },
              sent_time: { type: "date" },
            },
          },
        });
      }
    })
    .catch((err) => {
      console.warn("[es] init failed:", err.message);
    });
}