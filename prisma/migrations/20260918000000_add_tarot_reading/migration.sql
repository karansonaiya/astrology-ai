-- CreateTable
CREATE TABLE "TarotReading" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT,
    "cards" JSONB NOT NULL,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TarotReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TarotReading_userId_idx" ON "TarotReading"("userId");

-- AddForeignKey
ALTER TABLE "TarotReading" ADD CONSTRAINT "TarotReading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
