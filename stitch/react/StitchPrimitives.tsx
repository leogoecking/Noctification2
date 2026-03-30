import type { ReactNode } from "react";
import type { StitchMetricCard } from "./stitch-tokens";

const toneClass: Record<NonNullable<StitchMetricCard["tone"]>, string> = {
  default: "text-slate-900",
  info: "text-[#188ace]",
  warning: "text-amber-700",
  danger: "text-[#ba1a1a]",
  success: "text-green-700"
};

export const StitchMetricGrid = ({ items }: { items: StitchMetricCard[] }) => (
  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {items.map((item) => (
      <article key={item.id} className="rounded-xl bg-[#f2f3ff] p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#515f74]">
          {item.label}
        </p>
        <p className={`mt-4 text-4xl font-black ${toneClass[item.tone ?? "default"]}`}>
          {item.value}
        </p>
        {item.detail ? (
          <p className="mt-2 text-xs font-medium text-[#515f74]">{item.detail}</p>
        ) : null}
      </article>
    ))}
  </section>
);

export const StitchSection = ({
  title,
  subtitle,
  children,
  actions
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) => (
  <section className="rounded-2xl bg-[#f2f3ff] p-6">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[#515f74]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
    {children}
  </section>
);

export const StitchTableShell = ({
  columns,
  rows
}: {
  columns: string[];
  rows: Array<Array<ReactNode>>;
}) => (
  <div className="overflow-x-auto rounded-xl bg-white">
    <table className="min-w-full text-left text-sm">
      <thead className="bg-[#e2e7ff]">
        <tr>
          {columns.map((column) => (
            <th
              key={column}
              className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#515f74]"
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-[#f2f3ff]"}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="px-6 py-4 align-top">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
