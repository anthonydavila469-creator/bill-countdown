-- Add variable bill support and icon key to bills table

-- Add is_variable flag for bills that change each month
ALTER TABLE bills ADD COLUMN IF NOT EXISTS is_variable boolean DEFAULT false;

-- Add typical range for variable bills
ALTER TABLE bills ADD COLUMN IF NOT EXISTS typical_min numeric(10,2);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS typical_max numeric(10,2);

-- Add icon_key for custom category icons
ALTER TABLE bills ADD COLUMN IF NOT EXISTS icon_key text;

-- Add constraint to ensure typical_min <= typical_max when both are set
ALTER TABLE bills ADD CONSTRAINT check_typical_range
  CHECK (typical_min IS NULL OR typical_max IS NULL OR typical_min <= typical_max);

-- Add constraint to ensure both min and max are set if bill is variable
ALTER TABLE bills ADD CONSTRAINT check_variable_requires_range
  CHECK (is_variable = false OR (typical_min IS NOT NULL AND typical_max IS NOT NULL));

-- Create index for variable bills queries
CREATE INDEX IF NOT EXISTS idx_bills_is_variable ON bills(is_variable) WHERE is_variable = true;

-- Comment on columns
COMMENT ON COLUMN bills.is_variable IS 'Whether this bill amount changes each month';
COMMENT ON COLUMN bills.typical_min IS 'Minimum typical amount for variable bills';
COMMENT ON COLUMN bills.typical_max IS 'Maximum typical amount for variable bills';
COMMENT ON COLUMN bills.icon_key IS 'Icon identifier for category display (e.g., home, bolt, wifi)';
