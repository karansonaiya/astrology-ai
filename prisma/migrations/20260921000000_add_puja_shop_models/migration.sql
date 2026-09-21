-- CreateEnum
CREATE TYPE "PujaRequestStatus" AS ENUM ('pending', 'contacted', 'scheduled', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('gemstone', 'rudraksha', 'yantra', 'other');

-- CreateEnum
CREATE TYPE "ProductInquiryStatus" AS ENUM ('new', 'contacted', 'closed');

-- CreateTable
CREATE TABLE "PujaBookingRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pujaCode" TEXT,
    "pujaName" TEXT NOT NULL,
    "preferredDate" TIMESTAMP(3),
    "contactPhone" TEXT NOT NULL,
    "notes" TEXT,
    "status" "PujaRequestStatus" NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PujaBookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpiritualProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "priceInPaise" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpiritualProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductInquiry" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "message" TEXT,
    "status" "ProductInquiryStatus" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PujaBookingRequest_status_idx" ON "PujaBookingRequest"("status");

-- CreateIndex
CREATE INDEX "SpiritualProduct_active_idx" ON "SpiritualProduct"("active");

-- CreateIndex
CREATE INDEX "ProductInquiry_status_idx" ON "ProductInquiry"("status");

-- AddForeignKey
ALTER TABLE "PujaBookingRequest" ADD CONSTRAINT "PujaBookingRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInquiry" ADD CONSTRAINT "ProductInquiry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SpiritualProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInquiry" ADD CONSTRAINT "ProductInquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
