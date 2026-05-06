-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CaseStatus" ADD VALUE 'REVIEW_DONE';
ALTER TYPE "CaseStatus" ADD VALUE 'CASE_ACCEPTED';
ALTER TYPE "CaseStatus" ADD VALUE 'PENDING_QUERY';
ALTER TYPE "CaseStatus" ADD VALUE 'LEGAL_FORWARDING';

-- CreateTable
CREATE TABLE "issue_register" (
    "id" UUID NOT NULL,
    "case_year" INTEGER NOT NULL,
    "case_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "recipient" TEXT,
    "channel" TEXT,
    "subject" TEXT,
    "body" TEXT,
    "reference_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_register_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_letters" (
    "id" UUID NOT NULL,
    "case_year" INTEGER NOT NULL,
    "case_id" UUID NOT NULL,
    "recipient_type" TEXT NOT NULL,
    "channel" "DispatchChannel" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_letters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issue_register_case_year_case_id_idx" ON "issue_register"("case_year", "case_id");

-- CreateIndex
CREATE INDEX "query_letters_case_year_case_id_idx" ON "query_letters"("case_year", "case_id");

-- AddForeignKey
ALTER TABLE "issue_register" ADD CONSTRAINT "issue_register_case_year_case_id_fkey" FOREIGN KEY ("case_year", "case_id") REFERENCES "cases"("case_year", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_register" ADD CONSTRAINT "issue_register_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_letters" ADD CONSTRAINT "query_letters_case_year_case_id_fkey" FOREIGN KEY ("case_year", "case_id") REFERENCES "cases"("case_year", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_letters" ADD CONSTRAINT "query_letters_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
