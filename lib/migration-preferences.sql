-- Migration to add preference priority fields to menu_preferences table
-- Run this if the table already exists

-- Add priority columns if they don't exist
ALTER TABLE menu_preferences
ADD COLUMN IF NOT EXISTS priority_price INTEGER DEFAULT 33,
ADD COLUMN IF NOT EXISTS priority_nutrition INTEGER DEFAULT 33,
ADD COLUMN IF NOT EXISTS priority_delivery INTEGER DEFAULT 34,
ADD COLUMN IF NOT EXISTS monthly_budget INTEGER DEFAULT 300000;

-- Update updated_at column to trigger on changes if not already set
-- (This ensures the updated_at timestamp is maintained)
