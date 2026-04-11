"use client";

import { Card, Typography } from "@arco-design/web-react";

export default function WorkspacePage() {
  return (
    <Card className="dashboard-panel">
      <div className="flex min-h-[280px] flex-col justify-center gap-3 text-center">
        <Typography.Title heading={4} style={{ margin: 0 }}>
          工作台
        </Typography.Title>
        <Typography.Paragraph style={{ margin: 0 }}>
          工作台能力建设中，当前可通过左侧导航进入物料管理与订单管理。
        </Typography.Paragraph>
      </div>
    </Card>
  );
}
