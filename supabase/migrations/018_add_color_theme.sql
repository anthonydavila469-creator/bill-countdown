-- Add color_theme column to user_preferences
-- Replaces custom_urgency_colors and accent_color with predefined themes

ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS color_theme TEXT DEFAULT 'default';

-- Add constraint to validate theme values
ALTER TABLE public.user_preferences
ADD CONSTRAINT chk_color_theme
CHECK (color_theme IN ('default', 'ocean', 'sunset', 'midnight', 'forest', 'monochrome'));

-- Note: We're keeping the old columns (custom_urgency_colors, accent_color) for now
-- to avoid data loss during migration. They can be removed in a future cleanup migration.
