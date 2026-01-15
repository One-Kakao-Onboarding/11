import { config } from 'dotenv'
import path from 'path'
import postgres from 'postgres'

// Load .env.local file first
config({ path: path.join(process.cwd(), '.env.local') })

async function addStatusColumn() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in .env.local')
  }

  const sql = postgres(process.env.DATABASE_URL)

  try {
    console.log('🔄 Checking if status column exists...')

    // status 컬럼이 있는지 확인
    const checkColumn = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'recommendation_cache'
      AND column_name = 'status'
    `

    if (checkColumn.length > 0) {
      console.log('✅ Status column already exists!')
      return
    }

    console.log('➕ Adding status column to recommendation_cache...')

    // status 컬럼 추가
    await sql`
      ALTER TABLE recommendation_cache
      ADD COLUMN status VARCHAR(20) DEFAULT 'pending'
    `

    console.log('✅ Status column added successfully!')

    // error_message 컬럼도 확인
    const checkErrorColumn = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'recommendation_cache'
      AND column_name = 'error_message'
    `

    if (checkErrorColumn.length === 0) {
      console.log('➕ Adding error_message column to recommendation_cache...')
      await sql`
        ALTER TABLE recommendation_cache
        ADD COLUMN error_message TEXT
      `
      console.log('✅ Error_message column added successfully!')
    } else {
      console.log('✅ Error_message column already exists!')
    }

    // 기존 데이터를 'completed'로 업데이트
    await sql`
      UPDATE recommendation_cache
      SET status = 'completed'
      WHERE status IS NULL AND recommendations IS NOT NULL
    `

    console.log('✅ Migration completed!')

    await sql.end()
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

addStatusColumn()
