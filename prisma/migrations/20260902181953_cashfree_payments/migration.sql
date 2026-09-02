-- Rename Razorpay-specific columns to provider-neutral names for the
-- Cashfree integration (src/lib/payments/provider.ts). Uses RENAME rather
-- than the DROP+ADD that `prisma migrate dev` would auto-generate for a
-- field rename, because Order already had 11 real rows with data in these
-- columns at the time of this migration — a drop+add would have silently
-- destroyed that payment history.
ALTER TABLE "Order" RENAME COLUMN "razorpayOrderId" TO "providerOrderId";
ALTER TABLE "Order" RENAME COLUMN "razorpayPaymentId" TO "providerPaymentId";
ALTER TABLE "Order" RENAME COLUMN "razorpaySignature" TO "providerSignature";
ALTER TABLE "Subscription" RENAME COLUMN "razorpaySubscriptionId" TO "providerSubscriptionId";

ALTER INDEX "Order_razorpayOrderId_key" RENAME TO "Order_providerOrderId_key";
ALTER INDEX "Subscription_razorpaySubscriptionId_key" RENAME TO "Subscription_providerSubscriptionId_key";
