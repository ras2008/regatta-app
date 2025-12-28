import Link from "next/link";

const tiles = [
  { href: "/checkout", title: "Check Out", desc: "Log sailors leaving for the day", kbd: "OUT" },
  { href: "/checkin", title: "Check In", desc: "Log sailors returning", kbd: "IN" },
  { href: "/dollies", title: "Dollies", desc: "Track ok / missing / broken", kbd: "DLY" },
  { href: "/reports", title: "Reports", desc: "Export logs + summaries", kbd: "CSV" },
  { href: "/admin", title: "Admin", desc: "Upload class CSVs", kbd: "SET" },
];

export default function IpadHome() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800/70 bg-white/5 p-6 ring-1 ring-white/5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dockside Dashboard</h1>
            <p className="mt-1 text-slate-300">
              Built for iPad. Tip: Safari → Share → <span className="font-semibold text-slate-100">Add to Home Screen</span>.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-2 text-sm text-slate-200">
            Start URL <span className="rounded-lg bg-white/10 px-2 py-1 font-mono text-xs">/ipad</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group rounded-3xl border border-slate-800/70 bg-white/5 p-6 ring-1 ring-white/5 transition hover:bg-white/10 active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-2xl font-semibold tracking-tight">{t.title}</div>
                <div className="mt-2 text-slate-300">{t.desc}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-slate-200">
                {t.kbd}
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-400 group-hover:text-slate-200">Open →</div>
          </Link>
        ))}
      </section>
    </div>
  );
}