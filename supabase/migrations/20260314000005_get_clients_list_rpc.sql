-- Migration: get_clients_list RPC function
-- Returns per-client stats for the admin client list view.
-- Requires SECURITY DEFINER to read auth.users.last_sign_in_at.

CREATE OR REPLACE FUNCTION public.get_clients_list()
RETURNS TABLE (
  id                uuid,
  name              text,
  company_name      text,
  billing_email     text,
  hosting_package   text,
  created_at        timestamptz,
  open_requests     bigint,
  awaiting_feedback bigint,
  overdue_invoices  bigint,
  projects_count    bigint,
  invoices_count    bigint,
  tasks_count       bigint,
  last_sign_in_at   timestamptz
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE sql AS $$
  SELECT
    c.id,
    c.name,
    c.company_name,
    c.billing_email,
    c.hosting_package::text,
    c.created_at,
    (SELECT COUNT(*) FROM work_requests   wr  WHERE wr.client_id  = c.id AND wr.status  = 'open')                              AS open_requests,
    (SELECT COUNT(*) FROM feedback_tasks  ft  WHERE ft.client_id  = c.id AND ft.status  = 'awaiting')                          AS awaiting_feedback,
    (SELECT COUNT(*) FROM invoices        inv WHERE inv.client_id = c.id AND inv.status = 'due' AND inv.due_date < NOW())       AS overdue_invoices,
    (SELECT COUNT(*) FROM projects        p   WHERE p.client_id   = c.id)                                                      AS projects_count,
    (SELECT COUNT(*) FROM invoices        inv WHERE inv.client_id = c.id)                                                      AS invoices_count,
    (SELECT COUNT(*) FROM feedback_tasks  ft  WHERE ft.client_id  = c.id)                                                      AS tasks_count,
    (SELECT MAX(au.last_sign_in_at)
       FROM client_users cu
       JOIN auth.users   au ON au.id = cu.user_id
      WHERE cu.client_id = c.id)                                                                                                AS last_sign_in_at
  FROM clients c
  ORDER BY c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_clients_list() TO authenticated;
