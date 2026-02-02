-- Remove mint and lavender themes, keep 6 themes

-- Drop old constraint
ALTER TABLE public.user_preferences
DROP CONSTRAINT IF EXISTS chk_color_theme;

-- Add new constraint with 6 themes
ALTER TABLE public.user_preferences
ADD CONSTRAINT chk_color_theme
CHECK (color_theme IN ('cyber', 'ember', 'cosmic', 'slate', 'rose', 'emerald'));

-- Update any users who had mint or lavender to use cyber (default)
UPDATE public.user_preferences
SET color_theme = 'cyber'
WHERE color_theme IN ('mint', 'lavender');
