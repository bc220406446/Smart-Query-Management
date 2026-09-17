"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * FR-06: real-time status tracking.
 *
 * In production this subscribes to a Supabase Realtime channel so the UI swaps
 * in the latest status without a full page refresh. When SUPABASE_URL / ANON_KEY
 * are not configured it falls back to the simple poller (no dependency change).
 */
export default function QueryStatusPoller({
  queryId,
  currentStatus,
}: {
  queryId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [live, setLive] = useState<boolean | null>(null);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let timer: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (timer) return;
      timer = setInterval(async () => {
        try {
          const res = await fetch(`/api/my-queries?id=${queryId}`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            setLastChecked(new Date());
            setLive(false);
            if (data.status !== currentStatus) router.refresh();
          }
        } catch {
          /* retry next tick */
        }
      }, 8000);
    };

    if (!supabaseUrl || !supabaseKey) {
      startPolling();
      return () => { if (timer) clearInterval(timer); };
    }

    // Supabase Realtime path (production).
    let chan: unknown = null;
    let unsub: (() => void) | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const SupabaseModule = require("@supabase/supabase-js");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = (SupabaseModule as any).createClient(supabaseUrl, supabaseKey);
      chan = supabase.channel(`query:${queryId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "queries",
            filter: `id=eq.${queryId}`,
          },
          (payload: { new: { status?: string } | null }) => {
            const row = payload.new as { status?: string } | null;
            if (!row) return;
            setLastChecked(new Date());
            setLive(true);
            if (row.status && row.status !== currentStatus) router.refresh();
          }
        )
        .subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            setLive(true);
            setLastChecked(new Date());
          } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
            setLive(false);
            startPolling();
          }
          unsub = () => {
            try { (chan as { unsubscribe?: () => void }).unsubscribe?.(); } catch {}
          };
        });
    } catch {
      console.warn("Supabase Realtime subscribe failed; falling back to polling.");
      queueMicrotask(() => setLive(false));
      startPolling();
    }

    return () => {
      try { unsub?.(); } catch {}
      if (timer) clearInterval(timer);
    };
  }, [queryId, currentStatus, router]);

  return (
    <p className="mt-1 text-[11px] text-[var(--foreground-soft)]">
      {live === true
        ? "Live · realtime updates active"
        : live === false
        ? `Live updates · polling · last checked ${lastChecked ? lastChecked.toLocaleTimeString() : "-"}`
        : "Live updates · connecting…"}
    </p>
  );
}
