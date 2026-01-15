-- Add autopay tracking and price change detection fields
-- Migration: 003_add_autopay_and_price_tracking.sql

-- Add is_autopay field to track which bills are on automatic payment
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS is_autopay BOOLEAN DEFAULT false;

-- Add previous_amount field to track price changes on recurring bills
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS previous_amount DECIMAL(10,2) DEFAULT NULL;

-- Add payment_url field if not exists (for quick pay functionality)
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS payment_url TEXT DEFAULT NULL;

-- Add index for autopay filtering (useful for dashboard stats)
CREATE INDEX IF NOT EXISTS bills_is_autopay_idx ON public.bills(is_autopay);

-- Comment for documentation
COMMENT ON COLUMN public.bills.is_autopay IS 'Whether this bill is set up for automatic payment';
COMMENT ON COLUMN public.bills.previous_amount IS 'The amount from the previous billing cycle, used for price change detection';
COMMENT ON COLUMN public.bills.payment_url IS 'Direct URL to the payment page for this bill';
