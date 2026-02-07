-- Update themes: remove slate (dark), add amethyst and ocean

-- Drop old constraint
ALTER TABLE public.user_preferences
DROP CONSTRAINT IF EXISTS chk_color_theme;

-- Add new constraint with 9 themes
ALTER TABLE public.user_preferences
ADD CONSTRAINT chk_color_theme
CHECK (color_theme IN ('ember', 'cosmic', 'emerald', 'midnight', 'wine', 'forest', 'onyx', 'amethyst', 'ocean'));

-- Update any users who had slate theme to use onyx (similar neutral dark)
UPDATE public.user_preferences
SET color_theme = 'onyx'
WHERE color_theme = 'slate';
