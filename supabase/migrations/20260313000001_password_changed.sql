-- Add password_changed flag to client_users
-- Tracks whether a client has set their own password after first login

ALTER TABLE client_users
  ADD COLUMN IF NOT EXISTS password_changed boolean NOT NULL DEFAULT false;

-- RLS policy: allow a client to update their own password_changed field
-- (The table should already have RLS enabled; this adds the update policy)

CREATE POLICY "clients can update own password_changed"
  ON client_users
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
