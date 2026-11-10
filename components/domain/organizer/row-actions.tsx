"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { deleteDraft, duplicateTournament } from "@/app/(app)/organizer/actions";

export function RowActions({ id, name, slug, status }: { id: string; name: string; slug: string; status: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const isDraft = status === "draft";

  async function dup() {
    setBusy(true);
    const r = await duplicateTournament(id);
    setBusy(false);
    if (!r.ok) return toast({ title: r.error });
    toast({ title: "Copied as a new draft" });
    router.push(`/organizer/tournaments/new?draft=${r.id}`);
  }
  async function share() {
    const url = `${window.location.origin}/tournaments/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: url });
    }
  }
  async function del() {
    const r = await deleteDraft(id);
    if (!r.ok) {
      toast({ title: r.error });
      return;
    }
    toast({ title: "Draft deleted" });
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button asChild size="sm" variant="secondary">
        <Link href={isDraft ? `/organizer/tournaments/new?draft=${id}` : `/organizer/tournaments/${id}`}>{isDraft ? "Continue" : "Manage"}</Link>
      </Button>
      <Button size="sm" variant="ghost" onClick={dup} loading={busy}>
        Duplicate
      </Button>
      <Menu.Root>
        <Menu.Trigger asChild>
          <button type="button" aria-label={`More actions for ${name}`} className="flex h-11 w-11 items-center justify-center rounded-input hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary">
            <MoreVertical className="h-4 w-4" aria-hidden />
          </button>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content align="end" className="z-50 min-w-40 rounded-input border border-line bg-card p-1 shadow-lg">
            <Menu.Item onSelect={share} className="flex min-h-11 cursor-pointer items-center rounded px-3 text-sm outline-none data-[highlighted]:bg-surface">
              Share link
            </Menu.Item>
            {isDraft && (
              <Menu.Item onSelect={() => setConfirm(true)} className="flex min-h-11 cursor-pointer items-center rounded px-3 text-sm text-danger outline-none data-[highlighted]:bg-surface">
                Delete draft
              </Menu.Item>
            )}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Delete this draft?" itemName={name} description="This can't be undone." confirmLabel="Delete draft" variant="destructive" onConfirm={del} />
    </div>
  );
}
