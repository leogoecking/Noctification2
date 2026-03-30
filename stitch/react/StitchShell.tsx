import type { ReactNode } from "react";
import type { StitchNavItem } from "./stitch-tokens";

interface StitchShellProps {
  title: string;
  subtitle: string;
  navItems: StitchNavItem[];
  children: ReactNode;
}

export const StitchShell = ({
  title,
  subtitle,
  navItems,
  children
}: StitchShellProps) => {
  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e]">
      <div className="flex">
        <aside className="hidden min-h-screen w-64 flex-col bg-slate-100 px-4 py-8 lg:flex">
          <div className="mb-8 px-4">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-black text-xs font-bold text-white">
                N
              </div>
              <div>
                <p className="font-bold text-slate-900">Operations</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Precision Orchestrator
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-2">
            {navItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-xs font-medium uppercase tracking-wide ${
                  item.active ? "bg-slate-200 text-slate-900" : "text-slate-500"
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-h-screen flex-1 lg:ml-0">
          <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200/60 bg-[#faf8ff]/90 px-6 backdrop-blur">
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">{title}</h1>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                Stitch reference
              </div>
            </div>
          </header>

          <div className="px-6 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
};
