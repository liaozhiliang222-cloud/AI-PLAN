-- Preserve existing Model/ModelScore rows while adding auditable Artificial Analysis provenance.
ALTER TABLE "Model"
ADD COLUMN "aaModelId" TEXT,
ADD COLUMN "aaIndexVersion" TEXT,
ADD COLUMN "aaFetchedAt" TIMESTAMP(3),
ADD COLUMN "aaSourceUrl" TEXT;

CREATE UNIQUE INDEX "Model_aaModelId_key" ON "Model"("aaModelId");

-- AA reports missing measurements as null. Legacy editorial rows remain unchanged.
ALTER TABLE "ModelScore"
ALTER COLUMN "overall" DROP NOT NULL,
ALTER COLUMN "coding" DROP NOT NULL,
ALTER COLUMN "agent" DROP NOT NULL,
ALTER COLUMN "frontend" DROP NOT NULL,
ALTER COLUMN "backend" DROP NOT NULL,
ALTER COLUMN "debug" DROP NOT NULL,
ALTER COLUMN "longContext" DROP NOT NULL,
ALTER COLUMN "speed" DROP NOT NULL,
ALTER COLUMN "cost" DROP NOT NULL;
