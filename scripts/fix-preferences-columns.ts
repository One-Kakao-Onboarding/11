import { config } from 'dotenv'
import path from 'path'
import postgres from 'postgres'

config({ path: path.join(process.cwd(), '.env.local') })

async function fixPreferencesColumns() {
  const sql = postgres(process.env.DATABASE_URL!)

  try {
    console.log('Fixing menu_preferences column names...\n')

    // favorite_menus -> favorite_categories로 변경
    await sql`
      ALTER TABLE menu_preferences
      RENAME COLUMN favorite_menus TO favorite_categories
    `
    console.log('✅ favorite_menus -> favorite_categories 변경 완료')

    // 변경된 구조 확인
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'menu_preferences'
      AND column_name IN ('favorite_categories', 'disliked_ingredients')
    `

    console.log('\n📊 확인:')
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`)
    })

    console.log('\n✅ 모든 변경 완료!')

  } catch (error) {
    console.error('❌ 에러:', error)
  }

  await sql.end()
}

fixPreferencesColumns()
