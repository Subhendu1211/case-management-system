DROP MATERIALIZED VIEW IF EXISTS mv_case_summary;
CREATE MATERIALIZED VIEW mv_case_summary AS
SELECT case_year,
    section_assigned,
    status,
    COUNT(*)::bigint AS count
FROM cases
GROUP BY case_year,
    section_assigned,
    status;
CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_case_summary ON mv_case_summary(case_year, section_assigned, status);

DROP MATERIALIZED VIEW IF EXISTS mv_legal_pendency;
CREATE MATERIALIZED VIEW mv_legal_pendency AS
SELECT c.case_year,
    c.id AS case_id,
    c.registration_no,
    c.status,
    c.created_at,
    EXTRACT(
        DAY
        FROM (now() - c.created_at)
    )::int AS age_days,
    (
        EXTRACT(
            DAY
            FROM (now() - c.created_at)
        )::int > 30
    ) AS sla_breached
FROM cases c
WHERE c.section_assigned = 'LEGAL'
    AND c.status NOT IN ('CLOSED');
CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_legal_pendency ON mv_legal_pendency(case_year, case_id);

DROP MATERIALIZED VIEW IF EXISTS mv_commissioner_workload;
CREATE MATERIALIZED VIEW mv_commissioner_workload AS
SELECT COALESCE(
        assigned_to_id,
        '00000000-0000-0000-0000-000000000000'::uuid
    ) AS user_id,
    COUNT(*)::bigint AS open_cases
FROM cases
WHERE status NOT IN ('CLOSED')
GROUP BY COALESCE(
        assigned_to_id,
        '00000000-0000-0000-0000-000000000000'::uuid
    );
CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_commissioner_workload ON mv_commissioner_workload(user_id);

DROP MATERIALIZED VIEW IF EXISTS mv_registrar_queue;
CREATE MATERIALIZED VIEW mv_registrar_queue AS
SELECT c.case_year,
    c.id AS case_id,
    c.registration_no,
    c.status,
    c.created_at
FROM cases c
WHERE c.status = 'REGISTRAR_REVIEW'
ORDER BY c.created_at ASC;
CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_registrar_queue ON mv_registrar_queue(case_year, case_id);

DROP MATERIALIZED VIEW IF EXISTS mv_dispatch_tracking;
CREATE MATERIALIZED VIEW mv_dispatch_tracking AS
SELECT d.id AS dispatch_id,
    d.case_year,
    d.case_id,
    d.type,
    d.channel,
    d.status,
    d.dispatched_at,
    d.received_at,
    EXTRACT(
        DAY
        FROM (now() - d.dispatched_at)
    )::int AS age_days
FROM case_dispatch d;
CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_dispatch_tracking ON mv_dispatch_tracking(dispatch_id);

DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_cards;
CREATE MATERIALIZED VIEW mv_dashboard_cards AS
SELECT 'open_cases'::text AS card_key,
    COUNT(*)::bigint AS value
FROM cases
WHERE status NOT IN ('CLOSED')
UNION ALL
SELECT 'legal_sla_breaches'::text AS card_key,
    COUNT(*)::bigint AS value
FROM (
        SELECT 1
        FROM cases c
        WHERE c.section_assigned = 'LEGAL'
            AND c.status NOT IN ('CLOSED')
            AND (now() - c.created_at) > interval '30 days'
    ) t
UNION ALL
SELECT 'new_cases_30d'::text AS card_key,
    COUNT(*)::bigint AS value
FROM cases
WHERE created_at >= now() - interval '30 days';
CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_dashboard_cards ON mv_dashboard_cards(card_key);
