import type { Database } from "@/types/supabase";
import { getErrorMessage } from "./errors";
import { createClient as createBrowserClient } from "./supabase/browser";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RpcFunctions = Database["public"]["Functions"];
export type RpcName = keyof RpcFunctions;

export interface RpcError {
  code: string;
  message: string;
}

export type RpcResult<T> =
  | { data: T; error: null }
  | { data: null; error: RpcError };

/**
 * Typed wrapper for Supabase RPC function calls.
 * Normalizes Postgres exceptions into user-friendly error codes and messages.
 */
export async function rpc<TName extends RpcName>(
  name: TName,
  args?: RpcFunctions[TName]["Args"],
  customClient?: SupabaseClient<Database>
): Promise<RpcResult<RpcFunctions[TName]["Returns"]>> {
  try {
    let client = customClient;

    if (!client) {
      // Server callers must pass their own client (createClient from lib/supabase/server);
      // importing it here would pull next/headers into client bundles.
      if (typeof window === "undefined") {
        throw new Error("rpc_server_client_required");
      }
      client = createBrowserClient();
    }

    // Call Supabase RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client as any).rpc(name, args ?? {});

    if (response.error) {
      const code = response.error.message || response.error.code || "unknown_error";
      const message = getErrorMessage(code);
      return {
        data: null,
        error: {
          code,
          message,
        },
      };
    }

    return {
      data: response.data,
      error: null,
    };
  } catch (err: unknown) {
    const rawMessage = err instanceof Error ? err.message : String(err);
    return {
      data: null,
      error: {
        code: rawMessage,
        message: getErrorMessage(rawMessage),
      },
    };
  }
}
