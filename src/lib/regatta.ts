import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type RosterRow = {
  id: string;
  className: string;
  Country: string;
  Sail: string;
  Bow: number;
  Crew: string;
  Club: string;
  sailNorm: string;
};

export type EventType = "check_in" | "check_out";

export type EventRow = {
  id: string;
  ts: number;
  type: EventType;
  className: string;
  Country: string;
  Sail: string;
  sailNorm: string;
  Bow: number;
  Crew: string;
  Club: string;
  method: "manual" | "camera" | "live_beta";
};

export type Meta = {
  rosterLoadedTs?: number;
  classes?: string[];
  rowCount?: number;
};

export type DollyStatus = "ok" | "missing" | "broken";

export type DollyRow = {
  id: string; // `${className}::${bow}`
  className: string;
  bow: number;
  dolly: number; // default = bow
  status: DollyStatus;
  note?: string;
  updatedTs: number;
};

interface RegattaDB extends DBSchema {
  roster: { key: string; value: RosterRow; indexes: { "by-class": string; "by-sail": string } };
  meta: { key: string; value: Meta };
  events: { key: string; value: EventRow; indexes: { "by-ts": number; "by-type": string; "by-class": string } };
  dollies: { key: string; value: DollyRow; indexes: { "by-class": string; "by-status": string; "by-bow": number } };
}

let _dbPromise: Promise<IDBPDatabase<RegattaDB>> | null = null;

async function getDB() {
  if (_dbPromise) return _dbPromise;

  _dbPromise = openDB<RegattaDB>("regatta-check-db", 3, {
    upgrade(db) {
      // roster
      if (!db.objectStoreNames.contains("roster")) {
        const roster = db.createObjectStore("roster", { keyPath: "id" });
        roster.createIndex("by-class", "className");
        roster.createIndex("by-sail", "sailNorm");
      }

      // meta
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta");
      }

      // events
      if (!db.objectStoreNames.contains("events")) {
        const events = db.createObjectStore("events", { keyPath: "id" });
        events.createIndex("by-ts", "ts");
        events.createIndex("by-type", "type");
        events.createIndex("by-class", "className");
      }

      // dollies (v3)
      if (!db.objectStoreNames.contains("dollies")) {
        const d = db.createObjectStore("dollies", { keyPath: "id" });
        d.createIndex("by-class", "className");
        d.createIndex("by-status", "status");
        d.createIndex("by-bow", "bow");
      }
    },
  });

  return _dbPromise;
}

export function normalizeSail(v: string) {
  const raw = String(v ?? "").trim().toUpperCase();

  // Remove spaces/dashes etc.
  const compact = raw.replace(/\s+/g, "").replace(/[^A-Z0-9]/g, "");

  // If it contains digits, keep only digits (handles USA214567, GBR12345, etc.)
  const digits = compact.replace(/[^0-9]/g, "");

  // Fall back to compact if there are no digits (rare, but safe)
  return digits || compact;
}

export function flagEmoji(countryRaw?: string) {
  const c = String(countryRaw ?? "").trim();
  if (!/^[A-Za-z]{2}$/.test(c)) return "🏳️";
  const iso2 = c.toUpperCase();
  const codePoints = iso2.split("").map((ch) => 127397 + ch.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/* ---------- ROSTER ---------- */

export async function rosterLoaded(): Promise<boolean> {
  const db = await getDB();
  const meta = await db.get("meta", "app");
  return Boolean(meta?.rosterLoadedTs);
}

export async function getClasses(): Promise<string[]> {
  const db = await getDB();
  const meta = await db.get("meta", "app");
  return (meta?.classes ?? []).slice().sort();
}

export async function findSail(className: string | "ALL", sailInput: string): Promise<RosterRow | null> {
  const db = await getDB();
  const sailNorm = normalizeSail(sailInput);

  if (className !== "ALL") {
    const key = `${className}::${sailNorm}`;
    return (await db.get("roster", key)) ?? null;
  }

  const matches = await db.getAllFromIndex("roster", "by-sail", sailNorm);
  return matches[0] ?? null;
}

/* ---------- EVENTS ---------- */

export async function addEvent(type: EventType, roster: RosterRow, method: EventRow["method"]) {
  const db = await getDB();

  const ev: EventRow = {
    id: `ev_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    ts: Date.now(),
    type,
    className: roster.className,
    Country: roster.Country,
    Sail: roster.Sail,
    sailNorm: roster.sailNorm,
    Bow: roster.Bow,
    Crew: roster.Crew,
    Club: roster.Club,
    method,
  };

  await db.put("events", ev);
  return ev;
}

export async function getEvents(): Promise<EventRow[]> {
  const db = await getDB();
  const all = await db.getAll("events");
  all.sort((a, b) => b.ts - a.ts);
  return all;
}

export async function progressSnapshot(type: EventType) {
  const db = await getDB();
  const classes = await getClasses();
  const rosterAll = await db.getAll("roster");
  const events = await getEvents();

  const totalByClass: Record<string, number> = {};
  for (const r of rosterAll) totalByClass[r.className] = (totalByClass[r.className] ?? 0) + 1;

  const doneSetByClass: Record<string, Set<string>> = {};
  for (const e of events.filter((x) => x.type === type)) {
    doneSetByClass[e.className] ??= new Set();
    doneSetByClass[e.className].add(e.sailNorm);
  }

  return classes.map((c) => ({
    className: c,
    total: totalByClass[c] ?? 0,
    done: doneSetByClass[c]?.size ?? 0,
  }));
}

/* ---------- DOLLIES ---------- */

export async function ensureDolliesForRoster() {
  // Create dolly rows for all roster bows (if missing). Dolly defaults to bow.
  const db = await getDB();
  const rosterAll = await db.getAll("roster");

  const tx = db.transaction(["dollies"], "readwrite");
  const store = tx.objectStore("dollies");

  const writes: Promise<IDBValidKey>[] = [];
  for (const r of rosterAll) {
    const id = `${r.className}::${r.Bow}`;
    writes.push(
      store.get(id).then((existing) => {
        if (existing) return id;
        const row: DollyRow = {
          id,
          className: r.className,
          bow: r.Bow,
          dolly: r.Bow,
          status: "ok",
          updatedTs: Date.now(),
        };
        return store.put(row);
      })
    );
  }

  await Promise.all(writes);
  await tx.done;
}

export async function listDollies(className: string | "ALL") {
  const db = await getDB();
  const all = await db.getAll("dollies");
  const filtered = className === "ALL" ? all : all.filter((d) => d.className === className);
  filtered.sort((a, b) => (a.className === b.className ? a.bow - b.bow : a.className.localeCompare(b.className)));
  return filtered;
}

export async function setDollyStatus(className: string, bow: number, status: DollyStatus, note?: string) {
  const db = await getDB();
  const id = `${className}::${bow}`;
  const existing = await db.get("dollies", id);

  const next: DollyRow = {
    id,
    className,
    bow,
    dolly: existing?.dolly ?? bow,
    status,
    note: note?.trim() ? note.trim() : undefined,
    updatedTs: Date.now(),
  };

  await db.put("dollies", next);
  return next;
}