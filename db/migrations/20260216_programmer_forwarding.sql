-- Migration: allow PROGRAMMER to participate in forwarding-letter transition
-- Date: 2026-02-16
-- Purpose: add PROGRAMMER to the allowed_roles for LEGAL_FORWARDING -> REGISTRAR_FINAL_REVIEW
-- and ensure PROGRAMMER is NOT allowed to draft order sheets (REGISTERED -> ORDER_SHEET_DRAFTED).

BEGIN;

-- Add PROGRAMMER to forwarding-letter transition if not already present
UPDATE workflow_transitions
SET allowed_roles = array_append(allowed_roles, 'PROGRAMMER'::role)
WHERE from_status = 'LEGAL_FORWARDING'
  AND to_status = 'REGISTRAR_FINAL_REVIEW'
  AND NOT ('PROGRAMMER' = ANY(allowed_roles));

-- Remove PROGRAMMER from order-sheet drafting transition if present
UPDATE workflow_transitions
SET allowed_roles = array_remove(allowed_roles, 'PROGRAMMER'::role)
WHERE from_status = 'REGISTERED'
  AND to_status = 'ORDER_SHEET_DRAFTED'
  AND 'PROGRAMMER' = ANY(allowed_roles);

COMMIT;

-- NOTE: This migration assumes the custom type "role" and table workflow_transitions exist.
-- Apply with your normal migration runner or psql against the case-management-system database.
