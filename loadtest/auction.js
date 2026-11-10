import http from "k6/http";
import ws from "k6/ws";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

// 300 spectators (Realtime broadcast listeners) + 16 bidders who all bid in the same second, for each lot.
const URL = __ENV.SUPABASE_URL;
const KEY = __ENV.ANON_KEY;
const TID = __ENV.TOURNAMENT_ID;
const TOKENS = (__ENV.BIDDER_TOKENS || "").split(",").filter(Boolean);

const accepted = new Counter("bids_accepted");
const rejectedChanged = new Counter("bids_rejected_bid_changed");
const toScreen = new Trend("bid_to_screen_ms", true);

export const options = {
  scenarios: {
    spectators: { executor: "constant-vus", vus: 300, duration: "10m", exec: "spectator" },
    bidders: { executor: "per-vu-iterations", vus: Math.max(TOKENS.length, 1), iterations: 1, maxDuration: "10m", exec: "bidder", startTime: "20s" },
  },
  thresholds: { bid_to_screen_ms: ["p(95)<1000"], checks: ["rate>0.99"] },
};

const rest = (path, body, token) => http.post(`${URL}/rest/v1/rpc/${path}`, JSON.stringify(body), { headers: { apikey: KEY, Authorization: `Bearer ${token || KEY}`, "Content-Type": "application/json" } });

export function spectator() {
  const url = `${URL.replace("https", "wss")}/realtime/v1/websocket?apikey=${KEY}&vsn=1.0.0`;
  ws.connect(url, {}, (socket) => {
    socket.on("open", () => {
      socket.send(JSON.stringify({ topic: `realtime:auction:${TID}`, event: "phx_join", payload: { config: { broadcast: { self: false } } }, ref: "1" }));
      socket.setInterval(() => socket.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: "hb" })), 25000);
    });
    socket.on("message", (m) => {
      const msg = JSON.parse(m);
      if (msg.event === "broadcast" && msg.payload && msg.payload.event === "bid_placed" && msg.payload.payload.sent_at) toScreen.add(Date.now() - msg.payload.payload.sent_at);
    });
    socket.setTimeout(() => socket.close(), 9 * 60 * 1000);
  });
}

export function bidder() {
  const token = TOKENS[(__VU - 1) % TOKENS.length];
  for (let lot = 0; lot < 50; lot++) {
    // The organizer (a separate script or the console) puts one lot on the block and opens bidding. Poll until one is open.
    let l = null;
    for (let tries = 0; tries < 60 && !l; tries++) {
      const r = http.get(`${URL}/rest/v1/auction_lots?tournament_id=eq.${TID}&status=eq.on_block&bidding_open=eq.true&select=id,current_bid`, { headers: { apikey: KEY, Authorization: `Bearer ${token}` } });
      if (r.status === 200 && r.json().length) l = r.json()[0];
      else sleep(1);
    }
    if (!l) continue;
    const next = rest("next_bid_amount", { p_lot_id: l.id }, token).json();
    // Everyone fires at the same moment. The database must accept exactly one bid for this step.
    const r = rest("place_bid", { p_lot_id: l.id, p_expected_amount: next }, token);
    if (r.status === 200 || r.status === 204) accepted.add(1);
    else if (String(r.body).includes("bid_changed") || String(r.body).includes("already_highest")) rejectedChanged.add(1);
    check(r, { "bid either accepted or rejected cleanly": (x) => x.status < 500 });
    sleep(3);
  }
}
