import http from "k6/http";
import { check, sleep } from "k6";

const URL = __ENV.SUPABASE_URL;
const KEY = __ENV.ANON_KEY;
const TID = __ENV.TOURNAMENT_ID;
const TOKENS = (__ENV.TOKENS || "").split(",").filter(Boolean);

export const options = { scenarios: { chat: { executor: "constant-vus", vus: 100, duration: "10m" } }, thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<500"] } };

export default function () {
  const token = TOKENS[(__VU - 1) % TOKENS.length];
  const r = http.post(`${URL}/rest/v1/rpc/post_chat_message`, JSON.stringify({ p_tid: TID, p_body: `load test ${__VU}-${__ITER}` }), { headers: { apikey: KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  check(r, { "message posted": (x) => x.status === 200 });
  sleep(5);
}
