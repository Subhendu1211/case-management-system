-- Migration: allow commissioner to revert registered cases back to legal

BEGIN;

INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
VALUES
    (gen_random_uuid(), 'REGISTERED', 'ROUTED_TO_LEGAL', ARRAY['COMMISSIONER','ADMIN']::role[], false, 'Send back to Legal')
ON CONFLICT DO NOTHING;

COMMIT;
