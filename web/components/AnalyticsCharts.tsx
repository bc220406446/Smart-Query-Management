"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "var(--text-tertiary)",
  ASSIGNED: "var(--info)",
  IN_PROGRESS: "var(--brand-500)",
  RESOLVED: "var(--success)",
  FORWARDED_TO_HOD: "var(--warning)",
  AUTO_ESCALATED: "var(--danger)",
  HOD_ESCALATED: "var(--danger)",
  FORWARDED_TO_STAFF: "var(--brand-500)",
};

function hexVar(name: string): string {
  if (name === "var(--text-tertiary)") return "#8a93a3";
  if (name === "var(--warning)") return "#b06a00";
  if (name === "var(--info)") return "#2557d6";
  if (name === "var(--brand-500)") return "#3b6ef0";
  if (name === "var(--success)") return "#1a7f4a";
  if (name === "var(--danger)") return "#c53030";
  return "#64748b";
}

export function StatusPie({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={hexVar(STATUS_COLORS[entry.name] ?? "#64748b")}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: 8,
            color: "var(--text-primary)",
            fontSize: 12,
            fontFamily: "inherit",
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DeptBar({
  data,
}: {
  data: Array<{ name: string; count: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border-light)"
        />
        <XAxis dataKey="name" tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} />
        <YAxis
          tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: 8,
            color: "var(--text-primary)",
            fontSize: 12,
            fontFamily: "inherit",
          }}
        />
        <Bar
          dataKey="count"
          name="Queries"
          fill="var(--brand-500)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VolumeLine({
  data,
}: {
  data: Array<{ date: string; count: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border-light)"
        />
        <XAxis dataKey="date" tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} />
        <YAxis
          tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: 8,
            color: "var(--text-primary)",
            fontSize: 12,
            fontFamily: "inherit",
          }}
        />
        <Line
          type="monotone"
          dataKey="count"
          name="Queries"
          stroke="var(--success)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
