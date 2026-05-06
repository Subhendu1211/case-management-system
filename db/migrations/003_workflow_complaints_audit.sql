-- Migration: workflow_transitions + complaints + audit payload snapshot
-- Safe to re-run (uses IF NOT EXISTS / guarded blocks).

BEGIN;

-- 1) Enums
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_channel') THEN
		CREATE TYPE complaint_channel AS ENUM ('EMAIL', 'PHONE', 'IN_PERSON', 'LETTER');
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'case_priority') THEN
		CREATE TYPE case_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
	END IF;
END $$;

-- 2) Workflow transitions (DB-driven state machine)
CREATE TABLE IF NOT EXISTS workflow_transitions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	from_status case_status,
	to_status case_status NOT NULL,
	allowed_roles role[] NOT NULL,
	auto_transition boolean NOT NULL DEFAULT false,
	description text,
	created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_transitions_from_to ON workflow_transitions(from_status, to_status);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_to ON workflow_transitions(to_status);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_roles_gin ON workflow_transitions USING GIN (allowed_roles);

-- 3) Complaints intake
CREATE TABLE IF NOT EXISTS complaints (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	reference_no text NOT NULL UNIQUE,
	name text NOT NULL,
	contact text,
	address text,
	subject text NOT NULL,
	description text NOT NULL,
	channel complaint_channel NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	created_ip inet,
	linked_case_year integer,
	linked_case_id uuid,
	CONSTRAINT fk_complaints_linked_case
		FOREIGN KEY (linked_case_year, linked_case_id)
		REFERENCES cases(case_year, id)
		ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_linked_case ON complaints(linked_case_year, linked_case_id);

-- 4) Audit log improvements (partition-safe)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address inet;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS payload_snapshot jsonb;

COMMIT;
