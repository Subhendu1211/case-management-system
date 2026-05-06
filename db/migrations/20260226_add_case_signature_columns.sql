-- Migration: Add signature-related nullable columns to cases table
-- Date: 2026-02-26
-- Purpose: Align DB schema with Prisma Case model and prevent list/detail query failures

BEGIN;

ALTER TABLE cases
	ADD COLUMN IF NOT EXISTS registrar_signature_data text,
	ADD COLUMN IF NOT EXISTS commissioner_signature_data text,
	ADD COLUMN IF NOT EXISTS commissioner_stamp_url text;

COMMIT;
