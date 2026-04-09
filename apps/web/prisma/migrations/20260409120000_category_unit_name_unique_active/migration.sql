-- 未删除的分类、单位名称唯一（与 openspec order-line-item-form-master-data 一致）
CREATE UNIQUE INDEX "Category_name_active_key" ON "Category" ("name") WHERE deleted = false;
CREATE UNIQUE INDEX "Unit_name_active_key" ON "Unit" ("name") WHERE deleted = false;
