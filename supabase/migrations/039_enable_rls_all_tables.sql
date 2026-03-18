-- 039: Enable RLS on all tables missing it
-- Fixes Supabase Security Advisor "4 errors" report (Mar 15, 2026)
--
-- With RLS enabled and NO permissive policies for anon/authenticated roles,
-- these tables are locked to service_role only (which bypasses RLS).
-- This is the correct security posture for server-only tables.

ALTER TABLE IF EXISTS public.sent_push_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sent_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.template_drift_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.template_shadow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendor_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendor_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auth_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bill_notifications_queue ENABLE ROW LEVEL SECURITY;
