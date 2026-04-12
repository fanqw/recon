import Image from "next/image";

type ListTableEmptyStateProps = {
  /** 主提示文案；列表页默认引导新建，详情等场景可传入更具体的说明 */
  message?: string;
};

/**
 * 列表表格无数据时的占位：插图与引导文案，供各业务页 `Table.noDataElement` 等场景复用。
 */
export function ListTableEmptyState({ message = "暂无数据，点击新建开始" }: ListTableEmptyStateProps) {
  return (
    <div className="flex flex-col items-center py-8 text-center text-[var(--muted)]">
      <Image
        src="/empty-box.svg"
        alt="空状态"
        width={80}
        height={80}
        className="mb-3 opacity-80"
      />
      <div className="text-sm">{message}</div>
    </div>
  );
}
