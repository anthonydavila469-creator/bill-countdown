-- Fix: color_theme column default is 'default' which violates chk_color_theme constraint
-- Change default to 'amethyst' (the app's actual default theme)
ALTER TABLE public.user_preferences
ALTER COLUMN color_theme SET DEFAULT 'amethyst';

-- Also fix any rows that somehow got 'default' or 'cyber' or 'slate' (removed themes)
UPDATE public.user_preferences
SET color_theme = 'amethyst'
WHERE color_theme NOT IN ('ember', 'cosmic', 'emerald', 'midnight', 'wine', 'onyx', 'amethyst', 'ocean');
