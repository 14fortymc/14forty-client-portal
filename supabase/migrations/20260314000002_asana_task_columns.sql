-- Migration: Add Asana task tracking columns to work_requests

ALTER TABLE work_requests
  ADD COLUMN IF NOT EXISTS asana_task_id text,
  ADD COLUMN IF NOT EXISTS asana_task_url text;
