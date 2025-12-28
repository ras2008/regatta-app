import { openDB, type DBSchema } from "idb";

export type RosterRow = {
  id: string; // `${className}::${sailNorm}`
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
  method: "manual"; // Phase 1
};

type Meta = {
  rosterLoadedTs?: number;
  workbookName?: string;
  rowCount?: number;
  classes?: string[];
};

interface RegattaDB extends DBSchema {
  roster: { key: string; value: RosterRow; indexes: { "by-class": string; "by-sail": string } };
  events: { key: string; value: EventRow; indexes: { "by-ts": number; "by-type": string; "by-class": string } };
  meta: { key: string; value: Meta };
}

export async function getDB() {
  return openDB<RegattaDB>("regatta-check-db", 1, {
    upgrade(db) {
      const roster = db.createObjectStore("roster", { keyPath: "id" });
      roster.createIndex("by-class", "className");
      roster.createIndex("by-sail", "sailNorm");

      const events = db.createObjectStore("events", { keyPath: "id" });
      events.createIndex("by-ts", "ts");
      events.createIndex("by-type", "type");
      events.createIndex("by-class", "className");

      db.createObjectStore("meta");
    },
  });
}

export function normalizeSail(v: any) {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function flagEmoji(countryRaw?: string) {
  const c = String(countryRaw ?? "").trim();
  if (!c) return "🏳️";
  const iso2 = /^[A-Za-z]{2}$/.test(c) ? c.toUpperCase() : undefined;
  if (!iso2) return "🏳️";
  const codePoints = iso2.split("").map((ch) => 127397 + ch.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

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

export async function addEvent(type: EventType, roster: RosterRow) {
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
    method: "manual",
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