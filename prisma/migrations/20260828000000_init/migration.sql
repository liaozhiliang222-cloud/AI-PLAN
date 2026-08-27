-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Provider" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "logoColor" TEXT NOT NULL DEFAULT '#2563EB',
    "website" TEXT,
    "officialSource" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "priceCny" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "priceNote" TEXT NOT NULL DEFAULT '',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "region" TEXT NOT NULL,
    "quotaType" TEXT NOT NULL DEFAULT 'credits',
    "quotaAmount" DOUBLE PRECISION,
    "quotaUnit" TEXT,
    "quotaWindow" TEXT,
    "rateMultiplier" DOUBLE PRECISION,
    "fastQuota" TEXT,
    "normalQuota" TEXT,
    "quotaNote" TEXT,
    "capacityIndex" INTEGER NOT NULL DEFAULT 50,
    "contextNote" TEXT,
    "tools" TEXT NOT NULL DEFAULT '[]',
    "toolCompat" TEXT NOT NULL DEFAULT '{}',
    "scenarios" TEXT NOT NULL DEFAULT '[]',
    "pros" TEXT NOT NULL DEFAULT '[]',
    "cons" TEXT NOT NULL DEFAULT '[]',
    "recommendedFor" TEXT NOT NULL DEFAULT '[]',
    "notRecommendedFor" TEXT NOT NULL DEFAULT '[]',
    "description" TEXT NOT NULL DEFAULT '',
    "officialUrl" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "trustLevel" TEXT NOT NULL DEFAULT 'official_verified',
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanModel" (
    "planId" INTEGER NOT NULL,
    "modelId" INTEGER NOT NULL,
    "multiplier" DOUBLE PRECISION,
    "recommended" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlanModel_pkey" PRIMARY KEY ("planId","modelId")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contextK" INTEGER,
    "inputPrice" DOUBLE PRECISION,
    "outputPrice" DOUBLE PRECISION,
    "releaseDate" TEXT,
    "strengths" TEXT NOT NULL DEFAULT '[]',
    "weaknesses" TEXT NOT NULL DEFAULT '[]',
    "recommendedScenarios" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanScore" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "ability" DOUBLE PRECISION NOT NULL,
    "quota" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "toolCompat" DOUBLE PRECISION NOT NULL,
    "stability" DOUBLE PRECISION NOT NULL,
    "cnExperience" DOUBLE PRECISION NOT NULL,
    "overall" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trend" INTEGER NOT NULL DEFAULT 0,
    "heat" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "PlanScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelScore" (
    "id" SERIAL NOT NULL,
    "modelId" INTEGER NOT NULL,
    "overall" DOUBLE PRECISION NOT NULL,
    "coding" DOUBLE PRECISION NOT NULL,
    "agent" DOUBLE PRECISION NOT NULL,
    "frontend" DOUBLE PRECISION NOT NULL,
    "backend" DOUBLE PRECISION NOT NULL,
    "debug" DOUBLE PRECISION NOT NULL,
    "longContext" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "trend" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ModelScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeLog" (
    "id" SERIAL NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "entitySlug" TEXT,
    "planId" INTEGER,
    "modelId" INTEGER,
    "changeType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "importance" TEXT NOT NULL,
    "impactFrom" DOUBLE PRECISION,
    "impactTo" DOUBLE PRECISION,
    "impactText" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'official',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricePoint" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "priceCny" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PricePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceMonitor" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "providerSlug" TEXT,
    "lastHash" TEXT,
    "lastContent" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceMonitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewItem" (
    "id" SERIAL NOT NULL,
    "sourceId" INTEGER,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provider_name_key" ON "Provider"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_slug_key" ON "Provider"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Model_slug_key" ON "Model"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PlanScore_planId_key" ON "PlanScore"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelScore_modelId_key" ON "ModelScore"("modelId");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanModel" ADD CONSTRAINT "PlanModel_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanModel" ADD CONSTRAINT "PlanModel_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanScore" ADD CONSTRAINT "PlanScore_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelScore" ADD CONSTRAINT "ModelScore_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricePoint" ADD CONSTRAINT "PricePoint_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SourceMonitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

