-- Update color_theme constraint for new bold theme system
-- Replaces old theme IDs with new dramatic themes: cyber, ember, cosmic

-- First drop the old constraint
ALTER TABLE public.user_preferences
DROP CONSTRAINT IF EXISTS chk_color_theme;

-- Update existing theme values to the new default
UPDATE public.user_preferences
SET color_theme = 'cyber'
WHERE color_theme IS NOT NULL;

-- Add new constraint with updated theme values
ALTER TABLE public.user_preferences
ADD CONSTRAINT chk_color_theme
CHECK (color_theme IN ('cyber', 'ember', 'cosmic'));
