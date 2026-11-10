import * as React from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { Footer } from "@/components/layout/footer";
import { getCities } from "@/lib/public/queries";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cities = await getCities().catch(() => undefined);
  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink font-body">
      <PublicHeader cities={cities} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
