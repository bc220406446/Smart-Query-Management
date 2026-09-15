"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";

const data = [
  { name: "Correct routing", value: 92, color: "var(--brand-500)" },
  { name: "Needs review", value: 8, color: "var(--warning)" },
];

export default function LandingAccuracyChart() {
  return (
    <div className="landing-chart-card">
      <div className="landing-chart-heading">
        <div>
          <p className="landing-chart-kicker">AI PERFORMANCE</p>
          <h3>Routing accuracy</h3>
        </div>
        <span className="landing-chart-badge">
          <TrendingUp size={14} /> 5.2%
        </span>
      </div>
      <div className="landing-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                borderRadius: 12,
                color: "var(--text-primary)",
              }}
              formatter={(value) => [`${value}%`, "Queries"]}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={72}
              outerRadius={100}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((item) => <Cell key={item.name} fill={item.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="landing-chart-center">
          <strong>92%</strong>
          <span>accurate</span>
        </div>
      </div>
      <div className="landing-chart-legend">
        {data.map((item) => (
          <span key={item.name}>
            <i style={{ background: item.color }} />
            {item.name}
            <b>{item.value}%</b>
          </span>
        ))}
      </div>
      <p className="landing-chart-note">
        Based on correctly classified and routed queries.
      </p>
    </div>
  );
}
