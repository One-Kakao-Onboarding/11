import { config } from 'dotenv'
import path from 'path'
import postgres from 'postgres'

config({ path: path.join(process.cwd(), '.env.local') })

async function checkData() {
  const sql = postgres(process.env.DATABASE_URL!)

  const meals = await sql`
    SELECT
      meal_date,
      meal_type,
      menu_name,
      calories,
      cost
    FROM meal_records mr
    JOIN app_users au ON mr.user_id = au.id
    WHERE au.nickname = 'ss'
    AND meal_date BETWEEN '2026-01-01' AND '2026-01-10'
    ORDER BY meal_date,
      CASE meal_type
        WHEN 'breakfast' THEN 1
        WHEN 'lunch' THEN 2
        WHEN 'dinner' THEN 3
      END
  `

  console.log('\n📊 ss 사용자의 1월 1-10일 식단 내역:\n')
  meals.forEach(meal => {
    const type = { breakfast: '🌅', lunch: '🍱', dinner: '🌙' }[meal.meal_type] || '🍴'
    console.log(`${meal.meal_date.toISOString().split('T')[0]} ${type} ${meal.menu_name} - ${meal.calories}kcal (${meal.cost.toLocaleString()}원)`)
  })

  console.log(`\n총 ${meals.length}개의 식사 기록이 있습니다.\n`)

  await sql.end()
}

checkData()
