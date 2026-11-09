import type { Metadata } from "next";
import { Barlow_Condensed, Figtree } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sports Tournament Platform",
  description: "Local sports tournament management and live auctions",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;

  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${figtree.variable}`}
      data-theme={theme === "dark" || theme === "light" ? theme : undefined}
    >
      <body className="antialiased min-h-screen bg-surface text-ink font-body">
        {children}
      </body>
    </html>
  );
}
