"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";

export interface ActionField {
  name: string;
  label: string;
  type?: "text" | "date" | "number" | "select" | "textarea";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}

export type AdminResult = { ok: true; message?: string } | { ok: false; error: string };

/** Every data-changing admin action asks for a reason, which the server action writes to the audit log. */
export function ReasonAction({
  label, title, description, action, fields = [], variant = "secondary", size = "sm", confirmLabel, reasonLabel = "Reason (saved in the audit log)", reasonRequired = true, disabled,
}: {
  label: string; title?: string; description?: string; action: (input: Record<string, string> & { reason: string }) => Promise<AdminResult>;
  fields?: ActionField[]; variant?: "primary" | "secondary" | "destructive" | "ghost"; size?: "sm" | "md"; confirmLabel?: string; reasonLabel?: string; reasonRequired?: boolean; disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the form each time the sheet opens
      setValues(Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? ""])));
      setReason("");
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    if (reasonRequired && reason.trim().length < 3) return setError("Write a reason (at least 3 characters).");
    for (const f of fields) if (f.required && !values[f.name]?.trim()) return setError(`${f.label} is required.`);
    setBusy(true);
    setError(null);
    const r = await action({ ...values, reason: reason.trim() });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast({ title: r.message ?? "Done" });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size={size} variant={variant} onClick={() => setOpen(true)} disabled={disabled}>{label}</Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{title ?? label}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            {fields.map((f) => (
              <label key={f.name} className="flex flex-col gap-1">
                <span className="font-semibold">{f.label}</span>
                {f.type === "select" ? (
                  <select className="h-11 rounded-input border border-line bg-card px-2" value={values[f.name] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === "textarea" ? (
                  <Textarea rows={4} value={values[f.name] ?? ""} placeholder={f.placeholder} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
                ) : (
                  <Input type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"} value={values[f.name] ?? ""} placeholder={f.placeholder} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
                )}
              </label>
            ))}
            <label className="flex flex-col gap-1">
              <span className="font-semibold">{reasonLabel}</span>
              <Textarea rows={3} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
            </label>
            {error && <p role="alert" className="text-danger">{error}</p>}
            <Button variant={variant === "destructive" ? "destructive" : "primary"} onClick={submit} loading={busy}>{confirmLabel ?? label}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
