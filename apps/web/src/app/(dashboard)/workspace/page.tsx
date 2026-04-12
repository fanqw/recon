"use client";

import { Card, Spin } from "@arco-design/web-react";
import { WorkbenchChart } from "@/components/analytics/WorkbenchChart";
import { WorkbenchEmptyState } from "@/components/analytics/WorkbenchEmptyState";
import { WorkbenchFilters } from "@/components/analytics/WorkbenchFilters";
import { WorkbenchKpis } from "@/components/analytics/WorkbenchKpis";
import { barOption, pieOption, trendOption } from "@/components/analytics/workbench-options";
import type {
  AnalyticsDimensionRow,
  AnalyticsGranularity,
  AnalyticsKpis,
  AnalyticsTrendBucket,
} from "@/lib/analytics/workbench";
import { useEffect, useMemo, useState } from "react";

type WorkbenchResponse = {
  filters: {
    range: { from: string; to: string; label: string };
    granularity: AnalyticsGranularity;
  };
  kpis: AnalyticsKpis;
  byCategory: AnalyticsDimensionRow[];
  byCommodity: AnalyticsDimensionRow[];
  byPurchasePlace: AnalyticsDimensionRow[];
  trend: AnalyticsTrendBucket[];
};

const emptyData: WorkbenchResponse = {
  filters: {
    range: { from: "", to: "", label: "最近一个月" },
    granularity: "day",
  },
  kpis: {
    totalAmount: 0,
    orderCount: 0,
    lineCount: 0,
    averageOrderAmount: 0,
  },
  byCategory: [],
  byCommodity: [],
  byPurchasePlace: [],
  trend: [],
};

function toDateInput(value: string): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function hasChartData(rows: Array<{ amount: number }>): boolean {
  return rows.some((row) => row.amount > 0);
}

export default function WorkspacePage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [granularity, setGranularity] = useState<AnalyticsGranularity>("day");
  const [data, setData] = useState<WorkbenchResponse>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("granularity", granularity);

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/analytics/workbench?${params.toString()}`, {
          credentials: "include",
          signal: controller.signal,
        });
        const body = (await res.json()) as WorkbenchResponse | { error?: string };
        if (!res.ok) {
          setError(("error" in body && body.error) || "加载工作台数据失败");
          return;
        }
        const next = body as WorkbenchResponse;
        setData(next);
        if (!from) setFrom(toDateInput(next.filters.range.from));
        if (!to) setTo(toDateInput(next.filters.range.to));
        setGranularity(next.filters.granularity);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError("加载工作台数据失败");
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [from, granularity, to]);

  const options = useMemo(
    () => ({
      categoryBar: barOption("分类金额", data.byCategory),
      commodityBar: barOption("商品金额 Top 50", data.byCommodity),
      purchasePlaceBar: barOption("进货地金额", data.byPurchasePlace),
      trend: trendOption(data.trend),
      categoryPie: pieOption("分类金额占比", data.byCategory),
      purchasePlacePie: pieOption("进货地金额占比", data.byPurchasePlace),
    }),
    [data],
  );

  const noData = data.kpis.lineCount === 0;

  return (
    <div className="flex flex-col gap-3">
      <WorkbenchFilters
        from={from}
        to={to}
        granularity={granularity}
        rangeLabel={data.filters.range.label}
        onFromChange={setFrom}
        onToChange={setTo}
        onGranularityChange={setGranularity}
      />

      {error ? <div className="rounded border border-red-300 p-3 text-red-600">{error}</div> : null}

      <Spin loading={loading} className="w-full">
        <div className="flex flex-col gap-3">
          <WorkbenchKpis kpis={data.kpis} />
          {noData ? <WorkbenchEmptyState /> : null}
          <section className="grid gap-3 xl:grid-cols-2" aria-label="工作台图表">
            <Card className="dashboard-panel">
              <WorkbenchChart
                label="总金额趋势"
                option={options.trend}
                empty={!hasChartData(data.trend)}
              />
            </Card>
            <Card className="dashboard-panel">
              <WorkbenchChart
                label="分类金额"
                option={options.categoryBar}
                empty={!hasChartData(data.byCategory)}
              />
            </Card>
            <Card className="dashboard-panel">
              <WorkbenchChart
                label="商品金额 Top 50"
                option={options.commodityBar}
                empty={!hasChartData(data.byCommodity)}
              />
            </Card>
            <Card className="dashboard-panel">
              <WorkbenchChart
                label="进货地金额"
                option={options.purchasePlaceBar}
                empty={!hasChartData(data.byPurchasePlace)}
              />
            </Card>
            <Card className="dashboard-panel">
              <WorkbenchChart
                label="分类金额占比"
                option={options.categoryPie}
                empty={!hasChartData(data.byCategory)}
              />
            </Card>
            <Card className="dashboard-panel">
              <WorkbenchChart
                label="进货地金额占比"
                option={options.purchasePlacePie}
                empty={!hasChartData(data.byPurchasePlace)}
              />
            </Card>
          </section>
        </div>
      </Spin>
    </div>
  );
}
