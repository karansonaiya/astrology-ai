-- AlterTable
ALTER TABLE "ReportPurchase" ADD COLUMN     "compatibilityRequestId" TEXT;

-- AddForeignKey
ALTER TABLE "ReportPurchase" ADD CONSTRAINT "ReportPurchase_compatibilityRequestId_fkey" FOREIGN KEY ("compatibilityRequestId") REFERENCES "CompatibilityRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
