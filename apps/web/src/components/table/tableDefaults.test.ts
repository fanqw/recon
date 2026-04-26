import { describe, expect, it } from "vitest";
import {
  COMPACT_TABLE_SIZE,
  createCompactTablePagination,
} from "./tableDefaults";

describe("compact table defaults", () => {
  it("uses dense table rows and exposes v1-style page size choices", () => {
    expect(COMPACT_TABLE_SIZE).toBe("small");
    expect(createCompactTablePagination()).toMatchObject({
      pageSize: 10,
      showTotal: true,
      sizeCanChange: true,
      sizeOptions: [10, 20, 50, 100],
    });
  });

  it("returns a new pagination object for each table", () => {
    expect(createCompactTablePagination()).not.toBe(createCompactTablePagination());
  });
});
