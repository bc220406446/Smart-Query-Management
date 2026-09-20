import { prisma } from "@/lib/prisma";
import { sendWhatsAppReply } from "@/lib/whatsapp";

function escapeHtml(value: string) {
  return value.replace(/[&<>'\"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '\"': "&quot;",
  })[character] ?? character);
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

/**
 * FR-08: deliver one notification through every enabled channel available to
 * the user. Delivery is best-effort: a failed email or WhatsApp send must not
 * prevent the query transaction or the in-app notification from completing.
 */
export async function notifyUserAcrossChannels(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  queryId?: string;
  subject?: string;
  details?: string;
  status?: string;
}) {
  if (!params.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true, phone: true, emailNotifications: true, whatsappNotifications: true },
  });
  if (!user) return null;

  const rawBody = params.details ?? params.body ?? params.title;
  const extractedSubject = rawBody.match(/^"([^"\n]+)"/)?.[1];
  const subject = params.subject ?? extractedSubject ?? "Query update";
  const details = params.details ?? params.body ?? params.title;
  const status = params.status ?? params.title;
  const whatsappBody = `Subject: ${subject}\nDetails: ${details}\nStatus: ${status}`;
  const emailBody = `Subject: ${subject}\nDetails: ${details}\nStatus: ${status}`;
  const deliveries = await Promise.allSettled([
    user.emailNotifications && user.email
      ? sendEmailNotification({
          to: user.email,
          subject: "Your Query Status has been updated",
          html: `<p>${escapeHtml(emailBody).replace(/\n/g, "<br />")}</p>`,
        })
      : Promise.resolve(null),
    user.whatsappNotifications && user.phone
      ? sendWhatsAppReply(user.phone, whatsappBody)
      : Promise.resolve(),
  ]);

  for (const delivery of deliveries) {
    if (delivery.status === "rejected") {
      console.error("FR-08 notification delivery failed:", delivery.reason);
    }
  }

  return user;
}
