ALTER TABLE "ChangeLog" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "ChangeLog" ADD COLUMN "sourceTitle" TEXT;
ALTER TABLE "ChangeLog" ADD COLUMN "checkedAt" TIMESTAMP(3);

ALTER TABLE "Plan" ALTER COLUMN "status" SET DEFAULT 'draft';

UPDATE "Plan"
SET "status" = 'draft', "officialUrl" = NULL, "lastVerifiedAt" = NULL
WHERE "slug" IN (
  'kimi-allegretto', 'kimi-presto', 'glm-pro', 'glm-flash-free',
  'minimax-coding', 'deepseek-payg', 'marscode-pro', 'claude-pro',
  'claude-max-5x', 'codex-plus', 'cursor-pro', 'copilot-pro',
  'copilot-free', 'gemini-ai-pro', 'opencode-zen'
);

UPDATE "Plan"
SET "status" = 'draft', "lastVerifiedAt" = NULL
WHERE "status" = 'published'
  AND ("officialUrl" IS NULL OR BTRIM("officialUrl") = '');

UPDATE "Plan" AS p
SET "status" = 'draft', "lastVerifiedAt" = NULL
FROM "Provider" AS provider
WHERE p."providerId" = provider."id"
  AND p."status" = 'published'
  AND (
    BTRIM(p."officialUrl") ~* '^https?://[^/?#]+/?$'
    OR (
      provider."website" IS NOT NULL
      AND LOWER(REGEXP_REPLACE(BTRIM(p."officialUrl"), '/+$', '')) =
          LOWER(REGEXP_REPLACE(BTRIM(provider."website"), '/+$', ''))
    )
  );
