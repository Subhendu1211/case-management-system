-- Refresh strategy (nightly cron suggested)
-- NOTE: CONCURRENTLY requires the unique indexes created in schema.sql.
BEGIN;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_case_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_legal_pendency;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_commissioner_workload;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_registrar_queue;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dispatch_tracking;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_cards;
COMMIT;