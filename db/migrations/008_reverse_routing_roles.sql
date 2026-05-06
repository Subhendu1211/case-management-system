-- Migration: widen allowed roles for reverse routing transitions back to Commissioner

BEGIN;

UPDATE workflow_transitions
SET allowed_roles = ARRAY['LEGAL_ASSISTANT','COMMISSIONER','ADMIN']::role[]
WHERE from_status = 'ROUTED_TO_LEGAL' AND to_status = 'UNDER_REVIEW';

UPDATE workflow_transitions
SET allowed_roles = ARRAY['PRIVATE_SECRETARY','COMMISSIONER','ADMIN']::role[]
WHERE from_status = 'ROUTED_TO_OE' AND to_status = 'UNDER_REVIEW';

COMMIT;
