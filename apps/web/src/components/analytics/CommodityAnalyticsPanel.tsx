"use client";

import { Card, Select, Tag } from "@arco-design/web-react";
import { WorkbenchChart } from "./WorkbenchChart";
import { WorkbenchEmptyState } from "./WorkbenchEmptyState";
import {
  commodityAmountOption,
  commodityPriceOption,
  commodityQuantityOption,
} from "./workbench-options";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CommodityAnalyticsData } from "@/lib/analytics/commodity";
import type { MasterDataListItem } from "@/lib/master-data/combobox-options";

type Props = {
  from: string;
  to: string;
  granularity: string;
};

export function CommodityAnalyticsPanel({ from, to, granularity }: Props) {
  const [commodityId, setCommodityId] = useState<string | null>(null);
  const [commodityOptions, setCommodityOptions] = useState<MasterDataListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<CommodityAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 加载商品搜索选项
  useEffect(() => {
    const controller = new AbortController();
    const url = searchQuery.trim()
      ? `/api/commodities?q=${encodeURIComponent(searchQuery.trim())}&pageSize=50`
      : `/api/commodities?pageSize=50`;
    void fetch(url, { credentials: "include", signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray((d as { items?: unknown }).items)) {
          setCommodityOptions((d as { items: MasterDataListItem[] }).items);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [searchQuery]);

  // 商品 ID 清空时同步清除数据
  const prevCommodityId = useRef<string | null>(null);
  if (prevCommodityId.current !== commodityId) {
    prevCommodityId.current = commodityId;
    if (!commodityId && data !== null) setData(null);
  }

  // 加载商品分析数据
  useEffect(() => {
    abortRef.current?.abort();
    if (!commodityId) return;

    const controller = new AbortController();
    abortRef.current = controller;

    const params = new URLSearchParams({ commodityId, granularity });
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/analytics/commodity?${params.toString()}`, {
          credentials: "include",
          signal: controller.signal,
        });
        const d = await res.json();
        setData(d as CommodityAnalyticsData);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("加载商品分析数据失败");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [commodityId, from, to, granularity]);

  const options = useMemo(() => {
    if (!data) return null;
    const unitName = data.commodity.unit.name;
    return {
      price: commodityPriceOption(`${data.commodity.name} — 单价波动`, data.priceTrend),
      quantity: commodityQuantityOption(
        `${data.commodity.name} — 采购量波动`,
        data.quantityTrend,
        unitName,
      ),
      amount: commodityAmountOption(`${data.commodity.name} — 采购金额波动`, data.amountTrend),
    };
  }, [data]);

  const selectOptions = commodityOptions.map((c) => ({
    value: c.id,
    label: c.unit ? `${c.name}(${c.unit.name})` : c.name,
  }));

  const hasData = data && data.summary.lineCount > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* 商品选择器 */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium" style={{ color: "var(--muted)" }}>
            选择商品
          </span>
          <Select
            showSearch
            allowClear
            className="w-72"
            placeholder="输入商品名称搜索…"
            options={selectOptions}
            value={commodityId ?? undefined}
            filterOption={false}
            onSearch={setSearchQuery}
            onChange={(v) => setCommodityId(v ? String(v) : null)}
          />
          {data?.commodity && (
            <div className="flex items-center gap-2">
              <Tag color="arcoblue">{data.commodity.category.name}</Tag>
              <Tag color="green">{data.commodity.unit.name}</Tag>
            </div>
          )}
        </div>
      </Card>

      {!commodityId && (
        <Card className="py-12 text-center" style={{ color: "var(--muted)" }}>
          请先选择一个商品，查看其在所选时间范围内的采购分析。
        </Card>
      )}

      {error && (
        <div className="rounded border border-red-300 p-3 text-red-600">{error}</div>
      )}

      {commodityId && !loading && !hasData && !error && (
        <Card>
          <WorkbenchEmptyState />
        </Card>
      )}

      {hasData && data && options && (
        <>
          {/* 汇总 KPI */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              { title: "采购次数", value: data.summary.lineCount, suffix: "次" },
              { title: "涉及订单", value: data.summary.orderCount, suffix: "单" },
              {
                title: "总采购量",
                value: data.summary.totalQuantity,
                suffix: data.commodity.unit.name,
              },
              { title: "总采购额", value: `¥${data.summary.totalAmount.toFixed(2)}` },
              { title: "平均单价", value: `¥${data.summary.avgPrice.toFixed(4)}` },
              {
                title: "价格区间",
                value: `¥${data.summary.minPrice.toFixed(2)} — ¥${data.summary.maxPrice.toFixed(2)}`,
              },
            ].map((kpi) => (
              <Card key={kpi.title} className="flex flex-col items-start gap-1 p-4">
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {kpi.title}
                </span>
                <span className="text-base font-semibold">
                  {"value" in kpi && typeof kpi.value === "number"
                    ? `${kpi.value}${"suffix" in kpi ? ` ${kpi.suffix}` : ""}`
                    : kpi.value}
                </span>
              </Card>
            ))}
          </div>

          {/* 三图 */}
          <Card className="dashboard-panel">
            <WorkbenchChart
              label={`单价波动（${data.filters.range.label}）`}
              option={options.price}
              empty={data.priceTrend.length === 0}
            />
          </Card>
          <div className="grid gap-3 xl:grid-cols-2">
            <Card className="dashboard-panel">
              <WorkbenchChart
                label="采购量波动"
                option={options.quantity}
                empty={data.quantityTrend.length === 0}
              />
            </Card>
            <Card className="dashboard-panel">
              <WorkbenchChart
                label="采购金额波动"
                option={options.amount}
                empty={data.amountTrend.length === 0}
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
