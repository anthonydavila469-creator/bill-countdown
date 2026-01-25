-- Add processing_error column to emails_raw to track extraction failures
-- This allows us to mark emails as processed even when extraction fails,
-- preventing infinite retry loops while maintaining visibility into errors

alter table public.emails_raw
add column if not exists processing_error text;

-- Add comment for documentation
comment on column public.emails_raw.processing_error is 'Error message if extraction failed, null if successful';
