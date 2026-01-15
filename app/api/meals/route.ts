import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const month = searchParams.get('month') // Format: YYYY-MM

    console.log(`[API /api/meals] 요청 - userId: ${userId}, month: ${month}`)

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    let meals
    if (month) {
      // Get meals for specific month
      const [year, monthNum] = month.split('-')
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0) // 마지막 날

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      console.log(`[API /api/meals] 날짜 범위: ${startDateStr} ~ ${endDateStr}`)

      meals = await sql`
        SELECT
          id, user_id, menu_name, calories, carbs, protein, fat, cost,
          meal_type, meal_date::text as meal_date, image_url, created_at
        FROM meal_records
        WHERE user_id = ${userId}
        AND meal_date >= ${startDateStr}::date
        AND meal_date <= ${endDateStr}::date
        ORDER BY meal_date DESC, created_at DESC
      `

      console.log(`[API /api/meals] ${month} 데이터 ${meals.length}개 조회됨`)
    } else {
      // Get all meals
      console.log(`[API /api/meals] 전체 데이터 조회`)
      meals = await sql`
        SELECT
          id, user_id, menu_name, calories, carbs, protein, fat, cost,
          meal_type, meal_date::text as meal_date, image_url, created_at
        FROM meal_records
        WHERE user_id = ${userId}
        ORDER BY meal_date DESC, created_at DESC
        LIMIT 100
      `
      console.log(`[API /api/meals] 전체 데이터 ${meals.length}개 조회됨`)
    }

    // 날짜 형식 확인을 위한 로그
    if (meals.length > 0) {
      console.log(`[API /api/meals] 첫 번째 데이터 샘플:`, {
        meal_date: meals[0].meal_date,
        menu_name: meals[0].menu_name,
      })
    }

    return NextResponse.json({
      success: true,
      data: meals,
    })

  } catch (error) {
    console.error('[API /api/meals] 오류:', error)
    return NextResponse.json(
      { error: '식단 기록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
