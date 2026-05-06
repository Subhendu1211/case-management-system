ALTER TABLE "complaints"
ADD COLUMN IF NOT EXISTS "complainant_block" TEXT,
ADD COLUMN IF NOT EXISTS "complainant_police_station" TEXT,
ADD COLUMN IF NOT EXISTS "complainant_post_office" TEXT;
