CREATE TYPE "ProjectPaymentPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELED');
CREATE TYPE "ProjectPaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELED');
CREATE TYPE "ProjectPaymentMethod" AS ENUM ('PIX', 'CARD', 'TRANSFER', 'CASH', 'OTHER');

CREATE TABLE "ProjectPaymentPlan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "totalAmountCents" INTEGER NOT NULL,
  "installments" INTEGER NOT NULL,
  "status" "ProjectPaymentPlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectPaymentPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectPayment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "paymentPlanId" TEXT,
  "description" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "status" "ProjectPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "method" "ProjectPaymentMethod" NOT NULL DEFAULT 'OTHER',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectPaymentPlan_userId_status_createdAt_idx" ON "ProjectPaymentPlan"("userId", "status", "createdAt");
CREATE INDEX "ProjectPaymentPlan_projectId_idx" ON "ProjectPaymentPlan"("projectId");
CREATE INDEX "ProjectPayment_userId_status_dueDate_idx" ON "ProjectPayment"("userId", "status", "dueDate");
CREATE INDEX "ProjectPayment_userId_paidAt_idx" ON "ProjectPayment"("userId", "paidAt");
CREATE INDEX "ProjectPayment_projectId_dueDate_idx" ON "ProjectPayment"("projectId", "dueDate");
CREATE INDEX "ProjectPayment_paymentPlanId_idx" ON "ProjectPayment"("paymentPlanId");

ALTER TABLE "ProjectPaymentPlan" ADD CONSTRAINT "ProjectPaymentPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectPaymentPlan" ADD CONSTRAINT "ProjectPaymentPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectPayment" ADD CONSTRAINT "ProjectPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectPayment" ADD CONSTRAINT "ProjectPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectPayment" ADD CONSTRAINT "ProjectPayment_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "ProjectPaymentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
