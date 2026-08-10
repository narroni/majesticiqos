"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { COUNTRY_LABEL } from "@/lib/country-labels";
import type { OrdersByCountry } from "@/lib/data/admin-analytics";

const COLORS = ["var(--accent)", "var(--success)", "var(--warning)", "var(--fg-muted)"];

export function OrdersByCountryChart({ data }: { data: OrdersByCountry[] }) {
  if (data.length === 0) {
    return <p className="text-fg-muted font-body text-sm">No orders in this window yet.</p>;
  }

  const chartData = data.map((row) => ({ name: COUNTRY_LABEL[row.country], value: row.orderCount }));

  return (
    <div className="flex items-center gap-3">
      <div className="h-28 w-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={28} outerRadius={44} paddingAngle={2}>
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-1">
        {chartData.map((entry, index) => (
          <li key={entry.name} className="text-fg-secondary flex items-center gap-1.5 font-mono text-xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: COLORS[index % COLORS.length] }}
            />
            {entry.name} ({entry.value})
          </li>
        ))}
      </ul>
    </div>
  );
}
