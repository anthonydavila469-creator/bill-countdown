-- Final 9 themes: remove forest, add amethyst, ocean, sunset

-- Drop old constraint
ALTER TABLE public.user_preferences
DROP CONSTRAINT IF EXISTS chk_color_theme;

-- Add new constraint with 9 themes
ALTER TABLE public.user_preferences
ADD CONSTRAINT chk_color_theme
CHECK (color_theme IN ('ember', 'cosmic', 'emerald', 'midnight', 'wine', 'onyx', 'amethyst', 'ocean', 'sunset'));

-- Update any users who had forest or slate theme
UPDATE public.user_preferences
SET color_theme = 'ocean'
WHERE color_theme IN ('forest', 'slate');
