import http from "k6/http";
import crypto from "k6/crypto";
import { check } from "k6";

const URL = __ENV.FUNCTION_URL; // e.g. https://<ref>.supabase.co/functions/v1/razorpay-webhook
const SECRET = __ENV.WEBHOOK_SECRET;

export const options = { scenarios: { replay: { executor: "shared-iterations", vus: 20, iterations: 500, maxDuration: "5m" } }, thresholds: { http_req_failed: ["rate<0.01"] } };

export default function () {
  // About one event in four is a duplicate of an earlier one: the function must treat repeats as no-ops.
  const id = `evt_load_${Math.floor(__ITER * 0.75)}`;
  const body = JSON.stringify({ event: "payment.failed", id, payload: { payment: { entity: { id: `pay_load_${id}`, order_id: `order_load_${id}`, status: "failed" } } } });
  const sig = crypto.hmac("sha256", SECRET, body, "hex");
  const r = http.post(URL, body, { headers: { "Content-Type": "application/json", "x-razorpay-signature": sig, "x-razorpay-event-id": id } });
  check(r, { "accepted (200)": (x) => x.status === 200 });
  const bad = http.post(URL, body, { headers: { "Content-Type": "application/json", "x-razorpay-signature": "0".repeat(64) } });
  check(bad, { "bad signature rejected": (x) => x.status === 400 || x.status === 401 });
}
