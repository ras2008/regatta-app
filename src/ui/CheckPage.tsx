"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SailCamera from "./SailCamera";
import {
  addEvent,
  findSail,
  flagEmoji,
  getClasses,
  progressSnapshot,
  rosterLoaded,
  type EventType,
} from "../lib/regatta";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
      <div className="h-2 bg-white/70" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Toast({
  show,
  ok,
  title,
  subtitle,
  onClose,
}: {
  show: boolean;
  ok: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "fixed left-1/2 top-4 z-50 w-[92%] max-w-xl -translate-x-1/2 transition",
        show ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-2"
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "rounded-2xl border p-4 shadow-xl backdrop-blur",
          ok ? "border-emerald-500/30 bg-emerald-950/70" : "border-rose-500/30 bg-rose-950/70"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl ring-1",
              ok ? "bg-emerald-500/15 ring-emerald-400/20" : "bg-rose-500/15 ring-rose-400/20"
            )}
          >
            {ok ? "✅" : "⚠️"}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-slate-200/80">{subtitle}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckPage({
  initialMode = "check_out",
}: {
  initialMode?: EventType;
}) {
  const [mode, setMode] = useState<EventType>(initialMode);
  const title = mode === "check_out" ? "Check Out" : "Check In";
  const accent =
    mode === "check_out"
      ? "from-sky-500/20 to-indigo-500/10"
      : "from-emerald-500/20 to-teal-500/10";

  const [loaded, setLoaded] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [sailInput, setSailInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [toast, setToast] = useState<{ show: boolean; ok: boolean; title: string; subtitle?: string }>({
    show: false,
    ok: true,
    title: "",
  });

  const [progress, setProgress] = useState<{ className: string; total: number; done: number }[]>([]);
  const [lastHit, setLastHit] = useState<null | {
    className: string;
    Country: string;
    Sail: string;
    Bow: number;
    Crew: string;
    Club: string;
  }>(null);

  const [camOpen, setCamOpen] = useState(false);

  function showToast(ok: boolean, title: string, subtitle?: string) {
    setToast({ show: true, ok, title, subtitle });
    window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 2200);
  }

  async function refresh(whichMode: EventType = mode) {
    setProgress(await progressSnapshot(whichMode));
  }

  useEffect(() => {
    (async () => {
      const ok = await rosterLoaded();
      setLoaded(ok);
      if (!ok) return;

      setClasses(await getClasses());
      await refresh(mode);
      setTimeout(() => inputRef.current?.focus(), 50);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    refresh(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loaded]);

  const overall = useMemo(() => {
    const total = progress.reduce((s, p) => s + p.total, 0);
    const done = progress.reduce((s, p) => s + p.done, 0);
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, pct };
  }, [progress]);

  async function submit(manualOrMethod: "manual" | "camera" | "live_beta" = "manual", overrideSail?: string) {
    const s = (overrideSail ?? sailInput).trim();
    if (!s) return;

    const roster = await findSail(classFilter as any, s);

    if (!roster) {
      showToast(false, "Sail not found", `Sail “${s}” in ${classFilter === "ALL" ? "All Classes" : classFilter}`);
      return;
    }

    await addEvent(mode, roster, manualOrMethod);
    setLastHit(roster);

    showToast(
      true,
      `${title} confirmed`,
      `${flagEmoji(roster.Country)} ${roster.Crew} • Bow ${roster.Bow} • Sail ${roster.Sail}`
    );

    setSailInput("");
    await refresh(mode);
    inputRef.current?.focus();
  }

  if (!loaded) {
    return (
      <div className="space-y-4">
        <div className={cn("rounded-3xl border border-white/10 bg-white/5 p-6 ring-1 ring-white/5", `bg-gradient-to-br ${accent}`)}>
          <div className="text-2xl font-semibold tracking-tight">Check</div>
          <div className="mt-2 text-slate-300">No roster loaded yet. Upload CSVs in Admin.</div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200">
            Go to <span className="font-mono">/admin</span> → Upload CSVs (one per class).
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast
        show={toast.show}
        ok={toast.ok}
        title={toast.title}
        subtitle={toast.subtitle}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />

      <SailCamera
        open={camOpen}
        onClose={() => setCamOpen(false)}
        onResult={(sail, method) => {
          // Fill input so they can edit if OCR is slightly off
          setSailInput(sail);

          // Auto-submit for speed (works great dockside)
          setTimeout(() => {
            submit(method, sail);
          }, 50);
        }}
      />

      <div className="space-y-6">
        {/* Header */}
        <section className={cn("rounded-3xl border border-white/10 bg-white/5 p-6 ring-1 ring-white/5", `bg-gradient-to-br ${accent}`)}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Check</h1>
              <p className="mt-2 text-slate-300">
                One page for dockside ops. Toggle In/Out, scan sail, or type manually.
              </p>

              {/* Mode Toggle */}
              <div className="mt-4 inline-flex rounded-2xl border border-white/10 bg-slate-950/35 p-1 ring-1 ring-white/5">
                <button
                  onClick={() => setMode("check_out")}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold transition",
                    mode === "check_out" ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/5"
                  )}
                >
                  Check Out
                </button>
                <button
                  onClick={() => setMode("check_in")}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold transition",
                    mode === "check_in" ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/5"
                  )}
                >
                  Check In
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-6">
                <div className="text-slate-300">{title} progress</div>
                <div className="font-semibold text-slate-100">
                  {overall.done}/{overall.total} ({overall.pct}%)
                </div>
              </div>
              <div className="mt-2">
                <ProgressBar pct={overall.pct} />
              </div>
            </div>
          </div>
        </section>

        {/* Entry */}
        <section className="grid gap-4 lg:grid-cols-3">
          {/* Entry Card */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 ring-1 ring-white/5 lg:col-span-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Quick entry</div>
                <div className="mt-1 text-sm text-slate-300">Type a sail number or scan with camera.</div>
              </div>
              <div className="hidden rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-xs text-slate-200 md:block">
                Press <span className="font-mono">Enter</span> to submit
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3 md:items-end">
              <div>
                <label className="text-sm text-slate-300">Class</label>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="ALL">All Classes</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm text-slate-300">Sail number</label>
                <input
                  ref={inputRef}
                  inputMode="numeric"
                  value={sailInput}
                  onChange={(e) => setSailInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit("manual")}
                  placeholder="e.g. 214567"
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCamOpen(true)}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base font-semibold text-slate-100 ring-1 ring-white/5 hover:bg-white/10 active:scale-[0.99]"
            >
              Scan with Camera
              <span className="ml-2 text-xs text-slate-400">(Capture + Live beta)</span>
            </button>

            <button
              onClick={() => submit("manual")}
              className={cn(
                "mt-3 w-full rounded-2xl px-4 py-4 text-base font-semibold shadow-lg ring-1 ring-white/10 transition active:scale-[0.99]",
                mode === "check_out"
                  ? "bg-white text-slate-950 hover:bg-white/90"
                  : "bg-emerald-300 text-slate-950 hover:bg-emerald-200"
              )}
            >
              Confirm {title}
            </button>
          </div>
        </section>

        {/* Progress by class */}

        {/* Sticky Last scanned (bottom) */}
        {lastHit ? (
          <div className="fixed inset-x-0 bottom-20 z-40 md:bottom-6">
            <div className="mx-auto max-w-6xl px-4">
              <div className="rounded-3xl border border-white/10 bg-black/55 p-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
                <div className="flex items-center gap-4">
                  {/* placeholder photo */}
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 ring-1 ring-white/5">
                    <div className="grid h-full w-full place-items-center text-[11px] text-slate-300">No pic</div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Last {mode === "check_out" ? "Checked Out" : "Checked In"}
                    </div>
                    <div className="truncate text-base font-semibold text-white">
                      {flagEmoji(lastHit.Country)} {lastHit.Crew}
                    </div>
                    <div className="truncate text-sm text-slate-300">
                      {lastHit.className} • Bow <span className="font-semibold text-white">{lastHit.Bow}</span> • Sail{" "}
                      <span className="font-semibold text-white">{lastHit.Sail}</span>
                    </div>
                  </div>

                  <div className="hidden text-right text-xs text-slate-400 md:block">Tap scan / enter next</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 ring-1 ring-white/5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">Progress by class</div>
              <div className="mt-1 text-sm text-slate-300">This reflects the current mode ({title}).</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {progress.map((p) => {
              const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <div key={p.className} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 ring-1 ring-white/5">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{p.className}</div>
                    <div className="text-sm text-slate-300">
                      {p.done}/{p.total}
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar pct={pct} />
                  </div>
                  <div className="mt-2 text-xs text-slate-400">{pct}% complete</div>
                </div>
              );
            })}
          </div>
        </section>
    </>
  );
}