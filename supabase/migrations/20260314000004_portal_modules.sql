-- Migration: Portal module visibility
-- Adds per-client portal_modules JSONB column so admins can show/hide
-- nav items in the client portal on a per-client basis.
-- An empty object (default) means all modules are visible.
-- Set a key to false to hide it, e.g. {"calendar": false}

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS portal_modules jsonb NOT NULL DEFAULT '{}'::jsonb;
