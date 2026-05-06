-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PRIVATE_SECRETARY', 'COMMISSIONER', 'LEGAL_ASSISTANT', 'REGISTRAR', 'PROGRAMMER', 'STATIONERY', 'ADMIN');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('DRAFT', 'DIARY_ENTERED', 'REGISTERED', 'UNDER_REVIEW', 'ROUTED_TO_LEGAL', 'ROUTED_TO_OE', 'NOT_RELATED', 'ORDER_SHEET_DRAFTED', 'REGISTRAR_REVIEW', 'COMMISSIONER_APPROVAL', 'APPROVED', 'DISPATCH_PENDING', 'DISPATCHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SectionAssigned" AS ENUM ('COMMISSIONER', 'LEGAL', 'OE', 'REGISTRAR', 'STATIONERY');

-- CreateEnum
CREATE TYPE "DispatchType" AS ENUM ('INWARD', 'OUTWARD');

-- CreateEnum
CREATE TYPE "DispatchChannel" AS ENUM ('BY_HAND', 'POST', 'COURIER', 'EMAIL');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('COMPLAINT', 'ORDER_SHEET', 'FORWARDING_LETTER', 'ATTACHMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "complaint_channel" AS ENUM ('EMAIL', 'PHONE', 'IN_PERSON', 'LETTER');

-- CreateEnum
CREATE TYPE "party_type" AS ENUM ('INDIVIDUAL', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "order_sheet_status" AS ENUM ('DRAFT', 'SUBMITTED', 'REVISIONS_REQUESTED_BY_REGISTRAR', 'FORWARDED_BY_REGISTRAR', 'REVISIONS_REQUESTED_BY_COMMISSIONER', 'APPROVED_BY_COMMISSIONER', 'CANCELLED');

-- CreateEnum
CREATE TYPE "forwarding_letter_status" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'CANCELLED');

-- CreateTable
CREATE TABLE "workflow_transitions" (
    "id" UUID NOT NULL,
    "from_status" "CaseStatus",
    "to_status" "CaseStatus" NOT NULL,
    "allowed_roles" "Role"[],
    "auto_transition" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,

    CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" UUID NOT NULL,
    "reference_no" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "complainant_type" "party_type" NOT NULL,
    "contact" TEXT,
    "complainant_address_line1" TEXT NOT NULL,
    "complainant_address_line2" TEXT,
    "complainant_city" TEXT NOT NULL,
    "complainant_state" TEXT NOT NULL,
    "complainant_postal_code" TEXT NOT NULL,
    "complainant_country" TEXT NOT NULL,
    "accused_name" TEXT NOT NULL,
    "accused_type" "party_type" NOT NULL,
    "accused_address_line1" TEXT NOT NULL,
    "accused_address_line2" TEXT,
    "accused_city" TEXT NOT NULL,
    "accused_state" TEXT NOT NULL,
    "accused_postal_code" TEXT NOT NULL,
    "accused_country" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "channel" "complaint_channel" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_ip" INET,
    "linked_case_year" INTEGER,
    "linked_case_id" UUID,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_jti" TEXT NOT NULL,
    "refresh_hash" TEXT NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "case_year" INTEGER NOT NULL,
    "id" UUID NOT NULL,
    "registration_no" TEXT NOT NULL,
    "case_no" TEXT,
    "sl_no" INTEGER,
    "status" "CaseStatus" NOT NULL,
    "section_assigned" "SectionAssigned" NOT NULL,
    "assigned_to_id" UUID,
    "complainant_name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "received_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("case_year","id")
);

-- CreateTable
CREATE TABLE "case_status_history" (
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" UUID NOT NULL,
    "case_year" INTEGER NOT NULL,
    "case_id" UUID NOT NULL,
    "old_status" "CaseStatus" NOT NULL,
    "new_status" "CaseStatus" NOT NULL,
    "remarks" TEXT,
    "changed_by_id" UUID,

    CONSTRAINT "case_status_history_pkey" PRIMARY KEY ("changed_at","id")
);

-- CreateTable
CREATE TABLE "order_sheets" (
    "id" UUID NOT NULL,
    "case_year" INTEGER NOT NULL,
    "case_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "order_sheet_status" NOT NULL,
    "prepared_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_sheet_review_history" (
    "id" UUID NOT NULL,
    "order_sheet_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "remarks" TEXT,
    "actor_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_sheet_review_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forwarding_letters" (
    "id" UUID NOT NULL,
    "case_year" INTEGER NOT NULL,
    "case_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "forwarding_letter_status" NOT NULL,
    "prepared_by_id" UUID NOT NULL,
    "signed_by_id" UUID,
    "signed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forwarding_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_dispatch" (
    "dispatched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" UUID NOT NULL,
    "case_year" INTEGER NOT NULL,
    "case_id" UUID NOT NULL,
    "type" "DispatchType" NOT NULL,
    "channel" "DispatchChannel" NOT NULL,
    "address_to" TEXT,
    "tracking_no" TEXT,
    "received_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_dispatch_pkey" PRIMARY KEY ("dispatched_at","id")
);

-- CreateTable
CREATE TABLE "documents" (
    "case_id" UUID NOT NULL,
    "id" UUID NOT NULL,
    "case_year" INTEGER NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("case_id","id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" UUID NOT NULL,
    "user_id" UUID,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "status_code" INTEGER NOT NULL,
    "ip" TEXT,
    "ip_address" INET,
    "user_agent" TEXT,
    "payload_snapshot" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("created_at","id")
);

-- CreateIndex
CREATE INDEX "workflow_transitions_from_status_to_status_idx" ON "workflow_transitions"("from_status", "to_status");

-- CreateIndex
CREATE INDEX "workflow_transitions_to_status_idx" ON "workflow_transitions"("to_status");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_reference_no_key" ON "complaints"("reference_no");

-- CreateIndex
CREATE INDEX "complaints_created_at_idx" ON "complaints"("created_at");

-- CreateIndex
CREATE INDEX "complaints_linked_case_year_linked_case_id_idx" ON "complaints"("linked_case_year", "linked_case_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_section_assigned_idx" ON "cases"("section_assigned");

-- CreateIndex
CREATE INDEX "cases_case_year_idx" ON "cases"("case_year");

-- CreateIndex
CREATE INDEX "cases_assigned_to_id_idx" ON "cases"("assigned_to_id");

-- CreateIndex
CREATE INDEX "cases_registration_no_idx" ON "cases"("registration_no");

-- CreateIndex
CREATE INDEX "cases_case_no_idx" ON "cases"("case_no");

-- CreateIndex
CREATE INDEX "cases_sl_no_idx" ON "cases"("sl_no");

-- CreateIndex
CREATE INDEX "cases_created_at_idx" ON "cases"("created_at");

-- CreateIndex
CREATE INDEX "case_status_history_case_id_idx" ON "case_status_history"("case_id");

-- CreateIndex
CREATE INDEX "case_status_history_new_status_idx" ON "case_status_history"("new_status");

-- CreateIndex
CREATE INDEX "case_status_history_changed_at_idx" ON "case_status_history"("changed_at");

-- CreateIndex
CREATE INDEX "order_sheets_case_id_idx" ON "order_sheets"("case_id");

-- CreateIndex
CREATE INDEX "order_sheets_status_idx" ON "order_sheets"("status");

-- CreateIndex
CREATE INDEX "order_sheets_prepared_by_id_idx" ON "order_sheets"("prepared_by_id");

-- CreateIndex
CREATE INDEX "order_sheet_review_history_order_sheet_id_idx" ON "order_sheet_review_history"("order_sheet_id");

-- CreateIndex
CREATE INDEX "order_sheet_review_history_actor_id_idx" ON "order_sheet_review_history"("actor_id");

-- CreateIndex
CREATE INDEX "forwarding_letters_case_id_idx" ON "forwarding_letters"("case_id");

-- CreateIndex
CREATE INDEX "forwarding_letters_status_idx" ON "forwarding_letters"("status");

-- CreateIndex
CREATE INDEX "case_dispatch_case_id_idx" ON "case_dispatch"("case_id");

-- CreateIndex
CREATE INDEX "case_dispatch_type_idx" ON "case_dispatch"("type");

-- CreateIndex
CREATE INDEX "case_dispatch_channel_idx" ON "case_dispatch"("channel");

-- CreateIndex
CREATE INDEX "case_dispatch_dispatched_at_idx" ON "case_dispatch"("dispatched_at");

-- CreateIndex
CREATE INDEX "documents_case_id_idx" ON "documents"("case_id");

-- CreateIndex
CREATE INDEX "documents_created_at_idx" ON "documents"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_module_idx" ON "audit_logs"("module");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_linked_case_year_linked_case_id_fkey" FOREIGN KEY ("linked_case_year", "linked_case_id") REFERENCES "cases"("case_year", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_case_year_case_id_fkey" FOREIGN KEY ("case_year", "case_id") REFERENCES "cases"("case_year", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_history" ADD CONSTRAINT "case_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_sheets" ADD CONSTRAINT "order_sheets_case_year_case_id_fkey" FOREIGN KEY ("case_year", "case_id") REFERENCES "cases"("case_year", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_sheets" ADD CONSTRAINT "order_sheets_prepared_by_id_fkey" FOREIGN KEY ("prepared_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_sheet_review_history" ADD CONSTRAINT "order_sheet_review_history_order_sheet_id_fkey" FOREIGN KEY ("order_sheet_id") REFERENCES "order_sheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_sheet_review_history" ADD CONSTRAINT "order_sheet_review_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forwarding_letters" ADD CONSTRAINT "forwarding_letters_case_year_case_id_fkey" FOREIGN KEY ("case_year", "case_id") REFERENCES "cases"("case_year", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forwarding_letters" ADD CONSTRAINT "forwarding_letters_prepared_by_id_fkey" FOREIGN KEY ("prepared_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forwarding_letters" ADD CONSTRAINT "forwarding_letters_signed_by_id_fkey" FOREIGN KEY ("signed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_dispatch" ADD CONSTRAINT "case_dispatch_case_year_case_id_fkey" FOREIGN KEY ("case_year", "case_id") REFERENCES "cases"("case_year", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_case_year_case_id_fkey" FOREIGN KEY ("case_year", "case_id") REFERENCES "cases"("case_year", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
