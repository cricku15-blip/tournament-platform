import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { csvCell } from "@/lib/csv";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const status = request.nextUrl.searchParams.get("status");
  let q = createAdminClient().from("tournament_payments").select("id, tournament_id, kind, amount_paise, tax_paise, total_paise, status, razorpay_order_id, razorpay_payment_id, paid_at, created_at").order("created_at", { ascending: false }).limit(5000);
  if (status && ["created", "paid", "failed", "refunded"].includes(status)) q = q.eq("status", status as "paid");
  const { data } = await q;
  const head = ["id", "tournament_id", "kind", "amount_paise", "tax_paise", "total_paise", "status", "razorpay_order_id", "razorpay_payment_id", "paid_at", "created_at"];
  const csv = "﻿" + [head, ...(data ?? []).map((r) => head.map((h) => (r as Record<string, unknown>)[h]))].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="organizer-payments.csv"', "Cache-Control": "private, no-store" } });
}
