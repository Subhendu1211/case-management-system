-- Migration: allow PROGRAMMER to draft order sheets
-- Date: 2026-02-16
-- Purpose: add PROGRAMMER to the allowed_roles for REGISTERED -> ORDER_SHEET_DRAFTED

BEGIN;

-- Add PROGRAMMER to order-sheet drafting transition if not already present
UPDATE workflow_transitions
SET allowed_roles = array_append(allowed_roles, 'PROGRAMMER'::role)
WHERE from_status = 'REGISTERED'
  AND to_status = 'ORDER_SHEET_DRAFTED'
  AND NOT ('PROGRAMMER' = ANY(allowed_roles));

COMMIT;

-- NOTE: Apply with your normal migration runner or with psql against the case-management-system database.
