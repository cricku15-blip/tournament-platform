"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { switchCity } from "@/app/(app)/tournaments/[slug]/apply-player/actions";

export function SwitchCityButton({ cityId, cityName }: { cityId: string; cityName: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Switch to {cityName}</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Switch your city to ${cityName}?`}
        description="Your profile city changes. Existing tournaments and squads are not affected."
        confirmLabel={`Switch to ${cityName}`}
        onConfirm={async () => {
          const r = await switchCity(cityId);
          if (!r.ok) {
            toast({ title: r.error });
            return;
          }
          toast({ title: `City changed to ${cityName}` });
          router.refresh();
        }}
      />
    </>
  );
}
