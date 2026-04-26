export type MasterDataListItem = {
  id: string;
  name: string;
  category?: { id: string; name: string };
  unit?: { id: string; name: string };
};

export type MasterDataComboboxOption = {
  value: string;
  label: string;
  row: MasterDataListItem | null;
};

export type BuildMasterDataComboboxOptionsInput = {
  items: MasterDataListItem[];
  query: string;
  currentInputLabel?: (query: string) => string;
};

function normalizeQuery(value: string): string {
  return value.trim();
}

function hasExactMatch(items: MasterDataListItem[], query: string): boolean {
  return items.some((item) => item.name.trim() === query);
}

export function buildMasterDataComboboxOptions({
  items,
  query,
  currentInputLabel = (value) => value,
}: BuildMasterDataComboboxOptionsInput): MasterDataComboboxOption[] {
  const normalizedQuery = normalizeQuery(query);
  const options: MasterDataComboboxOption[] = items.map((row) => ({
    value: `id:${row.id}`,
    label: row.unit ? `${row.name}(${row.unit.name})` : row.name,
    row,
  }));

  if (normalizedQuery.length > 0 && !hasExactMatch(items, normalizedQuery)) {
    options.unshift({
      value: `free:${normalizedQuery}`,
      label: currentInputLabel(normalizedQuery),
      row: null,
    });
  }

  return options;
}
