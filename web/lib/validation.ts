import { z } from "zod";
import { QueryChannel, QueryStatus } from "@prisma/client";

/** FR-02: web form query submission. */
export const submitQuerySchema = z.object({
  subject: z.string().trim().min(5, "Subject must be at least 5 characters").max(200),
  message: z.string().trim().min(20, "Please describe your query in at least 20 characters").max(5000),
  channel: z.nativeEnum(QueryChannel).default(QueryChannel.WEB),
});

export type SubmitQueryInput = z.infer<typeof submitQuerySchema>;

/** FR-05: staff reply (sent manually or approving an AI draft). */
export const replySchema = z.object({
  body: z.string().trim().min(1, "Reply cannot be empty").max(10000),
});

export type ReplyInput = z.infer<typeof replySchema>;

/** FR-09: HOD / admin status override. */
export const overrideSchema = z.object({
  queryId: z.string().min(1),
  status: z.nativeEnum(QueryStatus),
  assignedToId: z.string().optional(),
  note: z.string().max(500).optional(),
});

export type OverrideInput = z.infer<typeof overrideSchema>;

/** FR-11: admin broadcast announcement. */
export const announcementSchema = z.object({
  title: z.string().trim().min(3).max(150),
  body: z.string().trim().min(10).max(5000),
  targetRole: z.nativeEnum({ STUDENT: "STUDENT", INSTRUCTOR: "INSTRUCTOR", HOD: "HOD", ADMIN: "ADMIN" }).optional(),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;

/** OTP login payload validation. */
export const otpLoginSchema = z.object({
  email: z.string().email("Enter a valid email address").max(255),
  otp: z.string().min(6, "Enter the 6-digit code").max(6),
});

export type OtpLoginInput = z.infer<typeof otpLoginSchema>;

/** Request-OTP payload (email only). */
export const requestOtpSchema = z.object({
  email: z.string().email("Enter a valid email address").max(255),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;