import type { MetadataRoute } from "next";
import { clientEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/organizer", "/manager", "/player", "/dashboard", "/profile", "/settings", "/notifications", "/subscription", "/onboarding", "/login", "/signup", "/auth", "/api"] }],
    sitemap: `${clientEnv.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  };
}
