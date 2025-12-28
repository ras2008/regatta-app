"use client";

import { useEffect, useMemo, useState } from "react";
import { openDB, type DBSchema } from "idb";

type RosterRow = {
  id: string;
  className: string;
  Country: string;
  Sail: string;
  Bow: number;
  Crew: string;
  Club: string;
  sailNorm: string;
};

type Meta = {
  rosterLoadedTs?: number;
  classes?: string[];
  rowCount?: number;
};

interface RegattaDB extends DBSchema {
  roster: { key: string; value: RosterRow };
  meta: { key: string; value: Meta };
  events: { key: string; value: any };
}

async function getDB() {
  return openDB<RegattaDB>("regatta-check-db", 3, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("roster")) db.createObjectStore("roster", { keyPath: "id" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
      if (!db.objectStoreNames.contains("events")) db.createObjectStore("events", { keyPath: "id" });
      if (!db.objectStoreNames.contains("dollies")) {
        db.createObjectStore("dollies", { keyPath: "id" });
      }
    },
  });
}

function normalizeSail(v: string) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9]/g, "");
}

function parseCSVLine(line: string) {
  return line.split(",").map((x) => x.trim());
}

async function parseCSV(file: File) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error(`"${file.name}" has no data rows.`);

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
  const required = ["country", "sail", "bow", "crew", "club"];
  for (const r of required) if (!headers.includes(r)) throw new Error(`"${file.name}" missing column: ${r}`);

  const idx = (name: string) => headers.indexOf(name);
  const className = file.name.replace(/\.csv$/i, "");

  const rows: Array<Omit<RosterRow, "id" | "sailNorm">> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const Country = cols[idx("country")] ?? "";
    const Sail = cols[idx("sail")] ?? "";
    const Bow = Number(cols[idx("bow")]);
    const Crew = cols[idx("crew")] ?? "";
    const Club = cols[idx("club")] ?? "";
    if (!Sail.trim() || !Crew.trim() || !Number.isFinite(Bow)) continue;
    rows.push({ className, Country: Country.trim(), Sail: Sail.trim(), Bow, Crew: Crew.trim(), Club: Club.trim() });
  }
  return rows;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function AdminPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const db = await getDB();
      const m = await db.get("meta", "app");
      setMeta(m ?? null);
    })();
  }, []);

  const niceTime = useMemo(() => (meta?.rosterLoadedTs ? new Date(meta.rosterLoadedTs).toLocaleString() : "—"), [meta]);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;

    setBusy(true);
    setPicked(Array.from(files).map((f) => f.name));
    setStatus("Reading CSV files…");

    try {
      const fileArr = Array.from(files);
      const parsedLists = await Promise.all(fileArr.map((f) => parseCSV(f)));

      const allRows: RosterRow[] = [];
      const classNames = new Set<string>();

      for (let i = 0; i < fileArr.length; i++) {
        const rows = parsedLists[i];
        for (const r of rows) {
          const sailNorm = normalizeSail(r.Sail);
          const id = `${r.className}::${sailNorm}`;
          allRows.push({ ...r, id, sailNorm });
          classNames.add(r.className);
        }
      }

      if (!allRows.length) {
        setStatus("❌ No valid rows found. Headers must be: Country,Sail,Bow,Crew,Club");
        return;
      }

      setStatus(`Saving ${allRows.length} sailors offline…`);

      const db = await getDB();
      const tx = db.transaction(["roster", "meta"], "readwrite");
      const rosterStore = tx.objectStore("roster");
      await rosterStore.clear();

      const writes: Promise<IDBValidKey>[] = [];
      for (const row of allRows) writes.push(rosterStore.put(row));
      await Promise.all(writes);

      const newMeta: Meta = {
        rosterLoadedTs: Date.now(),
        classes: Array.from(classNames).sort(),
        rowCount: allRows.length,
      };

      await tx.objectStore("meta").put(newMeta, "app");
      await tx.done;

      setMeta(newMeta);
      setStatus(`✅ Loaded ${allRows.length} sailors from ${files.length} file(s).`);
    } catch (e: any) {
      setStatus(`❌ Upload failed: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function resetAll() {
    setBusy(true);
    try {
      const db = await getDB();
      const tx = db.transaction(["roster", "meta", "events"], "readwrite");
      await tx.objectStore("roster").clear();
      await tx.objectStore("events").clear();
      await tx.objectStore("meta").delete("app");
      await tx.done;
      setMeta(null);
      setPicked([]);
      setStatus("✅ Cleared roster + events.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 ring-1 ring-white/5">
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-2 text-slate-300">
          Upload <span className="font-semibold text-slate-100">one CSV per class</span>. The filename becomes the class name
          (e.g. <span className="font-mono">ILCA 6.csv</span>).
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-5 ring-1 ring-white/5 lg:col-span-2">
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              multiple
              disabled={busy}
              onChange={(e) => handleUpload(e.target.files)}
              className="hidden"
            />

            <div className="flex flex-wrap gap-2">
              <label
                htmlFor="csv-upload"
                className={cn(
                  "inline-flex cursor-pointer items-center justify-center rounded-2xl px-4 py-3 text-base font-semibold shadow-lg ring-1 ring-white/10 transition active:scale-[0.99]",
                  busy ? "bg-white/10 text-slate-300 cursor-not-allowed" : "bg-white text-slate-950 hover:bg-white/90"
                )}
              >
                Upload CSVs
              </label>

              <button
                onClick={resetAll}
                disabled={busy}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-slate-200 ring-1 ring-white/5 hover:bg-white/10 disabled:opacity-60"
              >
                Reset
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-400">
              Required headers: <span className="font-mono">Country,Sail,Bow,Crew,Club</span>
            </div>

            {picked.length ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm">
                <div className="font-semibold text-slate-100">Selected files</div>
                <ul className="mt-2 space-y-1 text-slate-300">
                  {picked.map((p) => (
                    <li key={p} className="truncate">• {p}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {status ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-100">
                {status}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-5 ring-1 ring-white/5">
            <div className="text-lg font-semibold">Roster status</div>
            <div className="mt-4 space-y-2 text-sm text-slate-200">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Rows</span>
                <span className="font-semibold">{meta?.rowCount ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Classes</span>
                <span className="font-semibold">{meta?.classes?.length ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Loaded</span>
                <span className="font-semibold">{niceTime}</span>
              </div>

              {meta?.classes?.length ? (
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
                  {meta.classes.join(" • ")}
                </div>
              ) : (
                <div className="mt-3 text-xs text-slate-400">
                  No roster yet — upload CSVs.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}