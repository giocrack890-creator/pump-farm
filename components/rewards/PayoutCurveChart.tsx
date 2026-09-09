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
import {
  hudInk,
  hudInkMuted,
  hudPanel,
} from "@/components/hud/hudChrome";

const DATA = [
  { tier: "Top 1%", share: 50, fill: "#8a5a10" },
  { tier: "Next 9%", share: 30, fill: "#1a5c30" },
  { tier: "Rest active", share: 20, fill: "#3a6a8a" },
];

export function PayoutCurveChart() {
  return (
    <div className={`p-4 ${hudPanel}`}>
      <p className={`text-[11px] ${hudInk}`}>Payout curve</p>
      <p className={`mt-1 text-sm ${hudInkMuted}`}>
        Top 1% = 50% of pool, next 9% = 30%, remaining active farmers = 20%.
      </p>
      <div className="mt-3 h-64 border-[3px] border-[#3a2414] bg-[#fff8e8]/40 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(58,36,20,0.15)" vertical={false} />
            <XAxis
              dataKey="tier"
              tick={{ fill: "#3a2414", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#3a2414", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              unit="%"
            />
            <Tooltip
              cursor={{ fill: "rgba(61,255,122,0.12)" }}
              contentStyle={{
                background: "#c4a06a",
                border: "3px solid #3a2414",
                borderRadius: 0,
                color: "#1a1008",
              }}
              formatter={(value) => [`${value}%`, "Pool share"]}
            />
            <Bar dataKey="share" radius={[0, 0, 0, 0]}>
              {DATA.map((entry) => (
                <Cell key={entry.tier} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
