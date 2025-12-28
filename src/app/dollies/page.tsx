"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureDolliesForRoster, getClasses, listDollies, setDollyStatus, type DollyRow, type DollyStatus } from "../../lib/regatta";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function DolliesPage() {
  const [classes, setClasses] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [rows, setRows] = useState<DollyRow[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      await ensureDolliesForRoster();
      setClasses(await getClasses());
      setRows(await listDollies("ALL"));
    })();
  }, []);

  useEffect(() => {
    (async () => setRows(await listDollies(classFilter)))();
  }, [classFilter]);

  const counts = useMemo(() => {
    const c = { ok: 0, missing: 0, broken: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);

  async function update(row: DollyRow, next: DollyStatus) {
    await setDollyStatus(row.className, row.bow, next, row.note);
    setRows(await listDollies(classFilter));
    setStatusMsg(`Saved: ${row.className} Bow ${row.bow} → ${next.toUpperCase()}`);
    setTimeout(() => setStatusMsg(""), 1500);
  }

  async function updateNote(row: DollyRow, note: string) {
    await setDollyStatus(row.className, row.bow, row.status, note);
    setRows(await listDollies(classFilter));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 ring-1 ring-white/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dolly Tracking</h1>
            <p className="mt-2 text-slate-300">Dolly defaults to Bow #. Mark problems so the ramp doesn’t explode.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-slate-300">Class</div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-white/20"
            >
              <option value="ALL">All</option>
              {classes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {(["ok","missing","broken"] as const).map((k) => (
            <div key={k} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 ring-1 ring-white/5">
              <div className="text-xs text-slate-400">{k.toUpperCase()}</div>
              <div className="mt-1 text-2xl font-semibold">{(counts as any)[k]}</div>
            </div>
          ))}
        </div>

        {statusMsg ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-sm text-slate-100">
            ✅ {statusMsg}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 ring-1 ring-white/5">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-950/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-right">Bow</th>
                  <th className="px-4 py-3 text-right">Dolly</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Note</th>
                </tr>
              </thead>
              <tbody className="bg-slate-950/20">
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-white/10 align-top">
                    <td className="px-4 py-3 font-semibold">{r.className}</td>
                    <td className="px-4 py-3 text-right font-semibold">{r.bow}</td>
                    <td className="px-4 py-3 text-right">{r.dolly}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {(["ok","missing","broken"] as DollyStatus[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => update(r, s)}
                            className={cn(
                              "rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition",
                              r.status === s
                                ? "bg-white text-slate-950 ring-white/10"
                                : "bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10"
                            )}
                          >
                            {s.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        defaultValue={r.note ?? ""}
                        onBlur={(e) => updateNote(r, e.target.value)}
                        placeholder="Optional…"
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                      />
                      <div className="mt-1 text-[11px] text-slate-500">
                        Saves on blur
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No dolly rows yet. Upload roster in Admin first.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}