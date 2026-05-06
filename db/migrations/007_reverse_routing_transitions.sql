-- Migration: add reverse routing transitions with reasons required via existing remarks validation

BEGIN;

INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
VALUES
    (gen_random_uuid(), 'ROUTED_TO_LEGAL', 'UNDER_REVIEW', ARRAY['COMMISSIONER','ADMIN']::role[], false, 'Return from legal to commissioner review'),
    (gen_random_uuid(), 'ROUTED_TO_OE', 'UNDER_REVIEW', ARRAY['COMMISSIONER','ADMIN']::role[], false, 'Return from OE to commissioner review')
ON CONFLICT DO NOTHING;

COMMIT;
