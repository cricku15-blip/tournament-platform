import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { CountUpCard } from "@/components/domain/public/count-up-card";
import { CityStrip } from "@/components/domain/public/city-strip";
import { DEFAULT_FAQ } from "@/lib/public/content";

const FaqPreview = dynamic(() => import("@/components/domain/public/faq-list").then((m) => m.FaqList));

export const metadata: Metadata = {
  title: { absolute: "GroundWar | Sports Tournament Platform for local cricket and football" },
  description: "Run local tournaments with live auctions, fixtures, standings and player stats. Built for cricket and football communities.",
  alternates: { canonical: "/" },
};
export const revalidate = 300;

const WAYS = [
  { title: "Organize", text: "Create a tournament, approve teams, generate fixtures and publish results.", href: "/how-it-works" },
  { title: "Manage a team", text: "Build your squad directly or bid for players in a live auction.", href: "/how-it-works" },
  { title: "Play", text: "Apply to tournaments in your city and build a public player profile.", href: "/how-it-works" },
];

export default function LandingPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-primary/20 blur-[110px]" />
        <div aria-hidden className="pitch-lines pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-pill border border-line bg-card/70 px-3 py-1.5 text-xs font-semibold text-muted backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[var(--glow)]" aria-hidden /> Live auctions · Fixtures · Stats
            </p>
            <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.04] sm:text-6xl lg:text-[4rem]">
              Your ground.<br />
              <span className="text-gradient">Your tournament.</span><br />
              Your war.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted">The home for local cricket and football: run the auction, schedule the fixtures and watch the points table update the moment a result goes in.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/tournaments">Find a tournament</Link></Button>
              <Button asChild size="lg" variant="secondary"><Link href="/signup">Create a tournament</Link></Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-sm">
              {[["16", "managers per auction"], ["< 1s", "bid to every screen"], ["₹0", "entry fees taken"]].map(([n, l]) => (
                <div key={l}><dt className="font-display text-2xl font-bold text-primary">{n}</dt><dd className="text-muted">{l}</dd></div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <div aria-hidden className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/25 via-transparent to-clay/20 blur-2xl" />
            <div className="flex flex-col gap-4">
              <CountUpCard />
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-card border border-line bg-card/90 p-4 backdrop-blur-md" aria-label="Example live auction">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-floodlight"><span className="h-2 w-2 animate-pulse rounded-full bg-floodlight" aria-hidden /> Live auction</p>
                  <p className="mt-2 font-display text-lg font-bold">Ravi Kumar</p>
                  <p className="font-display text-4xl font-extrabold tabular-nums text-primary">120</p>
                  <p className="text-xs text-muted">held by Falcons</p>
                </div>
                <div className="rounded-card border border-line bg-card/90 p-4 backdrop-blur-md" aria-label="Example standings">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Points table</p>
                  <ol className="mt-2 flex flex-col gap-1.5 text-sm">
                    {[["Strikers", 8], ["Kings", 6], ["Falcons", 4]].map(([t, p], i) => (
                      <li key={t} className="flex items-center justify-between"><span><span className="mr-2 font-display font-bold text-primary">{i + 1}</span>{t}</span><span className="font-semibold tabular-nums">{p}</span></li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-labelledby="city-strip">
        <div className="mb-5 flex items-end justify-between">
          <h2 id="city-strip" className="font-display text-3xl font-bold">Happening near you</h2>
          <Link href="/tournaments" className="text-sm font-semibold text-primary hover:underline">All tournaments</Link>
        </div>
        <CityStrip />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-labelledby="ways">
        <h2 id="ways" className="mb-5 font-display text-3xl font-bold">Three ways to use it</h2>
        <ul className="grid gap-5 md:grid-cols-3">
          {WAYS.map((w) => (
            <li key={w.title} className="rounded-card border border-line bg-card p-6">
              <h3 className="font-display text-2xl font-bold">{w.title}</h3>
              <p className="mt-2 text-muted">{w.text}</p>
              <Link href={w.href} className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Learn more</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-2">
        <div className="rounded-card border border-line bg-card p-6">
          <h2 className="font-display text-3xl font-bold">Live auctions</h2>
          <p className="mt-2 text-muted">Managers bid in real time with virtual points. Every bid reaches every screen in under a second, and the rules are enforced by the system, not by trust.</p>
        </div>
        <div className="rounded-card border border-line bg-card p-6">
          <h2 className="font-display text-3xl font-bold">From fixtures to standings</h2>
          <p className="mt-2 text-muted">Generate a schedule in one click. Enter a result and the points table, bracket and leaderboards update on their own.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-card bg-primary p-8 text-primary-ink">
          <h2 className="font-display text-3xl font-bold">Running a tournament this season?</h2>
          <p className="mt-2 max-w-xl opacity-90">Set it up in minutes. Pay once per tournament, no hidden charges.</p>
          <Button asChild variant="secondary" className="mt-4"><Link href="/pricing">See pricing</Link></Button>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6" aria-labelledby="faq">
        <h2 id="faq" className="mb-4 font-display text-3xl font-bold">Questions</h2>
        <FaqPreview items={DEFAULT_FAQ.slice(0, 5)} />
        <Link href="/faq" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">More questions</Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 text-center sm:px-6">
        <h2 className="font-display text-4xl font-bold">Ready to play?</h2>
        <Button asChild size="lg" className="mt-4"><Link href="/signup">Create your account</Link></Button>
      </section>
    </>
  );
}
