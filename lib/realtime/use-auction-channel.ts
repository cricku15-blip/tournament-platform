"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/browser";
import { applySnapshot, initialState, reduce, type AuctionEvent, type AuctionState, type Snapshot } from "./auction-reducer";
import { fetchSnapshot } from "./snapshot";

export type Connection = "connected" | "reconnecting" | "offline";

type Action = { kind: "event"; event: AuctionEvent } | { kind: "snapshot"; snapshot: Snapshot };

const RESYNC_MS = 20_000;
const HIDDEN_LIMIT_MS = 60_000;
const EVENTS = ["lot_selected", "bidding_opened", "bid_placed", "bid_undone", "going_once", "going_twice", "lot_sold", "lot_unsold", "auction_started", "auction_paused", "auction_resumed", "auction_ended"] as const;

/**
 * Broadcast channel `auction:<id>` plus database snapshots (RULES section 5).
 * - The database is the source of truth: resync on connect, reconnect, focus and every 20 s.
 * - Unsubscribes on unmount and when the tab has been hidden for 60 s; resubscribes on focus.
 * - Presence is only used when `presenceKey` is given (auctioneer and managers). Spectators never join presence.
 */
export function useAuctionChannel(tournamentId: string, opts: { presenceKey?: string } = {}) {
  const [state, dispatch] = React.useReducer((s: AuctionState, a: Action) => (a.kind === "event" ? reduce(s, a.event) : applySnapshot(s, a.snapshot)), initialState);
  const [connection, setConnection] = React.useState<Connection>("reconnecting");
  const [online, setOnline] = React.useState<string[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [syncError, setSyncError] = React.useState(false);
  const presenceKey = opts.presenceKey;

  const refresh = React.useCallback(async () => {
    try {
      const snap = await fetchSnapshot(createClient(), tournamentId);
      dispatch({ kind: "snapshot", snapshot: snap });
      setLoaded(true);
      setSyncError(false);
    } catch {
      setSyncError(true);
    }
  }, [tournamentId]);

  React.useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let hiddenAt: number | null = null;
    let disposed = false;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
      if (channel) void supabase.removeChannel(channel);
      channel = null;
    };

    const start = () => {
      if (disposed || channel) return;
      const ch = supabase.channel(`auction:${tournamentId}`, { config: { broadcast: { self: false }, ...(presenceKey ? { presence: { key: presenceKey } } : {}) } });
      for (const type of EVENTS) {
        ch.on("broadcast", { event: type }, ({ payload }) => dispatch({ kind: "event", event: { type, payload } as AuctionEvent }));
      }
      if (presenceKey) {
        ch.on("presence", { event: "sync" }, () => setOnline(Object.keys(ch.presenceState())));
      }
      ch.subscribe((status) => {
        if (disposed) return;
        if (status === "SUBSCRIBED") {
          setConnection(navigator.onLine ? "connected" : "offline");
          if (presenceKey) void ch.track({ at: Date.now() });
          void refresh(); // on first connect and on every reconnect
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnection(navigator.onLine ? "reconnecting" : "offline");
        }
      });
      channel = ch;
      timer = setInterval(() => void refresh(), RESYNC_MS);
    };

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        // Give a brief tab switch a grace period; only drop the connection if hidden for over 60 s.
        setTimeout(() => {
          if (document.hidden && hiddenAt && Date.now() - hiddenAt >= HIDDEN_LIMIT_MS - 50) stop();
        }, HIDDEN_LIMIT_MS);
      } else {
        hiddenAt = null;
        if (!channel) start();
        void refresh(); // on tab focus
      }
    };
    const onOnline = () => {
      setConnection("reconnecting");
      void refresh();
    };
    const onOffline = () => setConnection("offline");

    start();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial snapshot load from the database
    void refresh();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      stop();
    };
  }, [tournamentId, presenceKey, refresh]);

  return { state, connection, online, loaded, syncError, refresh };
}
