CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Provider" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyQuota" INTEGER NOT NULL DEFAULT 10,
    "quotaResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAssignedIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadAllocation" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FairAllocationState" (
    "id" TEXT NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "roundRobinState" TEXT NOT NULL DEFAULT '0',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FairAllocationState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuotaReset" (
    "id" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "webhookId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotaReset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "providerId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AllocationLock" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationLock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Service_name_key" ON "Service"("name");

CREATE UNIQUE INDEX "Provider_name_key" ON "Provider"("name");

CREATE UNIQUE INDEX "Lead_phoneNumber_serviceId_key" ON "Lead"("phoneNumber", "serviceId");

CREATE INDEX "LeadAllocation_providerId_idx" ON "LeadAllocation"("providerId");

CREATE INDEX "LeadAllocation_leadId_idx" ON "LeadAllocation"("leadId");

CREATE UNIQUE INDEX "LeadAllocation_leadId_providerId_key" ON "LeadAllocation"("leadId", "providerId");

CREATE UNIQUE INDEX "FairAllocationState_serviceId_key" ON "FairAllocationState"("serviceId");

CREATE INDEX "FairAllocationState_serviceId_idx" ON "FairAllocationState"("serviceId");

CREATE UNIQUE INDEX "QuotaReset_webhookId_key" ON "QuotaReset"("webhookId");

CREATE UNIQUE INDEX "WebhookEvent_externalId_key" ON "WebhookEvent"("externalId");

CREATE INDEX "WebhookEvent_externalId_idx" ON "WebhookEvent"("externalId");

CREATE INDEX "WebhookEvent_providerId_idx" ON "WebhookEvent"("providerId");

CREATE UNIQUE INDEX "AllocationLock_leadId_key" ON "AllocationLock"("leadId");

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LeadAllocation" ADD CONSTRAINT "LeadAllocation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadAllocation" ADD CONSTRAINT "LeadAllocation_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QuotaReset" ADD CONSTRAINT "QuotaReset_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
