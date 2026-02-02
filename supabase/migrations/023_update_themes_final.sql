-- Update themes: remove cyber, rose; add midnight, wine, forest, onyx

-- Drop old constraint
ALTER TABLE public.user_preferences
DROP CONSTRAINT IF EXISTS chk_color_theme;

-- Add new constraint with 8 themes
ALTER TABLE public.user_preferences
ADD CONSTRAINT chk_color_theme
CHECK (color_theme IN ('ember', 'cosmic', 'slate', 'emerald', 'midnight', 'wine', 'forest', 'onyx'));

-- Update any users who had removed themes to use slate (dark)
UPDATE public.user_preferences
SET color_theme = 'slate'
WHERE color_theme IN ('cyber', 'rose', 'mint', 'lavender');
