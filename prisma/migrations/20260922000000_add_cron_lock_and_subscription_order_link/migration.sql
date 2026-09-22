-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "orderId" TEXT;

-- CreateTable
CREATE TABLE "CronRunLock" (
    "key" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CronRunLock_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "CronRunLock_lastRunAt_idx" ON "CronRunLock"("lastRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_orderId_key" ON "Subscription"("orderId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
