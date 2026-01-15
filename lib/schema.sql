-- Drop existing tables if there are conflicts
DROP TABLE IF EXISTS menu_preferences CASCADE;
DROP TABLE IF EXISTS meal_records CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;

-- App Users table (닉네임 기반 간단 인증)
CREATE TABLE app_users (
  id SERIAL PRIMARY KEY,
  nickname VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meal records table (푸드 렌즈 분석 결과 저장)
CREATE TABLE meal_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE,
  menu_name VARCHAR(200) NOT NULL,
  calories INTEGER,
  carbs INTEGER,
  protein INTEGER,
  fat INTEGER,
  cost INTEGER DEFAULT 0, -- 식사 비용 (원)
  image_url TEXT,
  meal_type VARCHAR(20), -- 'breakfast', 'lunch', 'dinner', 'snack'
  meal_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu preferences (사용자 선호 메뉴 및 설정)
CREATE TABLE IF NOT EXISTS menu_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  preferred_mode VARCHAR(50), -- 'budget', 'healthy', 'quick'
  favorite_categories TEXT[], -- 좋아하는 음식 카테고리
  disliked_ingredients TEXT[], -- 싫어하는 재료
  priority_price INTEGER DEFAULT 33, -- 가격 우선순위 (%)
  priority_nutrition INTEGER DEFAULT 33, -- 영양 우선순위 (%)
  priority_delivery INTEGER DEFAULT 34, -- 배달 소요시간 우선순위 (%)
  monthly_budget INTEGER DEFAULT 300000, -- 월 예산 (원)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Liked meals (좋아요한 식사 기록)
CREATE TABLE liked_meals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE,
  meal_record_id INTEGER REFERENCES meal_records(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, meal_record_id) -- 중복 좋아요 방지
);

-- Indexes for better performance
CREATE INDEX idx_meal_records_user_id ON meal_records(user_id);
CREATE INDEX idx_meal_records_meal_date ON meal_records(meal_date);
CREATE INDEX idx_meal_records_user_date ON meal_records(user_id, meal_date DESC); -- 복합 인덱스로 쿼리 성능 향상
CREATE INDEX idx_app_users_nickname ON app_users(nickname);
CREATE INDEX idx_liked_meals_user_id ON liked_meals(user_id);
CREATE INDEX idx_liked_meals_meal_record_id ON liked_meals(meal_record_id);
