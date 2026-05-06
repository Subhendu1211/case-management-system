-- Migration: add revision loops for order sheet workflow

BEGIN;

INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
VALUES
	(gen_random_uuid(), 'REGISTRAR_REVIEW', 'ORDER_SHEET_DRAFTED', ARRAY['REGISTRAR','ADMIN']::role[], false, 'Registrar requests revision (back to drafting)'),
	(gen_random_uuid(), 'COMMISSIONER_APPROVAL', 'ORDER_SHEET_DRAFTED', ARRAY['COMMISSIONER','ADMIN']::role[], false, 'Commissioner requests revision (back to drafting)')
ON CONFLICT DO NOTHING;

COMMIT;
