import { NextResponse } from "next/server";
import { requestOtpSchema } from "@/lib/validation";
import { createOtpForEmail } from "@/lib/otp";
import { sendEmailNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors.email?.[0] ?? "Invalid email" }, { status: 400 });
    }

    const code = await createOtpForEmail(parsed.data.email);

    // Send the OTP via SMTP (Google App Password) — best effort.
    await sendEmailNotification({
      to: parsed.data.email,
      subject: "Your Smart Query Hub login code",
      html: `<p>Hi there,</p><p>Your one-time login code for the Smart Query Hub is:</p><p style=\"font-size:1.4rem;letter-spacing:4px;font-weight:700;\">${code}</p><p>It expires in 5 minutes. If you did not request this code, you can safely ignore this email.</p><p>— Smart Query Hub</p>`,
    });

    return NextResponse.json({ ok: true, message: "OTP sent. Check your inbox." });
  } catch (err) {
    console.error("request-otp error:", err);
    return NextResponse.json({ error: "Could not send OTP. Try again." }, { status: 500 });
  }
}
