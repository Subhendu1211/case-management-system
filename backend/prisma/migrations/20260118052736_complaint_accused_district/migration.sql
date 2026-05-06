/*
  Warnings:

  - Added the required column `accused_district` to the `complaints` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "complaints" ADD COLUMN     "accused_district" TEXT NOT NULL;
