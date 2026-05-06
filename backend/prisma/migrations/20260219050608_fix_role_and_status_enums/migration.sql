/*
  Warnings:

  - The `allowed_roles` column on the `workflow_transitions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `role` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "role" AS ENUM ('PRIVATE_SECRETARY', 'PRIVATE_ASSISTANT', 'COMMISSIONER', 'LEGAL_ASSISTANT', 'REGISTRAR', 'PROGRAMMER', 'STATIONERY', 'COMPUTER_ASSISTANT', 'ADMIN', 'CITIZEN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CaseStatus" ADD VALUE 'PS_POST_ACCEPTANCE';
ALTER TYPE "CaseStatus" ADD VALUE 'PROGRAMMER_REVIEW';
ALTER TYPE "CaseStatus" ADD VALUE 'STATIONERY_REVIEW';
ALTER TYPE "CaseStatus" ADD VALUE 'PA_TO_COMMISSIONER';
ALTER TYPE "CaseStatus" ADD VALUE 'PA_POST_APPROVAL';
ALTER TYPE "CaseStatus" ADD VALUE 'REGISTRAR_HANDOVER';
ALTER TYPE "CaseStatus" ADD VALUE 'FORWARDING_STATIONERY';
ALTER TYPE "CaseStatus" ADD VALUE 'REGISTRAR_SIGNING';
ALTER TYPE "CaseStatus" ADD VALUE 'REGISTRAR_FINAL_REVIEW';

-- AlterEnum
ALTER TYPE "SectionAssigned" ADD VALUE 'PROGRAMMER';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
ADD COLUMN     "role" "role" NOT NULL;

-- AlterTable
ALTER TABLE "workflow_transitions" DROP COLUMN "allowed_roles",
ADD COLUMN     "allowed_roles" "role"[];

-- DropEnum
DROP TYPE "Role";
