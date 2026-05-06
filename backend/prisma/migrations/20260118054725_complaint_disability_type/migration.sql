-- AlterTable
ALTER TABLE "complaints" ADD COLUMN     "disability_type_id" UUID;

-- CreateTable
CREATE TABLE "disability_types" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disability_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disability_types_name_key" ON "disability_types"("name");

-- CreateIndex
CREATE INDEX "complaints_disability_type_id_idx" ON "complaints"("disability_type_id");

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_disability_type_id_fkey" FOREIGN KEY ("disability_type_id") REFERENCES "disability_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
