"use client";

import { useEffect, useState } from "react";
import { CloudUpload, CheckCircle2 } from "lucide-react";
import { OUTBOX_EVENT, flushOutbox, readOutbox } from "@/lib/outbox";

/** Sends saved-offline assessments when the connection returns, and says so. */
export default function OutboxSync() {
  const [waiting, setWaiting] = useState(0);
  const [sent, setSent] = useState(0);

  useEffect(() => {
    const refresh = () => setWaiting(readOutbox().length);
    const flush = async () => {
      if (!readOutbox().length) return;
      const n = await flushOutbox();
      refresh();
      if (n) {
        setSent(n);
        setTimeout(() => setSent(0), 5000);
      }
    };
    refresh();
    flush();
    const timer = setInterval(flush, 60_000);
    window.addEventListener("online", flush);
    window.addEventListener(OUTBOX_EVENT, refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", flush);
      window.removeEventListener(OUTBOX_EVENT, refresh);
    };
  }, []);

  if (!waiting && !sent) return null;
  return (
    <div role="status" className="no-print fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-night px-4 py-2 text-xs font-semibold text-white shadow-lg ring-1 ring-neon/40">
      {sent ? (
        <span className="flex items-center gap-2 text-neon">
          <CheckCircle2 className="h-4 w-4" />
          {sent} saved assessment{sent === 1 ? "" : "s"} sent
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <CloudUpload className="h-4 w-4 animate-pulse text-az" />
          {waiting} assessment{waiting === 1 ? "" : "s"} waiting for signal
        </span>
      )}
    </div>
  );
}
