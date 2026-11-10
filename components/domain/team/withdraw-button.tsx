"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { withdrawApplication } from "@/app/(app)/player/actions";

export function WithdrawButton({ id, tournament }: { id: string; tournament: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Withdraw</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Withdraw your application?"
        itemName={tournament}
        description="You can apply again later while registration is open."
        confirmLabel="Withdraw"
        variant="destructive"
        onConfirm={async () => {
          const r = await withdrawApplication(id);
          if (!r.ok) {
            toast({ title: r.error });
            return;
          }
          toast({ title: "Application withdrawn" });
          router.refresh();
        }}
      />
    </>
  );
}
