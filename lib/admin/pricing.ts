export interface TierRange { id: string; min: number; max: number }

/** Overlap and gap validation for active tiers. The database exclusion constraint is the backstop for overlaps. */
export function validateTiers(tiers: TierRange[]): string | null {
  for (const t of tiers) if (t.max < t.min) return "The maximum teams must be at least the minimum.";
  const s = [...tiers].sort((a, b) => a.min - b.min);
  if (s.length === 0) return "At least one tier is required.";
  if (s[0].min > 3) return "The first tier must start at 3 teams or fewer, so every tournament size is covered.";
  for (let i = 1; i < s.length; i++) {
    if (s[i].min <= s[i - 1].max) return `Tiers overlap: ${s[i - 1].min} to ${s[i - 1].max} and ${s[i].min} to ${s[i].max}.`;
    if (s[i].min > s[i - 1].max + 1) return `There is a gap between ${s[i - 1].max} and ${s[i].min} teams. Every team count needs a tier.`;
  }
  return null;
}
