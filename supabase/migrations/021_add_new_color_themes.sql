-- Add new color themes: rose, emerald, mint, lavender

-- Drop old constraint
ALTER TABLE public.user_preferences
DROP CONSTRAINT IF EXISTS chk_color_theme;

-- Add new constraint with all 8 themes
ALTER TABLE public.user_preferences
ADD CONSTRAINT chk_color_theme
CHECK (color_theme IN ('cyber', 'ember', 'cosmic', 'slate', 'rose', 'emerald', 'mint', 'lavender'));
