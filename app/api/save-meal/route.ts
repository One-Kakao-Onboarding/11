import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getLocalDateString } from '@/lib/date-utils'

export async function POST(request: NextRequest) {
  try {
    const { userId, menuName, calories, carbs, protein, fat, cost, mealType, mealDate, imageUrl } = await request.json()

    if (!userId || !menuName) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // mealDate가 없으면 서버 로컬 타임존 기준으로 오늘 날짜 생성
    const finalMealDate = mealDate || getLocalDateString()

    console.log(`[API /api/save-meal] 저장 요청`)
    console.log(`[API /api/save-meal] - userId: ${userId}`)
    console.log(`[API /api/save-meal] - mealDate (받은 값): ${mealDate}`)
    console.log(`[API /api/save-meal] - finalMealDate (저장할 값): ${finalMealDate}`)
    console.log(`[API /api/save-meal] - menuName: ${menuName}`)
    console.log(`[API /api/save-meal] - 서버 현재 시간:`, new Date())
    console.log(`[API /api/save-meal] - 서버 현재 날짜 (getLocalDateString):`, getLocalDateString())

    const result = await sql`
      INSERT INTO meal_records (
        user_id, menu_name, calories, carbs, protein, fat, cost, meal_type, meal_date, image_url
      )
      VALUES (
        ${userId}, ${menuName}, ${calories || null}, ${carbs || null},
        ${protein || null}, ${fat || null}, ${cost || 0}, ${mealType || 'lunch'},
        ${finalMealDate}::date, ${imageUrl || null}
      )
      RETURNING *
    `

    console.log(`[API /api/save-meal] 저장 완료`)
    console.log(`[API /api/save-meal] - 저장된 id: ${result[0].id}`)
    console.log(`[API /api/save-meal] - 저장된 meal_date: ${result[0].meal_date}`)
    console.log(`[API /api/save-meal] - 저장된 meal_date 타입: ${typeof result[0].meal_date}`)

    return NextResponse.json({
      success: true,
      data: result[0],
    })

  } catch (error) {
    console.error('Save meal error:', error)
    return NextResponse.json(
      { error: '식단 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
