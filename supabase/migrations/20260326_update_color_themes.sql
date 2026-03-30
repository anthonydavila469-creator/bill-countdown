-- First drop old constraint
ALTER TABLE public.user_preferences
DROP CONSTRAINT IF EXISTS chk_color_theme;

-- Migrate old theme IDs BEFORE adding new constraint
UPDATE public.user_preferences SET color_theme = 'ember' WHERE color_theme = 'wine';
UPDATE public.user_preferences SET color_theme = 'noir' WHERE color_theme = 'onyx';
UPDATE public.user_preferences SET color_theme = 'midnight' WHERE color_theme = 'cosmic';
UPDATE public.user_preferences SET color_theme = 'noir' WHERE color_theme = 'slate';
UPDATE public.user_preferences SET color_theme = 'amethyst' WHERE color_theme = 'lavender';
UPDATE public.user_preferences SET color_theme = 'amethyst' WHERE color_theme = 'cyber';
UPDATE public.user_preferences SET color_theme = 'amethyst' WHERE color_theme = 'default';
-- Catch any other invalid values
UPDATE public.user_preferences SET color_theme = 'amethyst'
WHERE color_theme NOT IN (
  'amethyst', 'ocean', 'arctic', 'midnight',
  'ember', 'sunset', 'coral',
  'emerald', 'forest',
  'rose', 'gold', 'noir'
);

-- Now add new constraint
ALTER TABLE public.user_preferences
ADD CONSTRAINT chk_color_theme
CHECK (color_theme IN (
  'amethyst', 'ocean', 'arctic', 'midnight',
  'ember', 'sunset', 'coral',
  'emerald', 'forest',
  'rose', 'gold', 'noir'
));
