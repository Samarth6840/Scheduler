import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../config/env.js";

let transporter: Transporter | null = null;
let usingTestAccount = false;

export async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter;

  const cfg = env.ethereal;
  if (cfg.user) {
    transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
    });
  } else {
    const test = await nodemailer.createTestAccount();
    usingTestAccount = true;
    transporter = nodemailer.createTransport({
      host: test.smtp.host,
      port: test.smtp.port,
      secure: test.smtp.secure,
      auth: { user: test.user, pass: test.pass },
    });
  }

  await transporter.verify();
  return transporter;
}

export function getTestAccountStatus(): boolean {
  return usingTestAccount;
}