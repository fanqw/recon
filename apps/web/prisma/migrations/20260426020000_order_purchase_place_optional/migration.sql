-- 进货地改为选填：purchase_place_id 允许为 NULL
ALTER TABLE "Order" ALTER COLUMN "purchase_place_id" DROP NOT NULL;
