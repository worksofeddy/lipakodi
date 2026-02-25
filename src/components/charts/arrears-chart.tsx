"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ArrearsChartProps {
  data: Record<string, number>;
}

export function ArrearsChart({ data }: ArrearsChartProps) {
  const chartData = [
    { range: "0-30 days", amount: data["0-30"] || 0 },
    { range: "30-60 days", amount: data["30-60"] || 0 },
    { range: "60-90 days", amount: data["60-90"] || 0 },
    { range: "90+ days", amount: data["90+"] || 0 },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="range" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value) => [
            `KES ${Number(value).toLocaleString()}`,
            "Arrears",
          ]}
        />
        <Bar dataKey="amount" fill="#ef4444" name="Arrears" />
      </BarChart>
    </ResponsiveContainer>
  );
}
