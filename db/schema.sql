-- SCPD Case Management System - PostgreSQL 16 schema
-- Partitioning:
--  - cases: RANGE by case_year
--  - case_status_history: RANGE by changed_at (monthly)
--  - audit_logs: RANGE by created_at (monthly)
--  - case_dispatch: RANGE by dispatched_at (monthly)
--  - documents: HASH by case_id
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'role'
) THEN CREATE TYPE role AS ENUM (
    'PRIVATE_SECRETARY',
    'PRIVATE_ASSISTANT',
    'COMMISSIONER',
    'LEGAL_ASSISTANT',
    'REGISTRAR',
    'PROGRAMMER',
    'STATIONERY',
    'COMPUTER_ASSISTANT',
    'ADMIN'
);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'case_status'
) THEN CREATE TYPE case_status AS ENUM (
    'DRAFT',
    'DIARY_ENTERED',
    'REGISTERED',
    'UNDER_REVIEW',
    'REVIEW_DONE',
    'COMMISSIONER_SIGNATURE',
    'CASE_ACCEPTED',
    'PS_POST_ACCEPTANCE',
    'PENDING_QUERY',
    'ROUTED_TO_LEGAL',
    'PROGRAMMER_REVIEW',
    'STATIONERY_REVIEW',
    'ROUTED_TO_OE',
    'NOT_RELATED',
    'ORDER_SHEET_DRAFTED',
    'REGISTRAR_REVIEW',
    'REGISTRAR_UPLOAD_SIGNATURE',
    'COMMISSIONER_APPROVAL',
    'APPROVED',
    'LEGAL_FORWARDING',
    'DISPATCH_PENDING',
    'DISPATCHED',
    'REGISTRAR_FINAL_REVIEW',
    'CLOSED'
);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'section_assigned'
) THEN CREATE TYPE section_assigned AS ENUM (
    'COMMISSIONER',
    'PROGRAMMER',
    'LEGAL',
    'OE',
    'REGISTRAR',
    'STATIONERY'
);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'dispatch_type'
) THEN CREATE TYPE dispatch_type AS ENUM ('INWARD', 'OUTWARD');
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'dispatch_channel'
) THEN CREATE TYPE dispatch_channel AS ENUM ('BY_HAND', 'POST', 'COURIER', 'EMAIL');
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'complaint_channel'
) THEN CREATE TYPE complaint_channel AS ENUM ('EMAIL', 'PHONE', 'IN_PERSON', 'LETTER');
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'case_priority'
) THEN CREATE TYPE case_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'document_kind'
) THEN CREATE TYPE document_kind AS ENUM (
    'COMPLAINT',
    'ORDER_SHEET',
    'FORWARDING_LETTER',
    'ATTACHMENT',
    'OTHER'
);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'order_sheet_status'
) THEN CREATE TYPE order_sheet_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'REVISIONS_REQUESTED_BY_REGISTRAR',
    'FORWARDED_BY_REGISTRAR',
    'REVISIONS_REQUESTED_BY_COMMISSIONER',
    'APPROVED_BY_COMMISSIONER',
    'CANCELLED'
);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'forwarding_letter_status'
) THEN CREATE TYPE forwarding_letter_status AS ENUM (
    'DRAFT',
    'PENDING_SIGNATURE',
    'SIGNED',
    'CANCELLED'
);
END IF;
END $$;

-- Ensure new roles are present even if the enum already existed
ALTER TYPE role ADD VALUE IF NOT EXISTS 'COMPUTER_ASSISTANT';
ALTER TYPE role ADD VALUE IF NOT EXISTS 'PRIVATE_ASSISTANT';
ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'PS_POST_ACCEPTANCE';

BEGIN;

-- Disability Types
CREATE TABLE IF NOT EXISTS disability_types (
    id uuid PRIMARY KEY,
    name text NOT NULL UNIQUE,
    code text NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
-- Users
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY,
    email text NOT NULL UNIQUE,
    name text NOT NULL,
    password_hash text NOT NULL,
    role role NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
-- Refresh sessions (refresh token rotation)
CREATE TABLE IF NOT EXISTS auth_sessions (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    refresh_token_jti text NOT NULL,
    refresh_hash text NOT NULL,
    revoked_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
-- Workflow transitions (data-driven state machine)
CREATE TABLE IF NOT EXISTS workflow_transitions (
    id uuid PRIMARY KEY,
    from_status case_status NULL,
    to_status case_status NOT NULL,
    allowed_roles role[] NOT NULL,
    auto_transition boolean NOT NULL DEFAULT false,
    description text NULL
);
CREATE INDEX IF NOT EXISTS idx_workflow_from_to ON workflow_transitions(from_status, to_status);
CREATE INDEX IF NOT EXISTS idx_workflow_to_status ON workflow_transitions(to_status);
CREATE INDEX IF NOT EXISTS idx_workflow_allowed_roles_gin ON workflow_transitions USING GIN (allowed_roles);
CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_from_to_not_null ON workflow_transitions(from_status, to_status) WHERE from_status IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_to_when_from_null ON workflow_transitions(to_status) WHERE from_status IS NULL;
-- Cases (partitioned by year)
CREATE TABLE IF NOT EXISTS cases (
    case_year int NOT NULL,
    id uuid NOT NULL,
    registration_no text NOT NULL,
    case_no text NULL,
    sl_no int NULL,
    status case_status NOT NULL,
    section_assigned section_assigned NOT NULL,
    assigned_to_id uuid NULL REFERENCES users(id),
    complainant_name text NOT NULL,
    subject text NOT NULL,
    received_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (case_year, id),
    UNIQUE (case_year, registration_no)
) PARTITION BY RANGE (case_year);

-- Issue register (outgoing communications)
CREATE TABLE IF NOT EXISTS issue_register (
    id uuid PRIMARY KEY,
    case_year int NOT NULL,
    case_id uuid NOT NULL,
    kind text NOT NULL,
    recipient text NULL,
    channel text NULL,
    subject text NULL,
    body text NULL,
    reference_id uuid NULL,
    created_by_id uuid NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT issue_register_case_fk FOREIGN KEY (case_year, case_id) REFERENCES cases(case_year, id) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_issue_register_case ON issue_register(case_year, case_id);

-- Query letters (legal queries to parties)
CREATE TABLE IF NOT EXISTS query_letters (
    id uuid PRIMARY KEY,
    case_year int NOT NULL,
    case_id uuid NOT NULL,
    recipient_type text NOT NULL,
    channel dispatch_channel NOT NULL,
    subject text NOT NULL,
    body text NOT NULL DEFAULT '',
    created_by_id uuid NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT query_letters_case_fk FOREIGN KEY (case_year, case_id) REFERENCES cases(case_year, id) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_query_letters_case ON query_letters(case_year, case_id);
-- Default partition to avoid failing inserts for new years
CREATE TABLE IF NOT EXISTS cases_default PARTITION OF cases DEFAULT;
-- Helpful partitions (extend yearly as needed)
CREATE TABLE IF NOT EXISTS cases_2025 PARTITION OF cases FOR
VALUES
FROM (2025) TO (2026);
CREATE TABLE IF NOT EXISTS cases_2026 PARTITION OF cases FOR
VALUES
FROM (2026) TO (2027);
-- Indexes requested (created on parent; Postgres creates partition indexes)
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_section_assigned ON cases(section_assigned);
CREATE INDEX IF NOT EXISTS idx_cases_case_year ON cases(case_year);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON cases(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_cases_registration_no ON cases(registration_no);
CREATE INDEX IF NOT EXISTS idx_cases_case_no ON cases(case_no);
CREATE INDEX IF NOT EXISTS idx_cases_sl_no ON cases(sl_no);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);
-- Complaints (public intake; optional table)
CREATE TABLE IF NOT EXISTS complaints (
    id uuid PRIMARY KEY,
    reference_no text NOT NULL UNIQUE,
    name text NOT NULL,
    contact text NULL,
    address text NULL,
    subject text NOT NULL,
    description text NOT NULL,
    channel complaint_channel NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_ip inet NULL,
    linked_case_year int NULL,
    linked_case_id uuid NULL,
    FOREIGN KEY (linked_case_year, linked_case_id) REFERENCES cases(case_year, id)
);
CREATE INDEX IF NOT EXISTS idx_complaints_reference_no ON complaints(reference_no);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_linked_case ON complaints(linked_case_year, linked_case_id);
-- Case status history (partitioned monthly by changed_at)
CREATE TABLE IF NOT EXISTS case_status_history (
    changed_at timestamptz NOT NULL DEFAULT now(),
    id uuid NOT NULL,
    case_year int NOT NULL,
    case_id uuid NOT NULL,
    old_status case_status NOT NULL,
    new_status case_status NOT NULL,
    remarks text NULL,
    changed_by_id uuid NULL REFERENCES users(id),
    PRIMARY KEY (changed_at, id),
    FOREIGN KEY (case_year, case_id) REFERENCES cases(case_year, id)
) PARTITION BY RANGE (changed_at);
-- Monthly partitions (current + next); add more via scheduled job
CREATE TABLE IF NOT EXISTS case_status_history_2026_01 PARTITION OF case_status_history FOR
VALUES
FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS case_status_history_2026_02 PARTITION OF case_status_history FOR
VALUES
FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS case_status_history_default PARTITION OF case_status_history DEFAULT;
CREATE INDEX IF NOT EXISTS idx_csh_case_id ON case_status_history(case_id);
CREATE INDEX IF NOT EXISTS idx_csh_new_status ON case_status_history(new_status);
CREATE INDEX IF NOT EXISTS idx_csh_changed_at ON case_status_history(changed_at);
-- Order sheets
CREATE TABLE IF NOT EXISTS order_sheets (
    id uuid PRIMARY KEY,
    case_year int NOT NULL,
    case_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    status order_sheet_status NOT NULL DEFAULT 'DRAFT',
    prepared_by_id uuid NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (case_year, case_id) REFERENCES cases(case_year, id)
);
CREATE INDEX IF NOT EXISTS idx_order_sheets_case_id ON order_sheets(case_id);
CREATE INDEX IF NOT EXISTS idx_order_sheets_status ON order_sheets(status);
CREATE INDEX IF NOT EXISTS idx_order_sheets_prepared_by ON order_sheets(prepared_by_id);
-- Order sheet review history
CREATE TABLE IF NOT EXISTS order_sheet_review_history (
    id uuid PRIMARY KEY,
    order_sheet_id uuid NOT NULL REFERENCES order_sheets(id) ON DELETE CASCADE,
    action text NOT NULL,
    remarks text NULL,
    actor_id uuid NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_osrh_order_sheet_id ON order_sheet_review_history(order_sheet_id);
CREATE INDEX IF NOT EXISTS idx_osrh_actor_id ON order_sheet_review_history(actor_id);
-- Forwarding letters
CREATE TABLE IF NOT EXISTS forwarding_letters (
    id uuid PRIMARY KEY,
    case_year int NOT NULL,
    case_id uuid NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    status forwarding_letter_status NOT NULL DEFAULT 'DRAFT',
    prepared_by_id uuid NOT NULL REFERENCES users(id),
    signed_by_id uuid NULL REFERENCES users(id),
    signed_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (case_year, case_id) REFERENCES cases(case_year, id)
);
CREATE INDEX IF NOT EXISTS idx_forwarding_letters_case_id ON forwarding_letters(case_id);
CREATE INDEX IF NOT EXISTS idx_forwarding_letters_status ON forwarding_letters(status);
-- Case dispatch (partitioned monthly by dispatched_at)
CREATE TABLE IF NOT EXISTS case_dispatch (
    dispatched_at timestamptz NOT NULL DEFAULT now(),
    id uuid NOT NULL,
    case_year int NOT NULL,
    case_id uuid NOT NULL,
    type dispatch_type NOT NULL,
    channel dispatch_channel NOT NULL,
    address_to text NULL,
    tracking_no text NULL,
    received_at timestamptz NULL,
    status text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (dispatched_at, id),
    FOREIGN KEY (case_year, case_id) REFERENCES cases(case_year, id)
) PARTITION BY RANGE (dispatched_at);
CREATE TABLE IF NOT EXISTS case_dispatch_2026_01 PARTITION OF case_dispatch FOR
VALUES
FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS case_dispatch_2026_02 PARTITION OF case_dispatch FOR
VALUES
FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS case_dispatch_default PARTITION OF case_dispatch DEFAULT;
CREATE INDEX IF NOT EXISTS idx_dispatch_case_id ON case_dispatch(case_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_id ON case_dispatch(id);
CREATE INDEX IF NOT EXISTS idx_dispatch_type ON case_dispatch(type);
CREATE INDEX IF NOT EXISTS idx_dispatch_channel ON case_dispatch(channel);
CREATE INDEX IF NOT EXISTS idx_dispatch_dispatched_at ON case_dispatch(dispatched_at);
-- Documents (hash partitioned by case_id)
CREATE TABLE IF NOT EXISTS documents (
    case_id uuid NOT NULL,
    id uuid NOT NULL,
    case_year int NOT NULL,
    kind document_kind NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    storage_key text NOT NULL,
    size_bytes int NOT NULL,
    uploaded_by_id uuid NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (case_id, id),
    FOREIGN KEY (case_year, case_id) REFERENCES cases(case_year, id)
) PARTITION BY HASH (case_id);
-- 8-way hash partitions
DO $$
DECLARE i int;
BEGIN FOR i IN 0..7 LOOP EXECUTE format(
    'CREATE TABLE IF NOT EXISTS documents_p%s PARTITION OF documents FOR VALUES WITH (modulus 8, remainder %s);',
    i,
    i
);
END LOOP;
END $$;
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
-- Audit logs (partitioned monthly by created_at)
CREATE TABLE IF NOT EXISTS audit_logs (
    created_at timestamptz NOT NULL DEFAULT now(),
    id uuid NOT NULL,
    user_id uuid NULL REFERENCES users(id),
    module text NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NULL,
    status_code int NOT NULL,
    ip text NULL,
    ip_address inet NULL,
    user_agent text NULL,
    payload_snapshot jsonb NULL,
    PRIMARY KEY (created_at, id)
) PARTITION BY RANGE (created_at);
CREATE TABLE IF NOT EXISTS audit_logs_2026_01 PARTITION OF audit_logs FOR
VALUES
FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS audit_logs_2026_02 PARTITION OF audit_logs FOR
VALUES
FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS audit_logs_default PARTITION OF audit_logs DEFAULT;
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
-- =========================================================
-- Materialized Views
-- =========================================================
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
CREATE UNIQUE INDEX ux_mv_case_summary ON mv_case_summary(case_year, section_assigned, status);
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
CREATE UNIQUE INDEX ux_mv_legal_pendency ON mv_legal_pendency(case_year, case_id);
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
CREATE UNIQUE INDEX ux_mv_commissioner_workload ON mv_commissioner_workload(user_id);
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
CREATE UNIQUE INDEX ux_mv_registrar_queue ON mv_registrar_queue(case_year, case_id);
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
CREATE UNIQUE INDEX ux_mv_dispatch_tracking ON mv_dispatch_tracking(dispatch_id);
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
CREATE UNIQUE INDEX ux_mv_dashboard_cards ON mv_dashboard_cards(card_key);
COMMIT;