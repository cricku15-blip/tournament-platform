import { z } from "zod";

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_RE, "3 to 20 characters: lowercase letters, numbers and underscores.");

export function ageFromDob(dob: string, today = new Date()): number {
  const d = new Date(`${dob}T00:00:00`);
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

export const MIN_AGE = 13;
export const ADULT_AGE = 18;

export const dobSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth.")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date.")
  .refine((v) => ageFromDob(v) >= 0 && ageFromDob(v) < 100, "Enter a valid date.")
  .refine((v) => ageFromDob(v) >= MIN_AGE, `You must be at least ${MIN_AGE} years old to use GroundWar.`);

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number.")
  .or(z.literal(""));

export const aboutSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80),
  username: usernameSchema,
  phone: phoneSchema.optional().default(""),
  dateOfBirth: dobSchema,
  avatarUrl: z.string().url().nullable().optional(),
});

export const INTENTS = ["play", "manage", "organize"] as const;
export type Intent = (typeof INTENTS)[number];

export const onboardingSchema = z.object({
  cityId: z.string().uuid("Choose your city."),
  about: aboutSchema,
  intents: z.array(z.enum(INTENTS)).min(1, "Pick at least one."),
  sportProfiles: z
    .array(z.object({ sportId: z.string().uuid(), details: z.record(z.string(), z.string()) }))
    .default([]),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const profileEditSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  username: usernameSchema,
  bio: z.string().max(240, "Bio can be up to 240 characters.").default(""),
  phone: phoneSchema.default(""),
  showAge: z.boolean(),
  showCity: z.boolean(),
  showStats: z.boolean(),
});
export type ProfileEditInput = z.infer<typeof profileEditSchema>;
