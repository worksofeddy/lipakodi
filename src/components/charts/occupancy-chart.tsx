"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface OccupancyChartProps {
  data: { name: string; total: number; occupied: number; rate: number }[];
}

export function OccupancyChart({ data }: OccupancyChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="occupied" fill="#22c55e" name="Occupied" />
        <Bar dataKey="total" fill="#e5e7eb" name="Total Units" />
      </BarChart>
    </ResponsiveContainer>
  );
}
