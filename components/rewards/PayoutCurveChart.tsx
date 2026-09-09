"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DATA = [
  { tier: "Top 1%", share: 50, fill: "#FFC94D" },
  { tier: "Next 9%", share: 30, fill: "#3DFF7A" },
  { tier: "Rest active", share: 20, fill: "#7EC8FF" },
];

export function PayoutCurveChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout curve</CardTitle>
        <CardDescription>
          Top 1% = 50% of pool, next 9% = 30%, remaining active farmers = 20%.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="tier"
              tick={{ fill: "#8aa396", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#8aa396", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              unit="%"
            />
            <Tooltip
              cursor={{ fill: "rgba(61,255,122,0.06)" }}
              contentStyle={{
                background: "#101a16",
                border: "1px solid rgba(61,255,122,0.2)",
                borderRadius: 12,
              }}
              formatter={(value) => [`${value}%`, "Pool share"]}
            />
            <Bar dataKey="share" radius={[10, 10, 4, 4]}>
              {DATA.map((entry) => (
                <Cell key={entry.tier} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
