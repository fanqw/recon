import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { jsonResponseForPrismaUniqueViolation } from "./prisma-errors";

describe("jsonResponseForPrismaUniqueViolation", () => {
  it("P2002 映射为 409 JSON", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("unique", {
      code: "P2002",
      clientVersion: "test",
    });
    const res = jsonResponseForPrismaUniqueViolation(err);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(409);
    const body = (await res!.json()) as { error: string };
    expect(body.error).toContain("冲突");
  });

  it("其它错误返回 null", () => {
    expect(jsonResponseForPrismaUniqueViolation(new Error("x"))).toBeNull();
  });
});
