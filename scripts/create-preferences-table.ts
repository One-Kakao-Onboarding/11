import { config } from 'dotenv'
import path from 'path'
import postgres from 'postgres'

config({ path: path.join(process.cwd(), '.env.local') })

async function createPreferencesTable() {
  const sql = postgres(process.env.DATABASE_URL!)

  try {
    console.log('Creating menu_preferences table...')

    // menu_preferences 테이블 생성
    await sql`
      CREATE TABLE IF NOT EXISTS menu_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
        preferred_mode VARCHAR(50) DEFAULT 'budget',
        favorite_categories TEXT[] DEFAULT '{}',
        disliked_ingredients TEXT[] DEFAULT '{}',
        priority_price INTEGER DEFAULT 33,
        priority_nutrition INTEGER DEFAULT 33,
        priority_delivery INTEGER DEFAULT 34,
        monthly_budget INTEGER DEFAULT 300000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    console.log('✅ menu_preferences 테이블 생성 완료!')

    // 인덱스 확인 및 생성
    await sql`
      CREATE INDEX IF NOT EXISTS idx_menu_preferences_user_id ON menu_preferences(user_id)
    `

    console.log('✅ 인덱스 생성 완료!')

  } catch (error) {
    console.error('❌ 에러:', error)
  }

  await sql.end()
}

createPreferencesTable()
