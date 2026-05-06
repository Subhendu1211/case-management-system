-- Migration: enforce forwarding letter flow via Registrar -> PS -> Stationery -> Dispatched
-- Date: 2026-04-04

BEGIN;

-- Remove older/skip-path transitions so the sequence cannot bypass PS letter-number step.
DELETE FROM workflow_transitions
WHERE (from_status, to_status) IN (
    ('APPROVED', 'DISPATCH_PENDING'),
    ('LEGAL_FORWARDING', 'DISPATCH_PENDING'),
    ('LEGAL_FORWARDING', 'FORWARDING_STATIONERY'),
    ('FORWARDING_STATIONERY', 'REGISTRAR_SIGNING'),
    ('REGISTRAR_SIGNING', 'DISPATCH_PENDING'),
    ('DISPATCH_PENDING', 'CLOSED'),
    ('DISPATCHED', 'CLOSED')
);

-- Step 1: Forwarding letter prepared -> Registrar for signing
INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
VALUES (
    gen_random_uuid(),
    'LEGAL_FORWARDING',
    'REGISTRAR_SIGNING',
    ARRAY['PROGRAMMER','ADMIN']::role[],
    false,
    'Programmer prepares forwarding letter and sends to Registrar for signing'
)
ON CONFLICT (from_status, to_status) DO UPDATE
SET
    allowed_roles = EXCLUDED.allowed_roles,
    auto_transition = EXCLUDED.auto_transition,
    description = EXCLUDED.description;

-- Step 2: Registrar signed -> PS for letter number
INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
VALUES (
    gen_random_uuid(),
    'REGISTRAR_SIGNING',
    'FORWARDING_STATIONERY',
    ARRAY['REGISTRAR','ADMIN']::role[],
    false,
    'Registrar signs forwarding letter and sends to PS for letter number'
)
ON CONFLICT (from_status, to_status) DO UPDATE
SET
    allowed_roles = EXCLUDED.allowed_roles,
    auto_transition = EXCLUDED.auto_transition,
    description = EXCLUDED.description;

-- Step 3: PS letter number -> Stationery dispatch queue
INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
VALUES (
    gen_random_uuid(),
    'FORWARDING_STATIONERY',
    'DISPATCH_PENDING',
    ARRAY['PRIVATE_SECRETARY','ADMIN']::role[],
    false,
    'PS assigns letter number and sends to Stationery for dispatch'
)
ON CONFLICT (from_status, to_status) DO UPDATE
SET
    allowed_roles = EXCLUDED.allowed_roles,
    auto_transition = EXCLUDED.auto_transition,
    description = EXCLUDED.description;

-- Step 4: Stationery/CA dispatches -> Dispatched
INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
VALUES (
    gen_random_uuid(),
    'DISPATCH_PENDING',
    'DISPATCHED',
    ARRAY['STATIONERY','COMPUTER_ASSISTANT','ADMIN']::role[],
    false,
    'Computer Assistant or Stationery dispatches the case'
)
ON CONFLICT (from_status, to_status) DO UPDATE
SET
    allowed_roles = EXCLUDED.allowed_roles,
    auto_transition = EXCLUDED.auto_transition,
    description = EXCLUDED.description;

COMMIT;
