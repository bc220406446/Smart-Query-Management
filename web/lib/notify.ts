import { prisma } from "@/lib/prisma";

/** FR-08: in-app notification row (shown via the bell / dashboard). */
export async function notifyUser(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
    },
  });
}

/**
 * FR-08: email notification via SMTP (Google App Password), not Resend.
 * Configured with SMTP_HOST (smtp.gmail.com), SMTP_PORT (587), SMTP_USER,
 * SMTP_PASS (Google App Password), and EMAIL_FROM.
 * No-ops silently when SMTP_PASS is unset, so local dev works without credentials.
 */
export async function sendEmailNotification(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const pass = process.env.SMTP_PASS;
  if (!pass || !process.env.SMTP_USER) return null;
  try {
    const { default: nodemailer } = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "Smart Query Hub <noreply@example.com>",
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return info;
  } catch (err) {
    console.error("sendEmailNotification failed:", err);
    return null;
  }
}