-- Migration to add recommendation cache table
-- TTL: 4 hours

-- Create recommendation cache table
CREATE TABLE IF NOT EXISTS recommendation_cache (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE,
  mode VARCHAR(50) NOT NULL, -- 'budget', 'healthy', 'quick'
  recommendations JSONB NOT NULL, -- 추천 결과 (메뉴 ID, 점수, 이유)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  UNIQUE(user_id, mode) -- 사용자당 모드별로 하나의 캐시만 유지
);

-- Index for faster cache lookups
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_user_mode ON recommendation_cache(user_id, mode);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_expires_at ON recommendation_cache(expires_at);

-- Function to clean up expired cache entries (optional, can be run periodically)
-- DELETE FROM recommendation_cache WHERE expires_at < CURRENT_TIMESTAMP;
