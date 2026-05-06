ALTER TABLE "complaints"
ADD COLUMN IF NOT EXISTS "accused_block" TEXT,
ADD COLUMN IF NOT EXISTS "accused_police_station" TEXT,
ADD COLUMN IF NOT EXISTS "accused_post_office" TEXT;
