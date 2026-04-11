-- Product decision for this rollout: historical order data is intentionally cleared
-- before making purchase place mandatory, so existing rows do not need backfill.
DELETE FROM "OrderCommodity";
DELETE FROM "Order";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "purchase_place_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Order_purchase_place_id_idx" ON "Order" ("purchase_place_id");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_purchase_place_id_fkey" FOREIGN KEY ("purchase_place_id") REFERENCES "PurchasePlace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
