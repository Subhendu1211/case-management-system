-- Migration: remove "Registrar returns to Programmer for updates" from DISPATCH_PENDING actions
-- Date: 2026-04-04

BEGIN;

DELETE FROM workflow_transitions
WHERE from_status = 'DISPATCH_PENDING'
  AND (
    to_status IN ('LEGAL_FORWARDING', 'REGISTRAR_FINAL_REVIEW')
    OR description = 'Registrar returns to Programmer for updates'
  );

COMMIT;
