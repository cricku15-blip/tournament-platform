"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { setTheme, type Theme } from "@/lib/theme";
import { NOTIFICATION_CATEGORIES, type NotificationPrefs } from "@/lib/notifications/categories";
import {
  deleteMyAccount,
  exportMyData,
  logoutEverywhere,
  saveNotificationPrefs,
} from "@/app/(app)/settings/actions";
import { signOut } from "@/app/(auth)/actions";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-card p-5">
      <h2 className="mb-4 font-display text-xl font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsPanels({
  email,
  hasGoogle,
  cityName,
  initialPrefs,
  initialTheme,
}: {
  email: string;
  hasGoogle: boolean;
  cityName: string | null;
  initialPrefs: NotificationPrefs;
  initialTheme: Theme;
}) {
  const router = useRouter();
  const [prefs, setPrefs] = React.useState(initialPrefs);
  const [theme, setThemeState] = React.useState<Theme>(initialTheme);
  const [exporting, setExporting] = React.useState(false);
  const [confirmEmail, setConfirmEmail] = React.useState("");
  const [deleteError, setDeleteError] = React.useState<string | undefined>();
  const [deleteOpen, setDeleteOpen] = React.useState(false);


  async function toggle(cat: string, channel: "inapp" | "email", value: boolean) {
    const next = { ...prefs, [cat]: { ...prefs[cat], [channel]: value } };
    setPrefs(next);
    const r = await saveNotificationPrefs(next);
    if (!r.ok) {
      setPrefs(prefs);
      toast({ title: "Couldn't save that change. Try again." });
    }
  }

  async function onExport() {
    setExporting(true);
    const r = await exportMyData();
    setExporting(false);
    if (!r.ok) return toast({ title: r.error });
    const url = URL.createObjectURL(new Blob([r.json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "groundwar-my-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onDelete() {
    setDeleteError(undefined);
    const r = await deleteMyAccount(confirmEmail);
    if (!r.ok) {
      setDeleteError(r.error);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Account">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Email</dt>
            <dd className="font-semibold text-ink">{email}</dd>
          </div>
          <div>
            <dt className="text-muted">Google</dt>
            <dd className="font-semibold text-ink">{hasGoogle ? "Connected" : "Not connected"}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              await signOut("local");
              router.replace("/login");
              router.refresh();
            }}
          >
            Log out
          </Button>
          <form action={logoutEverywhere}>
            <Button type="submit" variant="secondary">
              Log out of all devices
            </Button>
          </form>
        </div>
      </Panel>

      <Panel title="City">
        <p className="text-sm text-muted">
          Your city is <strong className="text-ink">{cityName ?? "not set"}</strong>. Tournaments and auctions are matched by city.
        </p>
        <Button asChild variant="secondary" className="mt-3">
          <Link href="/profile">Change city in profile</Link>
        </Button>
      </Panel>

      <Panel title="Notifications">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th scope="col" className="pb-2 font-medium">Category</th>
                <th scope="col" className="pb-2 text-center font-medium">In app</th>
                <th scope="col" className="pb-2 text-center font-medium">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {NOTIFICATION_CATEGORIES.map((c) => (
                <tr key={c.key}>
                  <th scope="row" className="py-3 pr-3 text-left font-normal">
                    <p className="font-semibold text-ink">{c.label}</p>
                    <p className="text-xs text-muted">{c.help}</p>
                  </th>
                  {(["inapp", "email"] as const).map((ch) => (
                    <td key={ch} className="py-3 text-center">
                      <Switch
                        checked={prefs[c.key][ch]}
                        disabled={c.locked}
                        onCheckedChange={(v) => toggle(c.key, ch, v)}
                        aria-label={`${c.label} ${ch === "inapp" ? "in app" : "email"}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Appearance">
        <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-2">
          {(["system", "light", "dark"] as const).map((t) => (
            <Button
              key={t}
              role="radio"
              aria-checked={theme === t}
              variant={theme === t ? "primary" : "secondary"}
              onClick={() => {
                setTheme(t);
                setThemeState(t);
              }}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">Language: English</p>
      </Panel>

      <Panel title="Privacy and data">
        <p className="text-sm text-muted">Download a copy of the data we hold about you.</p>
        <Button variant="secondary" className="mt-3" onClick={onExport} loading={exporting}>
          Download my data
        </Button>
      </Panel>

      <section className="rounded-card border border-danger/40 bg-card p-5">
        <h2 className="mb-2 font-display text-xl font-bold text-danger">Danger zone</h2>
        <p className="text-sm text-muted">
          Deleting your account removes your profile and sign-in. Your name is removed from squads and match records, which stay
          in tournaments as an anonymous player. This can&apos;t be undone.
        </p>
        <div className="mt-3 max-w-sm">
          <FormField id="confirm-email" label="Type your email to confirm" error={deleteError}>
            <Input
              id="confirm-email"
              type="email"
              value={confirmEmail}
              placeholder={email}
              error={Boolean(deleteError)}
              onChange={(e) => setConfirmEmail(e.target.value)}
            />
          </FormField>
        </div>
        <Button
          variant="destructive"
          className="mt-3"
          disabled={confirmEmail.trim().toLowerCase() !== email.toLowerCase()}
          onClick={() => setDeleteOpen(true)}
        >
          Delete my account
        </Button>
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete your account?"
          description="Your profile and sign-in are removed permanently. Squad and match history stays, shown as an anonymous player."
          confirmLabel="Delete account"
          variant="destructive"
          onConfirm={onDelete}
        />
      </section>
    </div>
  );
}
