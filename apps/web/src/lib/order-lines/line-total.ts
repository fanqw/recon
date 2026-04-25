export function calculateEditableLineTotal(count: number, price: number): number {
  if (!Number.isFinite(count) || !Number.isFinite(price)) {
    return 0;
  }

  return Math.round((price * count + Number.EPSILON) * 100) / 100;
}

export function hasManualLineTotalOverride(
  count: number,
  price: number,
  lineTotal: number,
): boolean {
  return calculateEditableLineTotal(count, price) !== lineTotal;
}
