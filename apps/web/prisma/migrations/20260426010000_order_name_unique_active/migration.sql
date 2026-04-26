-- 未删除的订单名称唯一，与分类/单位保持一致的约束策略
CREATE UNIQUE INDEX "Order_name_active_key" ON "Order" ("name") WHERE deleted = false;
