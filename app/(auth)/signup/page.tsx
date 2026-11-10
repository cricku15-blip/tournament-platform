import type { Metadata } from "next";
import { AuthForm } from "@/components/domain/auth/auth-form";
import { safeNext } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="signup" next={safeNext(next)} />;
}
