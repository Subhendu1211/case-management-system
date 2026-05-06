-- Ensure crypto helpers and enum types are available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Seed users (bcrypt-compatible hashes via pgcrypto)
-- Default password: Admin@123
INSERT INTO users (id, email, name, password_hash, role, is_active, updated_at)
VALUES (
        gen_random_uuid(),
        'admin@scpd.local',
        'Admin',
    crypt('Admin@123', gen_salt('bf')),
    'ADMIN',
    true,
    now()
    ),
    (
        gen_random_uuid(),
        'ps@scpd.local',
        'Private Secretary',
        crypt('Admin@123', gen_salt('bf')),
        'PRIVATE_SECRETARY',
        true,
        now()
    ),
    (
        gen_random_uuid(),
        'pa@scpd.local',
        'Private Assistant',
        crypt('Admin@123', gen_salt('bf')),
        'PRIVATE_ASSISTANT',
        true,
        now()
    ),
    (
        gen_random_uuid(),
        'commissioner@scpd.local',
        'Commissioner',
        crypt('Admin@123', gen_salt('bf')),
        'COMMISSIONER',
        true,
        now()
    ),
    (
        gen_random_uuid(),
        'legal@scpd.local',
        'Legal Assistant',
        crypt('Admin@123', gen_salt('bf')),
        'LEGAL_ASSISTANT',
        true,
        now()
    ),
    (
        gen_random_uuid(),
        'registrar@scpd.local',
        'Registrar',
        crypt('Admin@123', gen_salt('bf')),
        'REGISTRAR',
        true,
        now()
    ),
    (
        gen_random_uuid(),
        'stationery@scpd.local',
        'Stationery',
        crypt('Admin@123', gen_salt('bf')),
        'STATIONERY',
        true,
        now()
    ),
    (
        gen_random_uuid(),
        'programmer@scpd.local',
        'Programmer',
        crypt('Admin@123', gen_salt('bf')),
        'PROGRAMMER',
        true,
        now()
    ),
    (
        gen_random_uuid(),
        'computer@scpd.local',
        'Computer Assistant',
        crypt('Admin@123', gen_salt('bf')),
        'COMPUTER_ASSISTANT',
        true,
        now()
    ) ON CONFLICT (email) DO NOTHING;

-- Disability types (Odisha Gazette / RPwD Act, non-exhaustive, active by default)
INSERT INTO disability_types (id, name, code, is_active)
VALUES
    (gen_random_uuid(), 'Blindness', NULL, true),
    (gen_random_uuid(), 'Low-vision', NULL, true),
    (gen_random_uuid(), 'Leprosy cured person', NULL, true),
    (gen_random_uuid(), 'Hearing impairment (deaf and hard of hearing)', NULL, true),
    (gen_random_uuid(), 'Locomotor disability', NULL, true),
    (gen_random_uuid(), 'Dwarfism', NULL, true),
    (gen_random_uuid(), 'Intellectual disability', NULL, true),
    (gen_random_uuid(), 'Mental illness', NULL, true),
    (gen_random_uuid(), 'Autism spectrum disorder', NULL, true),
    (gen_random_uuid(), 'Cerebral palsy', NULL, true),
    (gen_random_uuid(), 'Muscular dystrophy', NULL, true),
    (gen_random_uuid(), 'Chronic neurological conditions', NULL, true),
    (gen_random_uuid(), 'Specific learning disability', NULL, true),
    (gen_random_uuid(), 'Multiple sclerosis', NULL, true),
    (gen_random_uuid(), 'Speech and language disability', NULL, true),
    (gen_random_uuid(), 'Thalassemia', NULL, true),
    (gen_random_uuid(), 'Hemophilia', NULL, true),
    (gen_random_uuid(), 'Sickle cell disease', NULL, true),
    (gen_random_uuid(), 'Multiple disabilities including deaf-blindness', NULL, true),
    (gen_random_uuid(), 'Acid attack victim', NULL, true),
    (gen_random_uuid(), 'Parkinson''s disease', NULL, true)
ON CONFLICT (name) DO NOTHING;

-- Seed workflow transitions (data-driven state machine)
-- Enforces PS -> Commissioner -> PS -> Legal -> Programmer -> Stationery -> Legal Assistant -> Registrar -> Commissioner -> Registrar -> Programmer (forwarding letter) -> Stationery -> Registrar -> Computer Assistant

-- Null-from transition
INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
VALUES (gen_random_uuid(), NULL, 'DIARY_ENTERED', ARRAY['PRIVATE_SECRETARY','ADMIN']::role[], false, 'Initial diary entry by Private Secretary')
ON CONFLICT (to_status) WHERE from_status IS NULL
DO UPDATE SET allowed_roles = EXCLUDED.allowed_roles, auto_transition = EXCLUDED.auto_transition, description = EXCLUDED.description;

-- Main directed transitions
INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
VALUES
    (gen_random_uuid(), 'DIARY_ENTERED', 'UNDER_REVIEW', ARRAY['PRIVATE_SECRETARY','ADMIN']::role[], true, 'PS sends to Commissioner review'),
    (gen_random_uuid(), 'DIARY_ENTERED', 'ROUTED_TO_LEGAL', ARRAY['PRIVATE_SECRETARY','ADMIN']::role[], false, 'PS routes to Legal'),
    (gen_random_uuid(), 'DIARY_ENTERED', 'ROUTED_TO_OE', ARRAY['PRIVATE_SECRETARY','ADMIN']::role[], false, 'PS routes to OE'),
    (gen_random_uuid(), 'UNDER_REVIEW', 'DIARY_ENTERED', ARRAY['COMMISSIONER','ADMIN']::role[], false, 'Commissioner returns to PS'),
    (gen_random_uuid(), 'UNDER_REVIEW', 'REVIEW_DONE', ARRAY['COMMISSIONER','ADMIN']::role[], false, 'Commissioner marks review done'),
    (gen_random_uuid(), 'UNDER_REVIEW', 'NOT_RELATED', ARRAY['COMMISSIONER','ADMIN']::role[], false, 'Marked not related'),
    (gen_random_uuid(), 'REVIEW_DONE', 'COMMISSIONER_SIGNATURE', ARRAY['COMMISSIONER','ADMIN']::role[], false, 'Commissioner uploads signed and stamped document'),
    (gen_random_uuid(), 'COMMISSIONER_SIGNATURE', 'CASE_ACCEPTED', ARRAY['COMMISSIONER','ADMIN']::role[], false, 'Commissioner signature and stamp uploaded'),
    (gen_random_uuid(), 'CASE_ACCEPTED', 'PS_POST_ACCEPTANCE', ARRAY['PRIVATE_SECRETARY','ADMIN']::role[], false, 'PS receives accepted case'),
    (gen_random_uuid(), 'PS_POST_ACCEPTANCE', 'ROUTED_TO_LEGAL', ARRAY['PRIVATE_ASSISTANT','ADMIN']::role[], false, 'PA routes accepted case to Legal'),
    (gen_random_uuid(), 'CASE_ACCEPTED', 'ROUTED_TO_OE', ARRAY['PRIVATE_SECRETARY','ADMIN']::role[], false, 'PS routes accepted case to OE'),
    (gen_random_uuid(), 'ROUTED_TO_LEGAL', 'PROGRAMMER_REVIEW', ARRAY['PROGRAMMER','ADMIN']::role[], false, 'Legal -> Programmer review'),
    (gen_random_uuid(), 'ROUTED_TO_LEGAL', 'PENDING_QUERY', ARRAY['LEGAL_ASSISTANT','ADMIN']::role[], false, 'Legal sends query'),
    (gen_random_uuid(), 'ROUTED_TO_LEGAL', 'DIARY_ENTERED', ARRAY['LEGAL_ASSISTANT','ADMIN']::role[], false, 'Legal returns to PS'),
    (gen_random_uuid(), 'PROGRAMMER_REVIEW', 'STATIONERY_REVIEW', ARRAY['PROGRAMMER','ADMIN']::role[], false, 'Programmer -> Stationery'),
    (gen_random_uuid(), 'STATIONERY_REVIEW', 'REGISTERED', ARRAY['STATIONERY','ADMIN']::role[], false, 'Stationery completes review'),
    (gen_random_uuid(), 'REGISTERED', 'ORDER_SHEET_DRAFTED', ARRAY['LEGAL_ASSISTANT','ADMIN']::role[], false, 'Legal Assistant drafts order sheet'),
    (gen_random_uuid(), 'ORDER_SHEET_DRAFTED', 'PENDING_QUERY', ARRAY['LEGAL_ASSISTANT','ADMIN']::role[], false, 'Legal Assistant sends query after drafting'),
    (gen_random_uuid(), 'PENDING_QUERY', 'ROUTED_TO_LEGAL', ARRAY['LEGAL_ASSISTANT','ADMIN']::role[], false, 'Query response received'),
    (gen_random_uuid(), 'ORDER_SHEET_DRAFTED', 'REGISTRAR_REVIEW', ARRAY['LEGAL_ASSISTANT','ADMIN']::role[], false, 'Send draft to Registrar'),
    (gen_random_uuid(), 'REGISTRAR_REVIEW', 'REGISTRAR_UPLOAD_SIGNATURE', ARRAY['REGISTRAR','ADMIN']::role[], false, 'Registrar uploads signed document'),
    (gen_random_uuid(), 'REGISTRAR_UPLOAD_SIGNATURE', 'COMMISSIONER_APPROVAL', ARRAY['REGISTRAR','ADMIN']::role[], false, 'Registrar signature uploaded'),
    (gen_random_uuid(), 'REGISTRAR_REVIEW', 'ORDER_SHEET_DRAFTED', ARRAY['REGISTRAR','ADMIN']::role[], false, 'Registrar requests revision (back to drafting)'),
    (gen_random_uuid(), 'COMMISSIONER_APPROVAL', 'ORDER_SHEET_DRAFTED', ARRAY['COMMISSIONER','ADMIN']::role[], false, 'Commissioner requests revision (back to drafting)'),
    (gen_random_uuid(), 'COMMISSIONER_APPROVAL', 'APPROVED', ARRAY['COMMISSIONER','ADMIN']::role[], false, 'Commissioner approves'),
    (gen_random_uuid(), 'APPROVED', 'LEGAL_FORWARDING', ARRAY['REGISTRAR','ADMIN']::role[], false, 'Registrar requests forwarding letter'),
    (gen_random_uuid(), 'LEGAL_FORWARDING', 'REGISTRAR_FINAL_REVIEW', ARRAY['PROGRAMMER','ADMIN']::role[], false, 'Programmer sends forwarding letter to Registrar for signature'),
    (gen_random_uuid(), 'REGISTRAR_FINAL_REVIEW', 'DISPATCH_PENDING', ARRAY['REGISTRAR','ADMIN']::role[], false, 'Registrar signs forwarding letter'),
    (gen_random_uuid(), 'REGISTRAR_FINAL_REVIEW', 'LEGAL_FORWARDING', ARRAY['REGISTRAR','ADMIN']::role[], false, 'Registrar requests revision of forwarding letter'),
    (gen_random_uuid(), 'DISPATCH_PENDING', 'DISPATCHED', ARRAY['STATIONERY','ADMIN']::role[], false, 'Stationery dispatches'),
    (gen_random_uuid(), 'DISPATCHED', 'CLOSED', ARRAY['COMPUTER_ASSISTANT','REGISTRAR','ADMIN']::role[], false, 'Computer Assistant closes after dispatch')
ON CONFLICT (from_status, to_status) WHERE from_status IS NOT NULL
DO UPDATE SET allowed_roles = EXCLUDED.allowed_roles, auto_transition = EXCLUDED.auto_transition, description = EXCLUDED.description;

-- Remove shortcuts that skip the mandated path
DELETE FROM workflow_transitions WHERE from_status = 'ROUTED_TO_LEGAL' AND to_status = 'REGISTERED';
DELETE FROM workflow_transitions WHERE from_status = 'APPROVED' AND to_status = 'DISPATCH_PENDING';
DELETE FROM workflow_transitions WHERE from_status = 'CASE_ACCEPTED' AND to_status = 'ROUTED_TO_LEGAL';
DELETE FROM workflow_transitions WHERE from_status = 'UNDER_REVIEW' AND to_status IN ('ROUTED_TO_LEGAL', 'ROUTED_TO_OE');