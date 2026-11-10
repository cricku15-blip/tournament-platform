import type { Metadata } from "next";
import { CheckEmail } from "@/components/domain/auth/check-email";
import { emailSchema, safeNext } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Check your email" };

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string; expired?: string }>;
}) {
  const sp = await searchParams;
  const parsed = emailSchema.safeParse(sp.email ?? "");
  return <CheckEmail email={parsed.success ? parsed.data : ""} next={safeNext(sp.next)} expired={sp.expired === "1"} />;
}
