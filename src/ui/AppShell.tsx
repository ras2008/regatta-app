"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/ipad", label: "Home" },
  { href: "/checkout", label: "Check Out" },
  { href: "/checkin", label: "Check In" },
  { href: "/reports", label: "Reports" },
  { href: "/admin", label: "Admin" },
  { href: "/dollies", title: "Dollies", desc: "Track ok / missing / broken", kbd: "DLY" },
];

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/10">
              ⛵️
            </div>
            <div>
              <div className="text-sm font-semibold leading-5">Regatta Check</div>
              <div className="text-xs text-slate-400">iPad-friendly check in/out + reports</div>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {nav.map((n) => {
              const active = path === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-white/10 text-white ring-1 ring-white/10"
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
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      {/* Bottom nav (mobile / iPad portrait friendly) */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-800/60 bg-slate-950/80 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-5 px-2 py-2">
          {nav.map((n) => {
            const active = path === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "mx-1 rounded-xl px-2 py-2 text-center text-[11px] transition",
                  active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer so bottom nav doesn't cover content */}
      <div className="h-16 md:hidden" />
    </div>
  );
}