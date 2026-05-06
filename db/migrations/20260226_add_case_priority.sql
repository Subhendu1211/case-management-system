-- Migration: Add priority column to cases table
-- Date: 2026-02-26
-- Purpose: Track case priority (URGENT/IMMEDIATE marking by Commissioner)

BEGIN;

-- Add priority column to cases table
ALTER TABLE cases ADD COLUMN IF NOT EXISTS priority case_priority DEFAULT 'MEDIUM';

-- Create index for faster filtering by priority
CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);
CREATE INDEX IF NOT EXISTS idx_cases_priority_status ON cases(priority, status);

COMMIT;
