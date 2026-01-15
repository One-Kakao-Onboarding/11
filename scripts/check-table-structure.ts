import { config } from 'dotenv'
import path from 'path'
import postgres from 'postgres'

config({ path: path.join(process.cwd(), '.env.local') })

async function checkTableStructure() {
  const sql = postgres(process.env.DATABASE_URL!)

  try {
    console.log('Checking menu_preferences table structure...\n')

    // 테이블 컬럼 정보 조회
    const columns = await sql`
      SELECT
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'menu_preferences'
      ORDER BY ordinal_position
    `

    if (columns.length === 0) {
      console.log('❌ menu_preferences 테이블이 존재하지 않습니다.')
    } else {
      console.log('📊 menu_preferences 테이블 구조:\n')
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`)
      })
    }

  } catch (error) {
    console.error('❌ 에러:', error)
  }

  await sql.end()
}

checkTableStructure()
