export function LegalPage({
  title,
  intro,
  sections,
  version,
  updated,
}: {
  title: string;
  intro?: string;
  sections: Array<{ id: string; title: string; body: string[] }>;
  version: string;
  updated: string;
}) {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Table of contents" className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">On this page</p>
        <ul className="flex flex-col gap-1 text-sm">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="block min-h-9 py-1.5 text-muted hover:text-primary">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <article>
        <h1 className="font-display text-4xl font-bold text-ink">{title}</h1>
        <p className="mt-1 text-sm text-muted">
          Version {version} · Last updated {updated}
        </p>
        <p className="mt-4 rounded-input border border-line bg-surface p-3 text-sm text-muted">
          This document is a working draft and is pending legal review before launch.
        </p>
        {intro && <p className="mt-5 text-ink/90">{intro}</p>}
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="mt-8 scroll-mt-24">
            <h2 className="font-display text-2xl font-bold text-ink">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-2 text-ink/90">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
