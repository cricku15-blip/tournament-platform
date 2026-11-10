import { notFound, permanentRedirect } from "next/navigation";
import { getTournamentBySlug, type TournamentFull } from "./queries";

export async function loadTournament(slug: string, sub = ""): Promise<TournamentFull> {
  const lookup = await getTournamentBySlug(slug);
  if (lookup.kind === "missing") notFound();
  if (lookup.kind === "redirect") permanentRedirect(`/tournaments/${lookup.slug}${sub}`);
  return lookup.tournament;
}

/** Turns jsonb prize/award data of unknown shape into displayable lines. */
export function toLines(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(toLines);
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== "" && typeof v !== "object")
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${String(v)}`);
  }
  return [String(value)];
}
