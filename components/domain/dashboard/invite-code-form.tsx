"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteCodeForm() {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  return (
    <form
      className="mx-auto mt-6 flex max-w-sm gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const c = code.trim();
        if (/^[A-Za-z0-9_-]{4,64}$/.test(c)) router.push(`/join/${encodeURIComponent(c)}`);
      }}
    >
      <label htmlFor="invite" className="sr-only">
        Invite code
      </label>
      <Input id="invite" placeholder="Have an invite code?" value={code} onChange={(e) => setCode(e.target.value)} />
      <Button type="submit" variant="secondary">
        Go
      </Button>
    </form>
  );
}
