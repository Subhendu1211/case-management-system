-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateTable
CREATE TABLE "public_registrations" (
    "id" UUID NOT NULL,
    "registration_no" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "alternate_mobile" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "guardian_name" TEXT,
    "gender" "Gender",
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "pin_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_ip" INET,

    CONSTRAINT "public_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "public_registrations_registration_no_key" ON "public_registrations"("registration_no");

-- CreateIndex
CREATE INDEX "public_registrations_created_at_idx" ON "public_registrations"("created_at");
