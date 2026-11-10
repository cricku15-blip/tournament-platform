"use client";

import { Button } from "@/components/ui/button";

export default function OrganizerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-lg rounded-card border border-line bg-card p-6 text-center">
      <h1 className="font-display text-2xl font-bold">We couldn&apos;t load this page</h1>
      <p className="mt-2 text-sm text-muted">Please try again. {error.digest ? `Reference: ${error.digest}` : ""}</p>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
