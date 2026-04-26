import type { PaginationProps, TableProps } from "@arco-design/web-react";

export const COMPACT_TABLE_SIZE: NonNullable<TableProps["size"]> = "small";

export function createCompactTablePagination(): PaginationProps {
  return {
    pageSize: 10,
    showTotal: true,
    sizeCanChange: true,
    sizeOptions: [10, 20, 50, 100],
  };
}
