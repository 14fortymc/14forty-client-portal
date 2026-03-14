-- Migration: Requests section update
-- Adds hosting package, service agreement, and enhanced work request tracking

-- ── CLIENTS TABLE ─────────────────────────────────────────

-- Hosting package: none | essential | basic | advanced
DO $$ BEGIN
  CREATE TYPE hosting_package_enum AS ENUM ('none', 'essential', 'basic', 'advanced');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS hosting_package hosting_package_enum NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS service_agreement boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_agreement_monthly_rate integer;

-- ── WORK REQUESTS TABLE ───────────────────────────────────

-- Request category: website_update | ad_hoc
DO $$ BEGIN
  CREATE TYPE request_category_enum AS ENUM ('website_update', 'ad_hoc');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Billing type: included | hourly | flat_rate
DO $$ BEGIN
  CREATE TYPE billing_type_enum AS ENUM ('included', 'hourly', 'flat_rate');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE work_requests
  ADD COLUMN IF NOT EXISTS request_category request_category_enum,
  ADD COLUMN IF NOT EXISTS billing_type billing_type_enum,
  ADD COLUMN IF NOT EXISTS estimated_hours decimal,
  ADD COLUMN IF NOT EXISTS actual_hours decimal,
  ADD COLUMN IF NOT EXISTS hourly_rate integer NOT NULL DEFAULT 125;
