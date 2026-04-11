export const DELETE_BLOCK_CODES = [
  "CATEGORY_IN_USE",
  "UNIT_IN_USE",
  "COMMODITY_IN_USE",
  "PURCHASE_PLACE_IN_USE",
] as const;

export type DeleteBlockCode = (typeof DELETE_BLOCK_CODES)[number];

const DELETE_BLOCK_MESSAGE_MAP: Record<DeleteBlockCode, string> = {
  CATEGORY_IN_USE: "该分类无法删除：已被关联",
  UNIT_IN_USE: "该单位无法删除：已被关联",
  COMMODITY_IN_USE: "该商品无法删除：已被关联",
  PURCHASE_PLACE_IN_USE: "该进货地无法删除：已被关联",
};

export function isDeleteBlockCode(v: unknown): v is DeleteBlockCode {
  return typeof v === "string" && DELETE_BLOCK_CODES.includes(v as DeleteBlockCode);
}

export function messageForDeleteBlockCode(code: DeleteBlockCode): string {
  return DELETE_BLOCK_MESSAGE_MAP[code];
}
