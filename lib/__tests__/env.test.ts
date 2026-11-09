import { describe, it, expect } from "vitest";

describe("env validation", () => {
  it("loads client env correctly", async () => {
    const { clientEnv } = await import("../env");
    expect(clientEnv.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
  });

  it("throws error when accessing serverEnv in browser/client context", async () => {
    // In JSDOM, window is defined by default
    const { serverEnv } = await import("../env");
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      serverEnv.SUPABASE_SERVICE_ROLE_KEY;
    }).toThrow(/SECURITY ERROR/);
  });

  it("serverEnv loads properly when window is undefined (on server)", async () => {
    const originalWindow = global.window;
    // @ts-expect-error Mocking server environment
    delete (global as unknown as { window?: Window }).window;

    const { serverEnv } = await import("../env");
    expect(serverEnv.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();

    global.window = originalWindow;
  });
});
