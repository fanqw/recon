-- Clear historical order data before making purchase place mandatory.
DELETE FROM "OrderCommodity";
DELETE FROM "Order";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "purchase_place_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_purchase_place_id_fkey" FOREIGN KEY ("purchase_place_id") REFERENCES "PurchasePlace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
