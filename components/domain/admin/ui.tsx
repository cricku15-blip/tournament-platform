import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Panel({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-card border border-line bg-card p-4", className)}>
      {title && <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>}
      {children}
    </section>
  );
}

/** Dense 14 px table wrapper. */
export function DataTable({ head, children, caption }: { head: string[]; children: React.ReactNode; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-card">
      <table className="w-full text-[14px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-3 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const td = "px-3 py-2 align-top";

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "bad" | "warn" }) {
  const t = { neutral: "bg-surface text-ink border-line", good: "bg-primary/15 text-primary border-primary/30", bad: "bg-danger/15 text-danger border-danger/30", warn: "bg-floodlight/20 text-ink border-floodlight/50" }[tone];
  return <span className={cn("inline-flex rounded-badge border px-2 py-0.5 text-xs font-semibold", t)}>{children}</span>;
}

export function MoreLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <div className="mt-4 text-center">
      <Link href={href} className="inline-flex min-h-11 items-center rounded-input border border-line px-4 text-sm font-semibold hover:bg-surface">{children}</Link>
    </div>
  );
}

export function FilterForm({ children, action }: { children: React.ReactNode; action: string }) {
  return (
    <form method="get" action={action} className="mb-4 flex flex-wrap items-end gap-2 text-sm">
      {children}
      <button type="submit" className="h-11 rounded-input border border-line bg-card px-4 font-semibold hover:bg-surface">Filter</button>
    </form>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1 text-xs font-semibold text-muted">{label}{children}</label>;
}

export const inputCls = "h-11 rounded-input border border-line bg-card px-3 text-sm font-normal text-ink";
