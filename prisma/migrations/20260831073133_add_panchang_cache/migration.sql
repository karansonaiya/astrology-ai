-- CreateTable
CREATE TABLE "PanchangCache" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PanchangCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PanchangCache_date_idx" ON "PanchangCache"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PanchangCache_latitude_longitude_date_key" ON "PanchangCache"("latitude", "longitude", "date");
