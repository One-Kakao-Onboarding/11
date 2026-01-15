import { config } from 'dotenv'
import path from 'path'
import postgres from 'postgres'

// Load .env.local file first
config({ path: path.join(process.cwd(), '.env.local') })

const menuData = [
  { name: '닭가슴살 샐러드', calories: 320, protein: 35, carbs: 15, fat: 12, cost: 9900 },
  { name: '제육볶음 정식', calories: 650, protein: 28, carbs: 75, fat: 25, cost: 8500 },
  { name: '연어 포케볼', calories: 420, protein: 32, carbs: 45, fat: 15, cost: 13500 },
  { name: '마라탕', calories: 580, protein: 22, carbs: 55, fat: 30, cost: 11000 },
  { name: '치킨 버거 세트', calories: 850, protein: 35, carbs: 85, fat: 40, cost: 7500 },
  { name: '김치찌개', calories: 380, protein: 18, carbs: 35, fat: 18, cost: 7000 },
  { name: '규동', calories: 550, protein: 25, carbs: 65, fat: 20, cost: 8000 },
  { name: '그릭 요거트 볼', calories: 280, protein: 15, carbs: 35, fat: 8, cost: 6500 },
]

// 인기 메뉴 가중치 (높을수록 더 많이 선택됨)
const popularityWeights: Record<string, number> = {
  '김치찌개': 15,           // 가장 인기
  '제육볶음 정식': 12,      // 두 번째
  '치킨 버거 세트': 10,     // 세 번째
  '닭가슴살 샐러드': 8,
  '규동': 7,
  '마라탕': 6,
  '연어 포케볼': 4,
  '그릭 요거트 볼': 3,
}

const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack']

// 날짜 생성 헬퍼 (최근 30일)
function getRandomDate(): string {
  const today = new Date()
  const daysAgo = Math.floor(Math.random() * 30)
  const date = new Date(today)
  date.setDate(date.getDate() - daysAgo)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// 가중치에 따라 랜덤 메뉴 선택
function getWeightedRandomMenu(): typeof menuData[0] {
  const totalWeight = Object.values(popularityWeights).reduce((sum, w) => sum + w, 0)
  let random = Math.random() * totalWeight

  for (const menu of menuData) {
    const weight = popularityWeights[menu.name] || 1
    random -= weight
    if (random <= 0) {
      return menu
    }
  }

  return menuData[0] // fallback
}

async function seedPopularMenus() {
  try {
    console.log('Starting to seed popular menu data...')

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined in .env.local')
    }

    const sql = postgres(process.env.DATABASE_URL)

    // 먼저 기존 임시 사용자들의 데이터 삭제 (user_id 100번대)
    console.log('Cleaning up existing seed data...')
    await sql`
      DELETE FROM liked_meals
      WHERE user_id >= 100 AND user_id < 200
    `
    await sql`
      DELETE FROM meal_records
      WHERE user_id >= 100 AND user_id < 200
    `
    await sql`
      DELETE FROM menu_preferences
      WHERE user_id >= 100 AND user_id < 200
    `
    await sql`
      DELETE FROM recommendation_cache
      WHERE user_id >= 100 AND user_id < 200
    `
    await sql`
      DELETE FROM app_users
      WHERE id >= 100 AND id < 200
    `

    // 임시 사용자 100명 생성 (id 100-199)
    console.log('Creating temporary users...')
    for (let i = 100; i < 200; i++) {
      await sql`
        INSERT INTO app_users (id, nickname)
        VALUES (${i}, ${`테스트유저${i}`})
        ON CONFLICT (id) DO NOTHING
      `
    }

    // 임시 사용자 100명 생성 (user_id 100-199)
    const totalRecords = 500 // 총 500개의 식사 기록 생성
    const records = []

    console.log(`Generating ${totalRecords} meal records...`)

    for (let i = 0; i < totalRecords; i++) {
      const userId = 100 + Math.floor(Math.random() * 100) // 100-199 사이 랜덤 사용자
      const menu = getWeightedRandomMenu()
      const mealType = mealTypes[Math.floor(Math.random() * mealTypes.length)]
      const mealDate = getRandomDate()

      records.push({
        userId,
        menuName: menu.name,
        calories: menu.calories,
        protein: menu.protein,
        carbs: menu.carbs,
        fat: menu.fat,
        cost: menu.cost,
        mealType,
        mealDate,
      })
    }

    // 배치 삽입
    console.log('Inserting records into database...')

    for (const record of records) {
      await sql`
        INSERT INTO meal_records (
          user_id,
          menu_name,
          calories,
          protein,
          carbs,
          fat,
          cost,
          meal_type,
          meal_date
        ) VALUES (
          ${record.userId},
          ${record.menuName},
          ${record.calories},
          ${record.protein},
          ${record.carbs},
          ${record.fat},
          ${record.cost},
          ${record.mealType},
          ${record.mealDate}
        )
      `
    }

    // 결과 확인
    const topMenus = await sql`
      SELECT menu_name, COUNT(*) as count
      FROM meal_records
      GROUP BY menu_name
      ORDER BY count DESC
      LIMIT 5
    `

    console.log('\n✅ Seed data inserted successfully!')
    console.log('\n📊 Top 5 popular menus:')
    topMenus.forEach((menu, index) => {
      console.log(`${index + 1}. ${menu.menu_name}: ${menu.count}회`)
    })

    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding data:', error)
    process.exit(1)
  }
}

seedPopularMenus()
