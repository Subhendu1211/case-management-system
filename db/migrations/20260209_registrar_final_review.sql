-- Add REGISTRAR_FINAL_REVIEW status for registrar post-dispatch step
BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'case_status' AND e.enumlabel = 'REGISTRAR_FINAL_REVIEW'
    ) THEN
        ALTER TYPE case_status ADD VALUE 'REGISTRAR_FINAL_REVIEW';
    END IF;
END;
$$;

COMMIT;
