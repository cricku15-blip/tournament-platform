import type { Metadata } from "next";
import { AuthForm } from "@/components/domain/auth/auth-form";
import { safeNext } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="login" next={safeNext(next)} />;
}
