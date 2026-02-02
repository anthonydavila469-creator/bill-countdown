-- Remove forest theme

-- Drop old constraint
ALTER TABLE public.user_preferences
DROP CONSTRAINT IF EXISTS chk_color_theme;

-- Add new constraint with 8 themes
ALTER TABLE public.user_preferences
ADD CONSTRAINT chk_color_theme
CHECK (color_theme IN ('ember', 'cosmic', 'emerald', 'midnight', 'wine', 'onyx', 'amethyst', 'ocean'));

-- Update any users who had forest theme to use ocean (similar teal/green vibe)
UPDATE public.user_preferences
SET color_theme = 'ocean'
WHERE color_theme = 'forest';
