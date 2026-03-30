-- Drop old constraint
ALTER TABLE public.user_preferences
DROP CONSTRAINT IF EXISTS chk_color_theme;

-- Migrate any themes from previous set
UPDATE public.user_preferences SET color_theme = 'amethyst'
WHERE color_theme NOT IN (
  'amethyst', 'inferno', 'arctic', 'cyberpunk', 'matrix',
  'gold', 'rose', 'ocean', 'aurora', 'sunset', 'midnight', 'noir'
);

-- Add v2 gradient theme constraint
ALTER TABLE public.user_preferences
ADD CONSTRAINT chk_color_theme
CHECK (color_theme IN (
  'amethyst', 'inferno', 'arctic', 'cyberpunk', 'matrix',
  'gold', 'rose', 'ocean', 'aurora', 'sunset', 'midnight', 'noir'
));
