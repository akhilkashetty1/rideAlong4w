/**
 * Offline outbox. A ride-along happens on the road, where signal drops. If a
 * submission can't reach the server, it's kept in this browser's localStorage
 * and sent automatically when the connection comes back (see OutboxSync).
 * An item leaves the outbox only once the server has accepted it.
 */
const KEY = "ride-along-4w:outbox";
export const OUTBOX_EVENT = "ride-along-4w:outbox";

type Queued = { id: string; payload: unknown; queuedAt: string };

export function readOutbox(): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(items: Queued[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
  window.dispatchEvent(new Event(OUTBOX_EVENT));
}

/** Returns false if the device can't store it either. */
export function enqueue(payload: unknown) {
  const items = readOutbox();
  items.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, payload, queuedAt: new Date().toISOString() });
  write(items);
  return readOutbox().length === items.length;
}

export const postSubmission = (payload: unknown) =>
  fetch("/api/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

/** A failed fetch (no response at all) means the network, not the server, is the problem. */
export const isNetworkError = (err: unknown) => err instanceof TypeError || (typeof navigator !== "undefined" && !navigator.onLine);

let flushing = false;

export async function flushOutbox(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const item of readOutbox()) {
      let res: Response;
      try {
        res = await postSubmission(item.payload);
      } catch {
        break; // still offline — try again later
      }
      if (res.ok) {
        sent++;
        write(readOutbox().filter((i) => i.id !== item.id));
      } else if (res.status === 400) {
        // The server will never accept this one. Park it (never delete answers) and keep the queue moving.
        console.error("Outbox item rejected by server", item.id, await res.text().catch(() => ""));
        try {
          const parked = JSON.parse(localStorage.getItem(`${KEY}:rejected`) ?? "[]");
          localStorage.setItem(`${KEY}:rejected`, JSON.stringify([...parked, item]));
        } catch {}
        write(readOutbox().filter((i) => i.id !== item.id));
      } else break;
    }
  } finally {
    flushing = false;
  }
  return sent;
}
