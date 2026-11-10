"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rpc } from "@/lib/rpc";

export async function withdrawApplication(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Bad request." };
  const supabase = await createClient();
  const r = await rpc("withdraw_application", { p_application_id: id }, supabase);
  if (r.error) return { ok: false, error: r.error.message };
  revalidatePath("/player/applications");
  return { ok: true };
}
