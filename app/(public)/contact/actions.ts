"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { publicDb } from "@/lib/public/client";
import { rateLimit } from "@/lib/rate-limit";
import { CONTACT_TOPICS } from "@/lib/public/content";


const schema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  topic: z.enum(CONTACT_TOPICS),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(2000, "Messages can be up to 2000 characters."),
  website: z.string().max(0).optional(), // honeypot: real users leave it empty
});

export type ContactResult = { ok: true } | { ok: false; error: string; field?: string };

export async function sendContact(input: unknown): Promise<ContactResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    // A filled honeypot looks like success to bots.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { ok: true };
    return { ok: false, error: parsed.error.issues[0].message, field: String(parsed.error.issues[0].path[0]) };
  }
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const limit = await rateLimit(`contact:${ip}`, { max: 5, windowSeconds: 3600 });
  if (!limit.success) return { ok: false, error: "You've sent a few messages already. Please try again later." };

  const { name, email, topic, message } = parsed.data;
  const { error } = await publicDb.from("contact_messages").insert({ name, email, topic, message });
  if (error) return { ok: false, error: "We couldn't send your message. Please try again." };
  return { ok: true };
}
