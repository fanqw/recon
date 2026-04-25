"use client";

import { Card, Spin } from "@arco-design/web-react";
import { WorkbenchChart } from "@/components/analytics/WorkbenchChart";
import { WorkbenchEmptyState } from "@/components/analytics/WorkbenchEmptyState";
import { WorkbenchFilters } from "@/components/analytics/WorkbenchFilters";
import { WorkbenchKpis } from "@/components/analytics/WorkbenchKpis";
import {
  horizontalBarOption,
  pieOption,
  stackedBarOption,
  stackedTrendOption,
} from "@/components/analytics/workbench-options";
import type {
  AnalyticsCategoryStack,
  AnalyticsDimensionRow,
  AnalyticsKpis,
  AnalyticsTrendSeries,
} from "@/lib/analytics/workbench";
import { useEffect, useMemo, useState } from "react";

type WorkbenchResponse = {
  filters: {
    range: { from: string; to: string; label: string };
  };
  kpis: AnalyticsKpis;
  topCommodities: AnalyticsDimensionRow[];
  categoryShare: AnalyticsDimensionRow[];
  purchasePlaceShare: AnalyticsDimensionRow[];
  categoryStacks: AnalyticsCategoryStack;
  trend: AnalyticsTrendSeries;
};

const emptyData: WorkbenchResponse = {
  filters: {
    range: { from: "", to: "", label: "最近一个月" },
  },
  kpis: {
    totalAmount: 0,
    orderCount: 0,
    lineCount: 0,
    averageOrderAmount: 0,
  },
  topCommodities: [],
  categoryShare: [],
  purchasePlaceShare: [],
  categoryStacks: { categories: [], series: [] },
  trend: { labels: [], series: [] },
};

function toDateInput(value: string): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function hasRowChartData(rows: Array<{ amount: number }>): boolean {
  return rows.some((row) => row.amount > 0);
}

function hasSeriesData(series: Array<{ values: number[] }>): boolean {
  return series.some((item) => item.values.some((value) => value > 0));
}

export default function WorkspacePage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<WorkbenchResponse>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);

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
  }, [from, to]);

  const options = useMemo(
    () => ({
      trend: stackedTrendOption(data.trend),
      categoryStack: stackedBarOption("分类金额与商品构成", data.categoryStacks),
      commodityBar: horizontalBarOption("商品金额 Top 10", data.topCommodities),
      categoryPie: pieOption("分类金额占比", data.categoryShare),
      purchasePlacePie: pieOption("进货地金额占比", data.purchasePlaceShare),
    }),
    [data],
  );

  const noData = data.kpis.lineCount === 0;

  return (
    <div className="flex flex-col gap-3">
      <WorkbenchFilters
        from={from}
        to={to}
        rangeLabel={data.filters.range.label}
        onFromChange={setFrom}
        onToChange={setTo}
      />

      {error ? <div className="rounded border border-red-300 p-3 text-red-600">{error}</div> : null}

      <Spin loading={loading} className="w-full">
        <div className="flex flex-col gap-3">
          <WorkbenchKpis kpis={data.kpis} />
          {noData ? <WorkbenchEmptyState /> : null}
          <section className="grid gap-3 xl:grid-cols-2" aria-label="工作台图表">
            <Card className="dashboard-panel xl:col-span-2">
              <WorkbenchChart
                label="总金额趋势"
                option={options.trend}
                empty={!hasSeriesData(data.trend.series)}
              />
            </Card>
            <Card className="dashboard-panel">
              <WorkbenchChart
                label="分类金额与商品构成"
                option={options.categoryStack}
                empty={!hasSeriesData(data.categoryStacks.series)}
              />
            </Card>
            <Card className="dashboard-panel">
              <WorkbenchChart
                label="分类金额占比"
                option={options.categoryPie}
                empty={!hasRowChartData(data.categoryShare)}
              />
            </Card>
            <Card className="dashboard-panel">
              <WorkbenchChart
                label="商品金额 Top 10"
                option={options.commodityBar}
                empty={!hasRowChartData(data.topCommodities)}
              />
            </Card>
            <Card className="dashboard-panel">
              <WorkbenchChart
                label="进货地金额占比"
                option={options.purchasePlacePie}
                empty={!hasRowChartData(data.purchasePlaceShare)}
              />
            </Card>
          </section>
        </div>
      </Spin>
    </div>
  );
}
