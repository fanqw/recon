-- CreateTable
CREATE TABLE "PurchasePlace" (
    "id" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "market_name" TEXT NOT NULL,
    "desc" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchasePlace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchasePlace_place_market_name_active_key" ON "PurchasePlace" ("place", "market_name") WHERE deleted = false;
