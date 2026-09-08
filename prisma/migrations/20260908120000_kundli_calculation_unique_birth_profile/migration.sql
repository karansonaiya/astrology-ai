-- DropIndex
DROP INDEX "KundliCalculation_birthProfileId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "KundliCalculation_birthProfileId_key" ON "KundliCalculation"("birthProfileId");
