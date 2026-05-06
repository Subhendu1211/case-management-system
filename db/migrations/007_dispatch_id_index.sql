-- Migration: add an index on case_dispatch.id for fast lookup by id
-- Note: case_dispatch is partitioned; this creates per-partition indexes.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_dispatch_id ON case_dispatch(id);

COMMIT;
