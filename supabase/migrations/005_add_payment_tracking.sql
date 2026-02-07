-- Add enhanced payment tracking fields
-- Migration: 005_add_payment_tracking.sql

-- Add paid_method field to track how the bill was paid
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS paid_method TEXT DEFAULT NULL
CHECK (paid_method IN ('manual', 'autopay'));

-- Add last_paid_amount to track the amount that was paid
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS last_paid_amount DECIMAL(10,2) DEFAULT NULL;

-- Add index for payment method filtering
CREATE INDEX IF NOT EXISTS bills_paid_method_idx ON public.bills(paid_method);

-- Add index for paid_at for history queries
CREATE INDEX IF NOT EXISTS bills_paid_at_idx ON public.bills(paid_at);

-- Comment for documentation
COMMENT ON COLUMN public.bills.paid_method IS 'How the bill was paid: manual or autopay';
COMMENT ON COLUMN public.bills.last_paid_amount IS 'The actual amount paid when marked as paid';
