import { describe, expect, inject, it } from "vitest";
import {
  fetchWithCookie,
  loginAsAdmin,
  patchJsonWithCookie,
  postJsonWithCookie,
} from "../http-client";

function suffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

describe("GET /api/categories", () => {
  it("未带 Cookie 时返回 401", async () => {
    const baseUrl = inject("testBaseUrl");
    const res = await fetch(`${baseUrl}/api/categories`);
    expect(res.status).toBe(401);
  });

  it("带登录 Cookie 时返回 200 且 items 为数组", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const res = await fetchWithCookie(baseUrl, "/api/categories", {}, cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items?: unknown };
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("q 可命中分类名称与描述，且按 updatedAt desc 排序", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = suffix();
    const q = `cat-search-${suf}`;

    const nameRes = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: `${q}-name`, desc: "alpha" },
      cookie,
    );
    expect(nameRes.status).toBe(201);
    const nameCat = (await nameRes.json()) as { item: { id: string } };

    const descRes = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: `cat-desc-${suf}`, desc: `beta ${q} gamma` },
      cookie,
    );
    expect(descRes.status).toBe(201);
    const descCat = (await descRes.json()) as { item: { id: string } };

    const bump = await patchJsonWithCookie(
      baseUrl,
      `/api/categories/${nameCat.item.id}`,
      { desc: "alpha-updated" },
      cookie,
    );
    expect(bump.status).toBe(200);

    const res = await fetchWithCookie(
      baseUrl,
      `/api/categories?q=${encodeURIComponent(q)}`,
      {},
      cookie,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ id: string }>;
    };
    expect(body.items.map((item) => item.id)).toEqual([
      nameCat.item.id,
      descCat.item.id,
    ]);
  });
});

describe("GET /api/units", () => {
  it("q 可命中单位名称与描述，且按 updatedAt desc 排序", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = suffix();
    const q = `unit-search-${suf}`;

    const nameRes = await postJsonWithCookie(
      baseUrl,
      "/api/units",
      { name: `${q}-name`, desc: "alpha" },
      cookie,
    );
    expect(nameRes.status).toBe(201);
    const nameUnit = (await nameRes.json()) as { item: { id: string } };

    const descRes = await postJsonWithCookie(
      baseUrl,
      "/api/units",
      { name: `unit-desc-${suf}`, desc: `beta ${q} gamma` },
      cookie,
    );
    expect(descRes.status).toBe(201);
    const descUnit = (await descRes.json()) as { item: { id: string } };

    const bump = await patchJsonWithCookie(
      baseUrl,
      `/api/units/${nameUnit.item.id}`,
      { desc: "alpha-updated" },
      cookie,
    );
    expect(bump.status).toBe(200);

    const res = await fetchWithCookie(
      baseUrl,
      `/api/units?q=${encodeURIComponent(q)}`,
      {},
      cookie,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ id: string }>;
    };
    expect(body.items.map((item) => item.id)).toEqual([
      nameUnit.item.id,
      descUnit.item.id,
    ]);
  });
});
