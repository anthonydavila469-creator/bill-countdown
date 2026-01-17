-- Enhance recurring bills with additional fields for better scheduling
-- Migration: 006_enhance_recurring_bills.sql

-- Update recurrence_interval to include 'biweekly'
ALTER TABLE public.bills
DROP CONSTRAINT IF EXISTS bills_recurrence_interval_check;

ALTER TABLE public.bills
ADD CONSTRAINT bills_recurrence_interval_check
CHECK (recurrence_interval IN ('weekly', 'biweekly', 'monthly', 'yearly'));

-- Add day of month for monthly recurrence (1-31)
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS recurrence_day_of_month INTEGER DEFAULT NULL
CHECK (recurrence_day_of_month IS NULL OR (recurrence_day_of_month >= 1 AND recurrence_day_of_month <= 31));

-- Add weekday for weekly/biweekly recurrence (0=Sunday, 6=Saturday)
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS recurrence_weekday INTEGER DEFAULT NULL
CHECK (recurrence_weekday IS NULL OR (recurrence_weekday >= 0 AND recurrence_weekday <= 6));

-- Add next_due_date for pre-computed next occurrence
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS next_due_date DATE DEFAULT NULL;

-- Add parent_bill_id to link recurring instances (for tracking lineage)
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS parent_bill_id UUID DEFAULT NULL
REFERENCES public.bills(id) ON DELETE SET NULL;

-- Add flag to prevent duplicate generation
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS generated_next BOOLEAN DEFAULT FALSE;

-- Create index for faster recurring bill queries
CREATE INDEX IF NOT EXISTS bills_is_recurring_idx ON public.bills(is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS bills_next_due_date_idx ON public.bills(next_due_date);
CREATE INDEX IF NOT EXISTS bills_parent_bill_id_idx ON public.bills(parent_bill_id);
CREATE INDEX IF NOT EXISTS bills_generated_next_idx ON public.bills(generated_next) WHERE generated_next = false;

-- Add comment for documentation
COMMENT ON COLUMN public.bills.recurrence_day_of_month IS 'Day of month for monthly bills (1-31). If day exceeds month length, clamps to last day.';
COMMENT ON COLUMN public.bills.recurrence_weekday IS 'Day of week for weekly/biweekly bills (0=Sunday, 6=Saturday).';
COMMENT ON COLUMN public.bills.next_due_date IS 'Pre-computed next due date for recurring bills.';
COMMENT ON COLUMN public.bills.parent_bill_id IS 'Reference to the original bill this was generated from.';
COMMENT ON COLUMN public.bills.generated_next IS 'Flag indicating if the next recurring instance has been created.';
