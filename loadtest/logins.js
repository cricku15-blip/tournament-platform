import http from "k6/http";
import { check } from "k6";

const URL = __ENV.SUPABASE_URL;
const KEY = __ENV.ANON_KEY;
const PASSWORD = __ENV.PASSWORD;

export const options = {
  scenarios: { logins: { executor: "per-vu-iterations", vus: 200, iterations: 1, maxDuration: "2m" } },
  thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<2000"] },
};

// Seeded users are seed1@example.test ... seed15000@example.test and need a known password (set it on staging only).
export default function () {
  const n = ((__VU - 1) % 15000) + 1;
  const r = http.post(`${URL}/auth/v1/token?grant_type=password`, JSON.stringify({ email: `seed${n}@example.test`, password: PASSWORD }), { headers: { apikey: KEY, "Content-Type": "application/json" } });
  check(r, { "logged in": (x) => x.status === 200 && !!x.json("access_token") });
}
