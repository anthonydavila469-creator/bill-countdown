-- Add slate theme to allowed color themes

-- Drop old constraint
ALTER TABLE public.user_preferences
DROP CONSTRAINT IF EXISTS chk_color_theme;

-- Add new constraint with slate theme
ALTER TABLE public.user_preferences
ADD CONSTRAINT chk_color_theme
CHECK (color_theme IN ('cyber', 'ember', 'cosmic', 'slate'));
