-- Existing listings remain visible. Withdrawal preserves all related records.
ALTER TABLE "Property" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;
