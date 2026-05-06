/*
  Warnings:

  - Added the required column `created_by_source` to the `complaints` table without a default value. This is not possible if the table is not empty.
  - Added the required column `district` to the `complaints` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "created_by_source" AS ENUM ('SELF', 'DISTRICT_DEPARTMENT_OFFICER', 'OTHER');

-- AlterTable
ALTER TABLE "complaints" ADD COLUMN     "created_by_other_name" TEXT,
ADD COLUMN     "created_by_source" "created_by_source" NOT NULL,
ADD COLUMN     "district" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "complaint_documents" (
    "id" UUID NOT NULL,
    "complaint_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "complaint_documents_complaint_id_idx" ON "complaint_documents"("complaint_id");

-- AddForeignKey
ALTER TABLE "complaint_documents" ADD CONSTRAINT "complaint_documents_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_documents" ADD CONSTRAINT "complaint_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
