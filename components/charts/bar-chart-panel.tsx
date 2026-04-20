"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function BarChartPanel({
  title,
  description,
  data,
  barColor = "#35c26b",
  tooltipValueLabel = "Проблем"
}: {
  title: string;
  description: string;
  data: Array<{ name: string; value: number; clubs?: string[] }>;
  barColor?: string;
  tooltipValueLabel?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="name" stroke="rgba(196,216,206,0.6)" tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(196,216,206,0.6)" tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "rgba(53, 194, 107, 0.08)" }}
              content={({ active, payload }) => {
                const item = payload?.[0]?.payload as { name: string; value: number; clubs?: string[] } | undefined;
                if (!active || !item) {
                  return null;
                }

                return (
                  <div className="max-w-[280px] rounded-2xl border border-white/8 bg-[#14211b] px-4 py-3 text-sm shadow-xl">
                    <div className="font-medium text-foreground">{item.name}</div>
                    <div className="mt-2 text-primary">
                      {tooltipValueLabel}: {item.value}
                    </div>
                    {item.clubs?.length ? <div className="mt-2 text-muted-foreground">Клубы: {item.clubs.join(", ")}</div> : null}
                  </div>
                );
              }}
            />
            <Bar dataKey="value" fill={barColor} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
