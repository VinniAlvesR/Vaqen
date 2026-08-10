CREATE TABLE "PlanUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanUsage_userId_resource_periodKey_key" ON "PlanUsage"("userId", "resource", "periodKey");
CREATE INDEX "PlanUsage_userId_periodKey_idx" ON "PlanUsage"("userId", "periodKey");

ALTER TABLE "PlanUsage" ADD CONSTRAINT "PlanUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
