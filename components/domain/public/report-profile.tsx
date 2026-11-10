"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { rpc } from "@/lib/rpc";

export function ReportProfileButton({ profileId }: { profileId: string }) {
  const [open, setOpen] = React.useState(false);
  async function send() {
    const r = await rpc("report_content", { p_target_type: "profile", p_target_id: profileId, p_reason: "Reported from public profile" });
    if (r.error) {
      toast({ title: r.error.code === "not_authenticated" ? "Log in to report a profile." : r.error.message });
      return;
    }
    toast({ title: "Thanks. Our team will take a look." });
  }
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Report profile
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Report this profile?"
        description="Tell us if this profile breaks the rules. Our team reviews every report."
        confirmLabel="Report"
        variant="destructive"
        onConfirm={send}
      />
    </>
  );
}
