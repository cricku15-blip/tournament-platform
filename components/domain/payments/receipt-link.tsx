"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { getReceiptUrl } from "@/lib/payments/actions";

export function ReceiptLink({ kind, paymentId, label = "Receipt" }: { kind: "tournament" | "subscription"; paymentId: string; label?: string }) {
  const [busy, setBusy] = React.useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        const r = await getReceiptUrl(kind, paymentId);
        setBusy(false);
        if (!r.ok) return toast({ title: r.error });
        window.open(r.url, "_blank", "noopener,noreferrer");
      }}
    >
      {label}
    </Button>
  );
}
