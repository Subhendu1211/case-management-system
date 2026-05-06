-- Add CITIZEN role
DO $$ BEGIN
    ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CITIZEN';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add complaint owner reference
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "created_by_id" UUID;

CREATE INDEX IF NOT EXISTS "complaints_created_by_id_idx" ON "complaints"("created_by_id");

ALTER TABLE "complaints"
    ADD CONSTRAINT "complaints_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
