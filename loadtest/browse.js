import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  scenarios: { browse: { executor: "ramping-vus", stages: [{ duration: "2m", target: 1000 }, { duration: "6m", target: 1000 }, { duration: "2m", target: 0 }] } },
  thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<800"] },
};

export function setup() {
  const res = http.get(`${BASE}/api/public/tournaments`);
  const items = res.status === 200 ? res.json("items") : [];
  return { slugs: (items || []).map((t) => t.slug) };
}

export default function (data) {
  const pages = ["/", "/tournaments", "/tournaments?sport=cricket", "/pricing", "/faq"];
  for (const p of pages.sort(() => Math.random() - 0.5).slice(0, 2)) {
    const r = http.get(`${BASE}${p}`, { tags: { name: p } });
    check(r, { "public page ok": (x) => x.status === 200 });
    sleep(Math.random() * 3 + 1);
  }
  if (data.slugs.length) {
    const slug = data.slugs[Math.floor(Math.random() * data.slugs.length)];
    for (const tab of ["", "/teams", "/fixtures", "/standings", "/stats"]) {
      const r = http.get(`${BASE}/tournaments/${slug}${tab}`, { tags: { name: `/tournaments/[slug]${tab}` } });
      check(r, { "tournament tab ok": (x) => x.status === 200 });
      sleep(Math.random() * 2 + 1);
    }
  }
}
