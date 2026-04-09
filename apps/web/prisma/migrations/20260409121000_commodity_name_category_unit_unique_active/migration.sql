-- 未删除商品在「trim 后的 name + 分类 + 单位」上唯一（应用层写入前须 trim，库中仅存 trim 后名称）
CREATE UNIQUE INDEX "Commodity_name_category_unit_active_key" ON "Commodity" ("name", "category_id", "unit_id") WHERE deleted = false;
