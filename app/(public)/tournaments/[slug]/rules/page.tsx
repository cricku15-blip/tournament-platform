import type { Metadata } from "next";
import { loadTournament, toLines } from "@/lib/public/page-helpers";
import { FORMAT_LABEL } from "@/lib/public/labels";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await loadTournament((await params).slug, "/rules");
  return { title: `Rules | ${t.name}`, description: `Format and rules for ${t.name}.`, alternates: { canonical: `/tournaments/${t.slug}/rules` } };
}

export default async function RulesPage({ params }: Props) {
  const t = await loadTournament((await params).slug, "/rules");
  const rules = (t.rules && typeof t.rules === "object" ? t.rules : {}) as Record<string, unknown>;
  const structured = Object.entries(rules).flatMap(([k, v]) =>
    toLines(v).map((l) => (typeof v === "object" ? l : `${k.replaceAll("_", " ")}: ${l}`))
  );
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <section>
        <h2 className="mb-2 font-display text-2xl font-bold">Format</h2>
        <p>
          {FORMAT_LABEL[t.format] ?? t.format}
          {t.format !== "knockout" ? `, ${t.league_legs === 2 ? "home and away" : "single"} round` : ""}
          {t.third_place_match ? ", with a third place match" : ""}.
        </p>
      </section>
      {structured.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-2xl font-bold">Match rules</h2>
          <ul className="list-disc pl-5">
            {structured.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </section>
      )}
      {t.rules_text && (
        <section>
          <h2 className="mb-2 font-display text-2xl font-bold">Organizer rules</h2>
          <p className="whitespace-pre-line text-ink/90">{t.rules_text}</p>
        </section>
      )}
    </div>
  );
}
