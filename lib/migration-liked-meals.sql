-- Migration: Update liked_meals table to be independent of meal_records
-- This migration changes liked_meals to store menu data directly without requiring meal_records

-- Step 1: Drop the old liked_meals table
DROP TABLE IF EXISTS liked_meals CASCADE;

-- Step 2: Create the new liked_meals table with menu data
CREATE TABLE liked_meals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE,
  menu_name VARCHAR(200) NOT NULL,
  calories INTEGER,
  carbs INTEGER,
  protein INTEGER,
  fat INTEGER,
  price INTEGER,
  delivery_time INTEGER,
  restaurant_name VARCHAR(200),
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, menu_name) -- 중복 좋아요 방지
);

-- Step 3: Create indexes for better performance
DROP INDEX IF EXISTS idx_liked_meals_user_id;
DROP INDEX IF EXISTS idx_liked_meals_meal_record_id;
DROP INDEX IF EXISTS idx_liked_meals_user_menu;

CREATE INDEX idx_liked_meals_user_id ON liked_meals(user_id);
CREATE INDEX idx_liked_meals_user_menu ON liked_meals(user_id, menu_name);
