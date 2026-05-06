-- Migration: add enums for order sheet / forwarding letter statuses

BEGIN;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type
		WHERE typname = 'order_sheet_status'
	) THEN
		CREATE TYPE order_sheet_status AS ENUM (
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
	) THEN
		CREATE TYPE forwarding_letter_status AS ENUM (
			'DRAFT',
			'PENDING_SIGNATURE',
			'SIGNED',
			'CANCELLED'
		);
	END IF;
END $$;

-- Normalize any existing free-text statuses before type conversion
UPDATE order_sheets
SET status = 'DRAFT'
WHERE status IS NULL
	OR status NOT IN (
		'DRAFT',
		'SUBMITTED',
		'REVISIONS_REQUESTED_BY_REGISTRAR',
		'FORWARDED_BY_REGISTRAR',
		'REVISIONS_REQUESTED_BY_COMMISSIONER',
		'APPROVED_BY_COMMISSIONER',
		'CANCELLED'
	);

UPDATE forwarding_letters
SET status = 'DRAFT'
WHERE status IS NULL
	OR status NOT IN (
		'DRAFT',
		'PENDING_SIGNATURE',
		'SIGNED',
		'CANCELLED'
	);

-- Convert the columns
ALTER TABLE order_sheets
	ALTER COLUMN status TYPE order_sheet_status USING status::order_sheet_status,
	ALTER COLUMN status SET DEFAULT 'DRAFT'::order_sheet_status;

ALTER TABLE forwarding_letters
	ALTER COLUMN status TYPE forwarding_letter_status USING status::forwarding_letter_status,
	ALTER COLUMN status SET DEFAULT 'DRAFT'::forwarding_letter_status;

COMMIT;
