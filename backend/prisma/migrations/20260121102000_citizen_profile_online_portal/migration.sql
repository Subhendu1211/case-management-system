-- Add ONLINE_PORTAL to complaint_channel enum
DO $$ BEGIN
    ALTER TYPE complaint_channel ADD VALUE IF NOT EXISTS 'ONLINE_PORTAL';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Link public registrations to users
ALTER TABLE "public_registrations" ADD COLUMN IF NOT EXISTS "user_id" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "public_registrations_user_id_key" ON "public_registrations"("user_id");

ALTER TABLE "public_registrations"
    ADD CONSTRAINT "public_registrations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
