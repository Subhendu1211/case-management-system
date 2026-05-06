-- Migration: make workflow_transitions idempotent + seed defaults

BEGIN;

-- Uniqueness to prevent duplicate rules
CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_from_to_not_null
	ON workflow_transitions(from_status, to_status)
	WHERE from_status IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_to_when_from_null
	ON workflow_transitions(to_status)
	WHERE from_status IS NULL;

-- Seed baseline transitions
INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
VALUES
	(gen_random_uuid(), NULL, 'DIARY_ENTERED', ARRAY['PRIVATE_SECRETARY','ADMIN']::role[], false, 'Initial diary entry / case creation'),
	(gen_random_uuid(), 'DIARY_ENTERED', 'UNDER_REVIEW', ARRAY['PRIVATE_SECRETARY','ADMIN']::role[], true, 'Auto move to commissioner review'),
	(gen_random_uuid(), 'UNDER_REVIEW', 'ROUTED_TO_LEGAL', ARRAY['COMMISSIONER','ADMIN']::role[], false, 'Commissioner routes to legal'),
	(gen_random_uuid(), 'UNDER_REVIEW', 'ROUTED_TO_OE', ARRAY['COMMISSIONER','ADMIN']::role[], false, 'Commissioner routes to OE'),
	(gen_random_uuid(), 'UNDER_REVIEW', 'NOT_RELATED', ARRAY['COMMISSIONER','ADMIN']::role[], false, 'Not related; close path'),
	(gen_random_uuid(), 'ROUTED_TO_LEGAL', 'REGISTERED', ARRAY['LEGAL_ASSISTANT','ADMIN']::role[], false, 'Legal registration'),
	(gen_random_uuid(), 'REGISTERED', 'ORDER_SHEET_DRAFTED', ARRAY['LEGAL_ASSISTANT','ADMIN']::role[], false, 'Order sheet drafted'),
	(gen_random_uuid(), 'ORDER_SHEET_DRAFTED', 'REGISTRAR_REVIEW', ARRAY['LEGAL_ASSISTANT','ADMIN']::role[], false, 'Submit to registrar'),
	(gen_random_uuid(), 'REGISTRAR_REVIEW', 'COMMISSIONER_APPROVAL', ARRAY['REGISTRAR','ADMIN']::role[], false, 'Registrar forwards for approval'),
	(gen_random_uuid(), 'COMMISSIONER_APPROVAL', 'APPROVED', ARRAY['COMMISSIONER','ADMIN']::role[], false, 'Commissioner approves'),
	(gen_random_uuid(), 'APPROVED', 'DISPATCH_PENDING', ARRAY['STATIONERY','ADMIN']::role[], false, 'Prepare dispatch'),
	(gen_random_uuid(), 'DISPATCH_PENDING', 'DISPATCHED', ARRAY['STATIONERY','ADMIN']::role[], false, 'Dispatch completed'),
	(gen_random_uuid(), 'DISPATCHED', 'CLOSED', ARRAY['PRIVATE_SECRETARY','ADMIN']::role[], false, 'Close case')
ON CONFLICT DO NOTHING;

COMMIT;
