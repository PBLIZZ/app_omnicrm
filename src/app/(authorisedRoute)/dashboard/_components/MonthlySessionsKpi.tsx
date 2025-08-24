"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1, 0, 0, 0, 0);
}

export default function MonthlySessionsKpi(): JSX.Element {
  const now = useMemo(() => new Date(), []);
  const thisStart = useMemo(() => startOfMonth(now), [now]);
  const nextStart = useMemo(() => addMonths(thisStart, 1), [thisStart]);
  const prev1Start = useMemo(() => addMonths(thisStart, -1), [thisStart]);
  const prev2Start = useMemo(() => addMonths(thisStart, -2), [thisStart]);
  const prev3Start = useMemo(() => addMonths(thisStart, -3), [thisStart]);

  const monthLabels = useMemo(() => {
    const fmt = (d: Date): string => d.toLocaleString(undefined, { month: "short" });
    return [fmt(prev3Start), fmt(prev2Start), fmt(prev1Start), fmt(thisStart)];
  }, [prev3Start, prev2Start, prev1Start, thisStart]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "kpi", "sessions-monthly"],
    queryFn: async () => {
      const supabase = getSupabaseBrowser();

      // Count meetings per month (4 months: prev3, prev2, prev1, this)
      const ranges = [
        { from: prev3Start, to: prev2Start },
        { from: prev2Start, to: prev1Start },
        { from: prev1Start, to: thisStart },
        { from: thisStart, to: nextStart },
      ];

      const meetingPromises = ranges.map((r) =>
        supabase
          .from("interactions")
          .select("*", { head: true, count: "exact" })
          .eq("type", "meeting")
          .gte("occurred_at", r.from.toISOString())
          .lt("occurred_at", r.to.toISOString()),
      );

      const riskThisMonthPromise = supabase
        .from("ai_insights")
        .select("*", { head: true, count: "exact" })
        .eq("kind", "risk")
        .gte("created_at", thisStart.toISOString())
        .lt("created_at", nextStart.toISOString());

      const [m0, m1, m2, m3, risks] = await Promise.all([
        ...meetingPromises,
        riskThisMonthPromise,
      ]);

      const safeCount = (r: { count?: number | null } | null | undefined): number =>
        typeof r?.count === "number" ? r.count : 0;

      const counts: [number, number, number, number] = [safeCount(m0), safeCount(m1), safeCount(m2), safeCount(m3)];
      const current = counts[3] ?? 0;
      const trailing3 = ((counts[0] ?? 0) + (counts[1] ?? 0) + (counts[2] ?? 0)) / 3;

      return {
        counts,
        current,
        trailing3,
        riskThisMonth: safeCount(risks),
      };
    },
    staleTime: 60_000,
  });

  const current = data?.current ?? 0;
  const trailing3 = data?.trailing3 ?? 0;
  const delta = trailing3 === 0 ? 0 : ((current - trailing3) / trailing3) * 100;
  const chartCounts = data?.counts ?? [0, 0, 0, 0];
  const maxVal = Math.max(1, ...chartCounts);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions this month</CardTitle>
        <CardDescription>
          Comparing against the last 3 months average. Risks flagged this month: {data?.riskThisMonth ?? 0}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-16 flex items-center">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-600">Failed to load KPI.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-semibold tabular-nums">{current}</div>
              <div className="text-sm text-muted-foreground">
                vs avg {Math.round(trailing3)}
                {trailing3 > 0 && (
                  <span className={delta >= 0 ? "text-emerald-600 ml-2" : "text-rose-600 ml-2"}>
                    {delta >= 0 ? "+" : ""}
                    {delta.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>

            {/* Mini bar chart for prev3 -> current */}
            <div className="grid grid-cols-4 gap-2 items-end h-20">
              {chartCounts.map((v, i) => {
                const h = Math.max(4, Math.round((v / maxVal) * 70));
                const isCurrent = i === chartCounts.length - 1;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className={
                        "w-8 rounded-sm transition-colors " +
                        (isCurrent ? "bg-teal-500" : "bg-muted-foreground/30")
                      }
                      style={{ height: `${h}px` }}
                      title={`${monthLabels[i]}: ${v}`}
                    />
                    <span className="text-[10px] text-muted-foreground">{monthLabels[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
