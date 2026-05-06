-- Migration: Fix PROGRAMMER_REVIEW cases section assignment
-- Date: 2026-02-26
-- Purpose: Ensure all cases in PROGRAMMER_REVIEW status have sectionAssigned set to PROGRAMMER

BEGIN;

-- Update all cases in PROGRAMMER_REVIEW status that don't have sectionAssigned = 'PROGRAMMER'
UPDATE cases
SET section_assigned = 'PROGRAMMER'
WHERE status = 'PROGRAMMER_REVIEW'
  AND section_assigned != 'PROGRAMMER';

COMMIT;
