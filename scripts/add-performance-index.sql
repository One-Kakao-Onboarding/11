-- 성능 개선을 위한 복합 인덱스 추가
-- 이미 존재하는 경우 오류 무시
CREATE INDEX IF NOT EXISTS idx_meal_records_user_date ON meal_records(user_id, meal_date DESC);

-- 인덱스 확인
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'meal_records'
ORDER BY indexname;
