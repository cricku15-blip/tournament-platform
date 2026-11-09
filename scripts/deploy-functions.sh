#!/usr/bin/env bash
set -euo pipefail
for f in create-tournament-order create-subscription cancel-subscription process-refund generate-invoice generate-fixtures; do
  supabase functions deploy "$f"
done
supabase functions deploy razorpay-webhook --no-verify-jwt
supabase functions deploy send-email --no-verify-jwt
