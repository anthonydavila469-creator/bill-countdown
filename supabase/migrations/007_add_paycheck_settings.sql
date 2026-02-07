-- Add paycheck_settings column to user_preferences table
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS paycheck_settings JSONB DEFAULT NULL;

-- Comment explaining the structure
COMMENT ON COLUMN public.user_preferences.paycheck_settings IS 'Paycheck mode settings: {enabled: boolean, schedule: "weekly"|"biweekly"|"monthly", next_payday: "YYYY-MM-DD", amount: number|null}';
