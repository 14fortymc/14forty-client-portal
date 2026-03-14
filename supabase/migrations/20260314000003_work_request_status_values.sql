-- Migration: Expand work_request status values
-- Adds 'on_hold' and 'rejected' as valid status values alongside existing
-- 'open', 'in_progress', and 'completed'. Status is stored as plain text;
-- this migration adds a check constraint to enforce allowed values.

ALTER TABLE work_requests
  DROP CONSTRAINT IF EXISTS work_requests_status_check;

ALTER TABLE work_requests
  ADD CONSTRAINT work_requests_status_check
    CHECK (status IN ('open', 'on_hold', 'in_progress', 'completed', 'rejected'));
