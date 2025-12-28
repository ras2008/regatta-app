import Link from "next/link";

const tiles = [
  { href: "/check", title: "Check", desc: "Check In / Out (toggle)", tag: "IN/OUT", icon: "✅" },
  { href: "/dollies", title: "Dollies", desc: "Track ok / missing / broken", tag: "DLY", icon: "🛞" },
  { href: "/reports", title: "Reports", desc: "Export logs + summaries", tag: "CSV", icon: "📄" },
  { href: "/admin", title: "Admin", desc: "Upload class CSVs", tag: "SET", icon: "⚙️" },
];

export default function IpadHome() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 ring-1 ring-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-200">
              <span className="opacity-90">⛵️</span>
              Dockside Dashboard
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Ready for the ramp.
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Fast check-in/out, dolly tracking, and reports—built for iPad & mobile.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/25 p-4 text-sm text-slate-200 ring-1 ring-white/5">
            <div className="text-xs text-slate-400">Tip</div>
            <div className="mt-1">
              iPad Safari → Share → <span className="font-semibold text-white">Add to Home Screen</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tiles */}
      <section className="grid gap-4 md:grid-cols-2">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 ring-1 ring-white/5 transition hover:bg-white/10 active:scale-[0.99]"
          >
            <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            </div>

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="text-2xl font-semibold tracking-tight">{t.title}</div>
                <div className="mt-2 text-slate-300">{t.desc}</div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-black/25 text-xl">
                  {t.icon}
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-1 text-xs font-semibold text-slate-200">
                  {t.tag}
                </div>
              </div>
            </div>

            <div className="relative mt-4 text-sm text-slate-400 group-hover:text-slate-200">
              Open →
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}