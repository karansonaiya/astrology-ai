-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('created', 'paid', 'failed', 'cancelled');
ALTER TABLE "public"."Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'created';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PurchaseStatus_new" AS ENUM ('pending', 'completed', 'failed');
ALTER TABLE "public"."ReportPurchase" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ReportPurchase" ALTER COLUMN "status" TYPE "PurchaseStatus_new" USING ("status"::text::"PurchaseStatus_new");
ALTER TYPE "PurchaseStatus" RENAME TO "PurchaseStatus_old";
ALTER TYPE "PurchaseStatus_new" RENAME TO "PurchaseStatus";
DROP TYPE "public"."PurchaseStatus_old";
ALTER TABLE "ReportPurchase" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;

-- DropForeignKey
ALTER TABLE "RefundRequest" DROP CONSTRAINT "RefundRequest_orderId_fkey";

-- DropForeignKey
ALTER TABLE "RefundRequest" DROP CONSTRAINT "RefundRequest_userId_fkey";

-- DropTable
DROP TABLE "RefundRequest";

-- DropEnum
DROP TYPE "RefundStatus";
