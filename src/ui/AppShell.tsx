"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/ipad", label: "Home", icon: "🏠" },
  { href: "/check", label: "Check", icon: "✅" },
  { href: "/dollies", label: "Dollies", icon: "🛞" },
  { href: "/reports", label: "Reports", icon: "📄" },
  { href: "/admin", label: "Admin", icon: "⚙️" },
];

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/ipad" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
              ⛵️
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Regatta Check</div>
              <div className="text-xs text-slate-400">Dockside ops</div>
            </div>
          </Link>

          {/* Desktop nav pills */}
          <div className="hidden items-center gap-2 md:flex">
            {nav.map((n) => {
              const active = path === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm transition ring-1 ring-transparent",
                    active
                      ? "bg-white/10 text-white ring-white/10"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden">
        <div className="mx-auto max-w-6xl px-3 pb-3">
          <div className="rounded-3xl border border-white/10 bg-black/55 backdrop-blur-xl shadow-2xl">
            <div className="grid grid-cols-5 gap-1 p-2">
              {nav.map((n) => {
                const active = path === n.href;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-2xl px-2 py-2 transition",
                      active ? "bg-white/12" : "hover:bg-white/5"
                    )}
                  >
                    <div
                      className={cn(
                        "text-lg",
                        active ? "opacity-100" : "opacity-85"
                      )}
                    >
                      {n.icon}
                    </div>
                    <div
                      className={cn(
                        "mt-1 text-[11px] font-semibold",
                        active ? "text-white" : "text-slate-300"
                      )}
                    >
                      {n.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
          {/* iOS home indicator spacing */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </nav>
    </div>
  );
}