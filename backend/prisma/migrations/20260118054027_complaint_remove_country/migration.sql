/*
  Warnings:

  - You are about to drop the column `accused_country` on the `complaints` table. All the data in the column will be lost.
  - You are about to drop the column `complainant_country` on the `complaints` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "complaints" DROP COLUMN "accused_country",
DROP COLUMN "complainant_country";
