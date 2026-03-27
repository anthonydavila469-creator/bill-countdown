ALTER TABLE public.user_preferences
DROP CONSTRAINT IF EXISTS chk_color_theme;

UPDATE public.user_preferences SET color_theme = 'sunrise'
WHERE color_theme NOT IN ('sunrise', 'haze', 'aurora', 'tropical', 'peach');

ALTER TABLE public.user_preferences
ADD CONSTRAINT chk_color_theme
CHECK (color_theme IN ('sunrise', 'haze', 'aurora', 'tropical', 'peach'));
