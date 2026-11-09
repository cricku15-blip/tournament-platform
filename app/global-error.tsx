"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const errorId = error.digest || "err_critical_crash";

  React.useEffect(() => {
    console.error("[CRITICAL ERROR]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-[#F5F7F9] text-[#0F2A43] font-sans">
        <h1 className="text-3xl font-extrabold mb-3">
          Something went wrong on our side.
        </h1>
        <p className="max-w-md text-sm text-[#5F7389] mb-4">
          A critical system error occurred. Please try reloading the page.
        </p>
        <div className="mb-6 rounded border border-[#DCE3EA] bg-white px-3 py-1.5 text-xs font-mono text-[#5F7389]">
          Ref: {errorId}
        </div>
        <Button variant="primary" onClick={() => reset()}>
          Try again
        </Button>
      </body>
    </html>
  );
}
