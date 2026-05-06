-- Add LEGAL_FORWARDING status and transitions for forwarding letter workflow
BEGIN;

-- Add enum value if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'case_status' AND e.enumlabel = 'LEGAL_FORWARDING'
    ) THEN
        ALTER TYPE case_status ADD VALUE 'LEGAL_FORWARDING';
    END IF;
END;
$$;

-- Seed workflow transitions for the new status
INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
VALUES
    (gen_random_uuid(), 'APPROVED', 'LEGAL_FORWARDING', ARRAY['COMMISSIONER','ADMIN']::role[], false, 'Send to Legal for forwarding letter'),
    (gen_random_uuid(), 'LEGAL_FORWARDING', 'DISPATCH_PENDING', ARRAY['STATIONERY','ADMIN']::role[], false, 'Move to dispatch after forwarding letter')
ON CONFLICT DO NOTHING;

COMMIT;
