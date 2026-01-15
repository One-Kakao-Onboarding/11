import { config } from 'dotenv'
import path from 'path'
import postgres from 'postgres'

config({ path: path.join(process.cwd(), '.env.local') })

async function testPreferences() {
  const sql = postgres(process.env.DATABASE_URL!)

  try {
    // ss 사용자 찾기
    const users = await sql`
      SELECT id FROM app_users WHERE nickname = 'ss'
    `

    if (users.length === 0) {
      console.log('❌ ss 사용자를 찾을 수 없습니다.')
      await sql.end()
      return
    }

    const userId = users[0].id
    console.log('✅ ss 사용자 ID:', userId)

    // 기존 preferences 조회
    const prefs = await sql`
      SELECT * FROM menu_preferences WHERE user_id = ${userId}
    `

    console.log('\n📊 현재 Preferences:')
    console.log(prefs.length > 0 ? prefs[0] : '없음')

    // 테스트: 좋아하는 음식 추가
    const testCategories = ['한식', '일식', '중식']
    const testIngredients = ['고수', '파프리카']

    if (prefs.length > 0) {
      // 업데이트
      await sql`
        UPDATE menu_preferences
        SET
          favorite_categories = ${sql.array(testCategories)},
          disliked_ingredients = ${sql.array(testIngredients)},
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId}
      `
      console.log('\n✅ Preferences 업데이트 완료')
    } else {
      // 새로 생성
      await sql`
        INSERT INTO menu_preferences (
          user_id,
          favorite_categories,
          disliked_ingredients,
          preferred_mode,
          monthly_budget
        )
        VALUES (
          ${userId},
          ${sql.array(testCategories)},
          ${sql.array(testIngredients)},
          'budget',
          300000
        )
      `
      console.log('\n✅ Preferences 생성 완료')
    }

    // 다시 조회해서 확인
    const updated = await sql`
      SELECT * FROM menu_preferences WHERE user_id = ${userId}
    `

    console.log('\n📊 업데이트된 Preferences:')
    console.log(updated[0])
    console.log('\n좋아하는 음식:', updated[0].favorite_categories)
    console.log('기피 식재료:', updated[0].disliked_ingredients)

  } catch (error) {
    console.error('❌ 에러:', error)
  }

  await sql.end()
}

testPreferences()
