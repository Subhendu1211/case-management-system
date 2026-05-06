-- Migration: allow Registrar to handle order-sheet work (including reopened cases)
-- Date: 2026-04-04

BEGIN;

-- REGISTERED -> ORDER_SHEET_DRAFTED
INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
VALUES (
    gen_random_uuid(),
    'REGISTERED',
    'ORDER_SHEET_DRAFTED',
    ARRAY['LEGAL_ASSISTANT','REGISTRAR','ADMIN']::role[],
    false,
    'Legal Assistant or Registrar drafts order sheet'
)
ON CONFLICT (from_status, to_status) DO UPDATE
SET
    allowed_roles = EXCLUDED.allowed_roles,
    auto_transition = EXCLUDED.auto_transition,
    description = EXCLUDED.description;

-- ORDER_SHEET_DRAFTED -> REGISTRAR_REVIEW
INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
VALUES (
    gen_random_uuid(),
    'ORDER_SHEET_DRAFTED',
    'REGISTRAR_REVIEW',
    ARRAY['LEGAL_ASSISTANT','REGISTRAR','ADMIN']::role[],
    false,
    'Send draft order sheet to Registrar review stage'
)
ON CONFLICT (from_status, to_status) DO UPDATE
SET
    allowed_roles = EXCLUDED.allowed_roles,
    auto_transition = EXCLUDED.auto_transition,
    description = EXCLUDED.description;

-- CLOSED -> ORDER_SHEET_DRAFTED (re-open and continue work)
INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
VALUES (
    gen_random_uuid(),
    'CLOSED',
    'ORDER_SHEET_DRAFTED',
    ARRAY['LEGAL_ASSISTANT','REGISTRAR','ADMIN']::role[],
    false,
    'Re-open case from Processing House (New Communication)'
)
ON CONFLICT (from_status, to_status) DO UPDATE
SET
    allowed_roles = EXCLUDED.allowed_roles,
    auto_transition = EXCLUDED.auto_transition,
    description = EXCLUDED.description;

COMMIT;
