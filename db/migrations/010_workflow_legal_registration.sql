-- Migration: allow Legal Assistant to register routed cases

BEGIN;

INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
SELECT gen_random_uuid(), 'ROUTED_TO_LEGAL', 'REGISTERED', ARRAY['LEGAL_ASSISTANT','ADMIN']::role[], false, 'Legal registration'
WHERE NOT EXISTS (
    SELECT 1 FROM workflow_transitions
    WHERE from_status = 'ROUTED_TO_LEGAL' AND to_status = 'REGISTERED'
);

UPDATE workflow_transitions
SET allowed_roles = ARRAY(
    SELECT DISTINCT unnest(allowed_roles || ARRAY['LEGAL_ASSISTANT']::role[])
)
WHERE from_status = 'ROUTED_TO_LEGAL' AND to_status = 'REGISTERED';

COMMIT;
