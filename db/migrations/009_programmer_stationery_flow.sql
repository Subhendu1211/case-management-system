-- Enforce programmer and stationery steps before legal drafting
DO $$ BEGIN
    ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'PROGRAMMER_REVIEW';
    ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'STATIONERY_REVIEW';
END $$;

DO $$ BEGIN
    ALTER TYPE "SectionAssigned" ADD VALUE IF NOT EXISTS 'PROGRAMMER';
END $$;

-- Remove direct routing to REGISTERED from legal to enforce the new sequence
DELETE FROM workflow_transitions
WHERE from_status = 'ROUTED_TO_LEGAL'
  AND to_status = 'REGISTERED';

-- Route to programmer after legal routing
INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
SELECT gen_random_uuid(), 'ROUTED_TO_LEGAL', 'PROGRAMMER_REVIEW', ARRAY['PROGRAMMER','ADMIN']::"Role"[], false,
       'Programmer review after routing to legal'
WHERE NOT EXISTS (
    SELECT 1 FROM workflow_transitions WHERE from_status = 'ROUTED_TO_LEGAL' AND to_status = 'PROGRAMMER_REVIEW'
);

-- Programmer hands off to stationery
INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
SELECT gen_random_uuid(), 'PROGRAMMER_REVIEW', 'STATIONERY_REVIEW', ARRAY['PROGRAMMER','ADMIN']::"Role"[], false,
       'Programmer sends to stationery'
WHERE NOT EXISTS (
    SELECT 1 FROM workflow_transitions WHERE from_status = 'PROGRAMMER_REVIEW' AND to_status = 'STATIONERY_REVIEW'
);

-- Stationery hands off back to legal track (registered)
INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
SELECT gen_random_uuid(), 'STATIONERY_REVIEW', 'REGISTERED', ARRAY['STATIONERY','ADMIN']::"Role"[], false,
       'Stationery review complete; return to legal'
WHERE NOT EXISTS (
    SELECT 1 FROM workflow_transitions WHERE from_status = 'STATIONERY_REVIEW' AND to_status = 'REGISTERED'
);

-- Keep legal drafting transition explicit
INSERT INTO workflow_transitions (id, from_status, to_status, allowed_roles, auto_transition, description)
SELECT gen_random_uuid(), 'REGISTERED', 'ORDER_SHEET_DRAFTED', ARRAY['LEGAL_ASSISTANT','ADMIN']::"Role"[], false,
       'Legal drafts order sheet after stationery review'
WHERE NOT EXISTS (
    SELECT 1 FROM workflow_transitions WHERE from_status = 'REGISTERED' AND to_status = 'ORDER_SHEET_DRAFTED'
);
