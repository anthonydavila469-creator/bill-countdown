-- Fix: column default was 'amethyst' which no longer exists in the constraint.
-- Update default to 'haze' to match the new theme set.
ALTER TABLE public.user_preferences
ALTER COLUMN color_theme SET DEFAULT 'haze';
