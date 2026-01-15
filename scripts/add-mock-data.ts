import { config } from 'dotenv'
import path from 'path'
import postgres from 'postgres'

// Load .env.local file first
config({ path: path.join(process.cwd(), '.env.local') })

async function addMockData() {
  try {
    console.log('Adding mock data...')

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined in .env.local')
    }

    const sql = postgres(process.env.DATABASE_URL)

    // Check if 'ss' user exists, if not create one
    const users = await sql`
      SELECT id FROM app_users WHERE nickname = 'ss'
    `

    let userId: number
    if (users.length === 0) {
      const newUser = await sql`
        INSERT INTO app_users (nickname)
        VALUES ('ss')
        RETURNING id
      `
      userId = newUser[0].id
      console.log('✅ Created user "ss" with id:', userId)
    } else {
      userId = users[0].id
      console.log('✅ Found existing user "ss" with id:', userId)
    }

    // Mock meal data for Jan 1-10, 2026
    const mockMeals = [
      // 1월 1일
      { date: '2026-01-01', meal_type: 'breakfast', menu_name: '떡국', calories: 450, carbs: 65, protein: 18, fat: 12, cost: 8000 },
      { date: '2026-01-01', meal_type: 'lunch', menu_name: '김치찌개 + 공기밥', calories: 580, carbs: 78, protein: 25, fat: 18, cost: 9000 },
      { date: '2026-01-01', meal_type: 'dinner', menu_name: '삼겹살 + 소주', calories: 850, carbs: 45, protein: 35, fat: 55, cost: 25000 },

      // 1월 2일
      { date: '2026-01-02', meal_type: 'breakfast', menu_name: '토스트 + 우유', calories: 320, carbs: 45, protein: 12, fat: 10, cost: 5000 },
      { date: '2026-01-02', meal_type: 'lunch', menu_name: '비빔밥', calories: 650, carbs: 85, protein: 22, fat: 20, cost: 10000 },
      { date: '2026-01-02', meal_type: 'dinner', menu_name: '치킨 + 맥주', calories: 1200, carbs: 80, protein: 45, fat: 70, cost: 23000 },

      // 1월 3일
      { date: '2026-01-03', meal_type: 'breakfast', menu_name: '계란후라이 + 밥', calories: 420, carbs: 58, protein: 20, fat: 15, cost: 3000 },
      { date: '2026-01-03', meal_type: 'lunch', menu_name: '된장찌개 + 고등어구이', calories: 520, carbs: 55, protein: 35, fat: 18, cost: 11000 },
      { date: '2026-01-03', meal_type: 'dinner', menu_name: '피자 (1판)', calories: 980, carbs: 110, protein: 38, fat: 42, cost: 18000 },

      // 1월 4일
      { date: '2026-01-04', meal_type: 'breakfast', menu_name: '시리얼 + 우유', calories: 280, carbs: 48, protein: 8, fat: 6, cost: 4000 },
      { date: '2026-01-04', meal_type: 'lunch', menu_name: '불고기 정식', calories: 720, carbs: 82, protein: 42, fat: 24, cost: 13000 },
      { date: '2026-01-04', meal_type: 'dinner', menu_name: '라면 + 김밥', calories: 680, carbs: 95, protein: 18, fat: 22, cost: 7000 },

      // 1월 5일
      { date: '2026-01-05', meal_type: 'breakfast', menu_name: '베이글 + 크림치즈', calories: 380, carbs: 52, protein: 14, fat: 14, cost: 6000 },
      { date: '2026-01-05', meal_type: 'lunch', menu_name: '순대국밥', calories: 620, carbs: 72, protein: 28, fat: 24, cost: 9000 },
      { date: '2026-01-05', meal_type: 'dinner', menu_name: '초밥 세트', calories: 580, carbs: 88, protein: 32, fat: 12, cost: 22000 },

      // 1월 6일
      { date: '2026-01-06', meal_type: 'breakfast', menu_name: '김치볶음밥', calories: 520, carbs: 72, protein: 18, fat: 18, cost: 7000 },
      { date: '2026-01-06', meal_type: 'lunch', menu_name: '제육볶음 + 공기밥', calories: 680, carbs: 78, protein: 35, fat: 28, cost: 10000 },
      { date: '2026-01-06', meal_type: 'dinner', menu_name: '햄버거 세트', calories: 920, carbs: 98, protein: 28, fat: 45, cost: 9500 },

      // 1월 7일
      { date: '2026-01-07', meal_type: 'breakfast', menu_name: '샌드위치 + 커피', calories: 420, carbs: 55, protein: 16, fat: 16, cost: 8000 },
      { date: '2026-01-07', meal_type: 'lunch', menu_name: '칼국수', calories: 480, carbs: 68, protein: 18, fat: 14, cost: 8000 },
      { date: '2026-01-07', meal_type: 'dinner', menu_name: '양념치킨', calories: 1050, carbs: 85, protein: 48, fat: 58, cost: 20000 },

      // 1월 8일
      { date: '2026-01-08', meal_type: 'breakfast', menu_name: '죽', calories: 320, carbs: 52, protein: 12, fat: 8, cost: 6000 },
      { date: '2026-01-08', meal_type: 'lunch', menu_name: '파스타', calories: 720, carbs: 92, protein: 22, fat: 28, cost: 14000 },
      { date: '2026-01-08', meal_type: 'dinner', menu_name: '족발 + 막국수', calories: 880, carbs: 78, protein: 52, fat: 42, cost: 28000 },

      // 1월 9일
      { date: '2026-01-09', meal_type: 'breakfast', menu_name: '프렌치토스트', calories: 480, carbs: 62, protein: 14, fat: 20, cost: 9000 },
      { date: '2026-01-09', meal_type: 'lunch', menu_name: '돈까스', calories: 820, carbs: 88, protein: 32, fat: 38, cost: 11000 },
      { date: '2026-01-09', meal_type: 'dinner', menu_name: '삼계탕', calories: 680, carbs: 42, protein: 58, fat: 32, cost: 16000 },

      // 1월 10일
      { date: '2026-01-10', meal_type: 'breakfast', menu_name: '에그베네딕트', calories: 520, carbs: 42, protein: 24, fat: 28, cost: 13000 },
      { date: '2026-01-10', meal_type: 'lunch', menu_name: '짬뽕', calories: 720, carbs: 95, protein: 28, fat: 24, cost: 10000 },
      { date: '2026-01-10', meal_type: 'dinner', menu_name: '스테이크', calories: 780, carbs: 45, protein: 55, fat: 42, cost: 35000 },
    ]

    // Insert all mock meals
    for (const meal of mockMeals) {
      await sql`
        INSERT INTO meal_records (
          user_id,
          menu_name,
          calories,
          carbs,
          protein,
          fat,
          cost,
          meal_type,
          meal_date
        )
        VALUES (
          ${userId},
          ${meal.menu_name},
          ${meal.calories},
          ${meal.carbs},
          ${meal.protein},
          ${meal.fat},
          ${meal.cost},
          ${meal.meal_type},
          ${meal.date}
        )
      `
    }

    console.log(`✅ Added ${mockMeals.length} mock meals for user "ss" (Jan 1-10, 2026)`)

    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error adding mock data:', error)
    process.exit(1)
  }
}

addMockData()
