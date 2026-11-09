import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "./supabase/server";
import type { Database } from "@/types/supabase";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type UserRole = "player" | "manager" | "organizer" | "admin";

export interface UserRoles {
  player: true;
  organizer: boolean;
  manager: boolean;
  admin: boolean;
}

/**
 * Gets the authenticated session user, cached per request.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Gets the authenticated user's profile, cached per request.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return profile;
});

/**
 * Derives user roles from owned tournaments, managed teams, and admin flag.
 * Cached per request.
 */
export const getUserRoles = cache(async (): Promise<UserRoles> => {
  const user = await getSessionUser();
  if (!user) {
    return {
      player: true,
      organizer: false,
      manager: false,
      admin: false,
    };
  }

  const profile = await getProfile();
  const supabase = await createClient();

  const [tournamentsResult, teamsResult] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id")
      .eq("organizer_id", user.id)
      .limit(1),
    supabase
      .from("teams")
      .select("id")
      .eq("manager_id", user.id)
      .limit(1),
  ]);

  const hasTournaments = (tournamentsResult.data?.length ?? 0) > 0;
  const hasTeams = (teamsResult.data?.length ?? 0) > 0;

  return {
    player: true,
    organizer: hasTournaments,
    manager: hasTeams,
    admin: Boolean(profile?.is_admin),
  };
});

/**
 * Resolves the active role for the current user.
 * Stored in the `active_role` cookie; falls back to the highest available role or "player".
 */
export async function getActiveRole(): Promise<UserRole> {
  const roles = await getUserRoles();
  const cookieStore = await cookies();
  const savedRole = cookieStore.get("active_role")?.value as UserRole | undefined;

  // Verify that the requested saved role is actually granted
  if (savedRole && isValidRoleForUser(savedRole, roles)) {
    return savedRole;
  }

  // Fallback to highest available role
  if (roles.organizer) return "organizer";
  if (roles.manager) return "manager";
  if (roles.admin) return "admin";
  return "player";
}

export function isValidRoleForUser(role: UserRole, roles: UserRoles): boolean {
  if (role === "player") return true;
  if (role === "organizer") return roles.organizer;
  if (role === "manager") return roles.manager;
  if (role === "admin") return roles.admin;
  return false;
}
