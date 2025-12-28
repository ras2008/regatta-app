"use client";

import { useEffect, useMemo, useState } from "react";
import { getEvents, progressSnapshot } from "../../lib/regatta";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function downloadCSV(filename: string, rows: any[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);

  const csv =
    headers.join(",") +
    "\n" +
    rows
      .map((r) =>
        headers
          .map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [summaryOut, setSummaryOut] = useState<any[]>([]);
  const [summaryIn, setSummaryIn] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "check_out" | "check_in">("all");

  useEffect(() => {
    (async () => {
      setEvents(await getEvents());
      setSummaryOut(await progressSnapshot("check_out"));
      setSummaryIn(await progressSnapshot("check_in"));
    })();
  }, []);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => e.type === filter);
  }, [events, filter]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 ring-1 ring-white/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
            <p className="mt-2 text-slate-300">Export event logs and class summaries.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadCSV("events.csv", events)}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 ring-1 ring-white/10 hover:bg-white/90"
            >
              Export Events
            </button>
            <button
              onClick={() => downloadCSV("summary_check_out.csv", summaryOut)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 ring-1 ring-white/5 hover:bg-white/10"
            >
              Export Check-Out Summary
            </button>
            <button
              onClick={() => downloadCSV("summary_check_in.csv", summaryIn)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 ring-1 ring-white/5 hover:bg-white/10"
            >
              Export Check-In Summary
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 ring-1 ring-white/5">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Check-Out Summary</div>
            <div className="text-sm text-slate-300">by class</div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-slate-950/60 text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Checked Out</th>
                </tr>
              </thead>
              <tbody className="bg-slate-950/20">
                {summaryOut.map((s) => (
                  <tr key={s.className} className="border-t border-white/10">
                    <td className="px-4 py-3 font-semibold">{s.className}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{s.total}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{s.done}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 ring-1 ring-white/5">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Check-In Summary</div>
            <div className="text-sm text-slate-300">by class</div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-slate-950/60 text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Checked In</th>
                </tr>
              </thead>
              <tbody className="bg-slate-950/20">
                {summaryIn.map((s) => (
                  <tr key={s.className} className="border-t border-white/10">
                    <td className="px-4 py-3 font-semibold">{s.className}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{s.total}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{s.done}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 ring-1 ring-white/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-lg font-semibold">Event Log</div>
            <div className="mt-1 text-sm text-slate-300">Tap Export to download a CSV.</div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-slate-300">Filter</div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
            >
              <option value="all">All</option>
              <option value="check_out">Check Out</option>
              <option value="check_in">Check In</option>
            </select>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="mt-5 grid gap-3 md:hidden">
          {filteredEvents.slice(0, 50).map((e) => (
            <div key={e.id} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 ring-1 ring-white/5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{e.type.replace("_", " ").toUpperCase()}</div>
                <div className="text-xs text-slate-400">{new Date(e.ts).toLocaleString()}</div>
              </div>
              <div className="mt-2 text-base font-semibold text-slate-100">{e.Crew}</div>
              <div className="mt-1 text-sm text-slate-300">
                {e.className} • Bow {e.Bow} • Sail {e.Sail}
              </div>
              <div className="mt-1 text-sm text-slate-400">{e.Club}</div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="mt-5 hidden overflow-hidden rounded-2xl border border-white/10 md:block">
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-950/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-left">Crew</th>
                  <th className="px-4 py-3 text-right">Bow</th>
                  <th className="px-4 py-3 text-right">Sail</th>
                  <th className="px-4 py-3 text-left">Club</th>
                </tr>
              </thead>
              <tbody className="bg-slate-950/20">
                {filteredEvents.map((e) => (
                  <tr key={e.id} className="border-t border-white/10">
                    <td className="px-4 py-3 text-slate-200">{new Date(e.ts).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-slate-100">{e.type}</td>
                    <td className="px-4 py-3 text-slate-200">{e.className}</td>
                    <td className="px-4 py-3 font-semibold text-slate-100">{e.Crew}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{e.Bow}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{e.Sail}</td>
                    <td className="px-4 py-3 text-slate-300">{e.Club}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}