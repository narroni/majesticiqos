"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { RevenueByDay } from "@/lib/data/admin-analytics";

export function RevenueChart({ data }: { data: RevenueByDay[] }) {
  const chartData = data.map((point) => ({
    day: point.day.slice(5),
    revenue: point.revenueCents / 100,
  }));

  return (
    <div className="h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
            axisLine={false}
            tickLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(value: number) => `€${value}`}
          />
          <Tooltip
            formatter={(value) => [`€${Number(value).toFixed(2)}`, "Revenue"]}
            contentStyle={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
