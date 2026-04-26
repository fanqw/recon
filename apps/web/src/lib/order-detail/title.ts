type OrderTitleInput = {
  name: string;
  desc: string | null;
  createdAt: string | Date;
  purchasePlace: {
    place: string;
    marketName: string;
  };
};

const GENERIC_PURCHASE_PLACES = new Set(["历史导入", "生产 MongoDB 导入"]);

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}年${month}月${day}日`;
}

function normalizeYear(year: number): number {
  return year < 100 ? 2000 + year : year;
}

function parseDateText(value: string): string | null {
  const text = normalizeText(value);
  const zh = text.match(/(\d{2,4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|号)?/);
  if (zh) {
    return formatDate(normalizeYear(Number(zh[1])), Number(zh[2]), Number(zh[3]));
  }

  const dotted = text.match(/(?<!\d)(\d{2,4})\.(\d{1,2})\.(\d{1,2})(?!\d)/);
  if (dotted) {
    return formatDate(
      normalizeYear(Number(dotted[1])),
      Number(dotted[2]),
      Number(dotted[3]),
    );
  }

  const compact = text.match(/(?<!\d)(20\d{2})(\d{2})(\d{2})(?:\d{0,6})?(?!\d)/);
  if (compact) {
    return formatDate(Number(compact[1]), Number(compact[2]), Number(compact[3]));
  }

  return null;
}

function dateFromCreatedAt(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function purchasePlaceText(purchasePlace: OrderTitleInput["purchasePlace"]): string {
  const place = normalizeText(purchasePlace.place);
  const marketName = normalizeText(purchasePlace.marketName);

  if (place && !GENERIC_PURCHASE_PLACES.has(place)) return place;
  return marketName || place;
}

export function buildOrderDetailTableTitle(order: OrderTitleInput): string {
  const date =
    parseDateText(order.desc ?? "") ??
    parseDateText(order.name) ??
    dateFromCreatedAt(order.createdAt);
  const place = purchasePlaceText(order.purchasePlace);
  return [date, place].filter(Boolean).join("");
}
